import { Types } from "mongoose";
import cloudinary from "../config/cloudinary.js";
import { File, type IFile } from "../models/file.model.js";
import { WorkspaceMember } from "../models/workspace-member.model.js";
import { Channel } from "../models/channel.model.js";
import { ChannelMember } from "../models/channel-member.model.js";
import { TeamMember } from "../models/team-member.model.js";
import { AppError } from "../utils/app-error.js";
import { Team } from "../models/team.model.js";

interface UploadFileParams {
  file: Express.Multer.File;
  userId: string;
  workspaceId: string;
  channelId?: string;
}

type CloudinaryResourceType = "image" | "video" | "raw";

const checkWorkspaceAccess = async (workspaceId: string, userId: string) => {
  const membership = await WorkspaceMember.findOne({
    workspace: workspaceId,
    user: userId,
  });

  if (!membership) {
    throw new AppError("You are not a member of this workspace", 403);
  }
};

const checkChannelAccess = async (
  channelId: string,
  workspaceId: string,
  userId: string,
) => {
  const channel = await Channel.findById(channelId);

  if (!channel) {
    throw new AppError("Channel not found", 404);
  }

  const team = await Team.findById(channel.team);

  if (!team) {
    throw new AppError("Team not found", 404);
  }

  if (team.workspace.toString() !== workspaceId) {
    throw new AppError("Channel does not belong to this workspace", 400);
  }

  const teamMembership = await TeamMember.findOne({
    team: channel.team,
    user: userId,
  });

  if (!teamMembership) {
    throw new AppError("You are not a member of this channel's team", 403);
  }

  if (channel.type === "private") {
    const channelMembership = await ChannelMember.findOne({
      channel: channel._id,
      user: userId,
    });

    if (!channelMembership) {
      throw new AppError("You are not a member of this private channel", 403);
    }
  }
};

// Older records have no stored resource type, so fall back to what Cloudinary
// would have chosen for "auto" uploads (PDFs are stored as images).
const getResourceType = (
  file: Pick<IFile, "resourceType" | "mimeType">,
): CloudinaryResourceType => {
  if (file.resourceType) return file.resourceType;

  return file.mimeType.startsWith("image/") || file.mimeType === "application/pdf"
    ? "image"
    : "raw";
};

const destroyFromCloudinary = async (
  file: Pick<IFile, "publicId" | "resourceType" | "mimeType">,
) => {
  await cloudinary.uploader.destroy(file.publicId, {
    resource_type: getResourceType(file),
  });
};

export const uploadFile = async ({
  file,
  userId,
  workspaceId,
  channelId,
}: UploadFileParams) => {
  await checkWorkspaceAccess(workspaceId, userId);

  if (channelId) {
    await checkChannelAccess(channelId, workspaceId, userId);
  }

  const uploadResult = await new Promise<{
    public_id: string;
    secure_url: string;
    bytes: number;
    resource_type: string;
  }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "syncspace",
        resource_type: "auto",
        allowed_formats: [
          "jpg",
          "jpeg",
          "png",
          "webp",
          "gif",
          "pdf",
          "txt",
          "zip",
          "docx",
          "xlsx",
          "pptx",
        ],
      },
      (error, result) => {
        if (error || !result) {
          reject(new AppError("File upload failed", 502));
          return;
        }

        resolve(result);
      },
    );

    stream.end(file.buffer);
  });

  try {
    const savedFile = await File.create({
      originalName: file.originalname,
      publicId: uploadResult.public_id,
      url: uploadResult.secure_url,
      mimeType: file.mimetype,
      resourceType: uploadResult.resource_type as CloudinaryResourceType,
      size: uploadResult.bytes,
      uploadedBy: userId,
      workspace: workspaceId,
      ...(channelId ? { channel: channelId } : {}),
    });

    return savedFile;
  } catch {
    // Avoid leaving an orphaned Cloudinary upload if metadata saving fails.
    await cloudinary.uploader
      .destroy(uploadResult.public_id, {
        resource_type: uploadResult.resource_type as CloudinaryResourceType,
      })
      .catch(() => undefined);

    throw new AppError("Could not save file metadata", 500);
  }
};

export const getWorkspaceFiles = async (
  workspaceId: string,
  userId: string,
  page = 1,
  limit = 20,
) => {
  await checkWorkspaceAccess(workspaceId, userId);

  // Files shared in a channel are only listed for people who can access that channel.
  const teamIds = await TeamMember.find({ user: userId }).distinct("team");

  const channels = await Channel.find({ team: { $in: teamIds } }).select(
    "_id type",
  );

  const privateChannelIds = new Set(
    (await ChannelMember.find({ user: userId }).distinct("channel")).map(
      (id) => id.toString(),
    ),
  );

  const accessibleChannelIds = channels
    .filter(
      (channel) =>
        channel.type !== "private" ||
        privateChannelIds.has(channel._id.toString()),
    )
    .map((channel) => channel._id);

  const filter = {
    workspace: workspaceId,
    $or: [
      { channel: null },
      { uploadedBy: userId },
      { channel: { $in: accessibleChannelIds } },
    ],
  };

  const skip = (page - 1) * limit;

  const [files, total] = await Promise.all([
    File.find(filter)
      .populate("uploadedBy", "name email avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    File.countDocuments(filter),
  ]);

  return {
    files,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const deleteFile = async (fileId: string, userId: string) => {
  const file = await File.findById(fileId);

  if (!file) {
    throw new AppError("File not found", 404);
  }

  await checkWorkspaceAccess(file.workspace.toString(), userId);

  if (file.uploadedBy.toString() !== userId) {
    throw new AppError("You can only delete files you uploaded", 403);
  }

  await destroyFromCloudinary(file);
  await file.deleteOne();

  return { fileId };
};

const deleteFilesWhere = async (filter: Record<string, unknown>) => {
  const files = await File.find(filter);

  await Promise.all(
    files.map((file) => destroyFromCloudinary(file).catch(() => undefined)),
  );

  await File.deleteMany({ _id: { $in: files.map((file) => file._id) } });
};

// Used when channels / workspaces are deleted so uploads aren't orphaned.
export const deleteFilesByChannels = async (channelIds: Types.ObjectId[]) => {
  if (channelIds.length === 0) return;

  await deleteFilesWhere({ channel: { $in: channelIds } });
};

export const deleteWorkspaceFiles = async (workspaceId: string) => {
  await deleteFilesWhere({ workspace: workspaceId });
};
