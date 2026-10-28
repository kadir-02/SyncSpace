// import { v2 as cloudinary } from "cloudinary";
import cloudinary from "../config/cloudinary.js";
import { File } from "../models/file.model.js";
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
        resource_type: uploadResult.resource_type as "image" | "video" | "raw",
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

  const skip = (page - 1) * limit;

  const [files, total] = await Promise.all([
    File.find({ workspace: workspaceId })
      .populate("uploadedBy", "name email avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    File.countDocuments({ workspace: workspaceId }),
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

  const resourceType = file.mimeType.startsWith("image/") ? "image" : "raw";

  await cloudinary.uploader.destroy(file.publicId, {
    resource_type: resourceType,
  });

  await file.deleteOne();

  return { fileId };
};
