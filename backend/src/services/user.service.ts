import bcrypt from "bcryptjs";
import cloudinary from "../config/cloudinary.js";
import { getIO } from "../config/socket.js";
import { User, type IUser } from "../models/user.model.js";
import { WorkspaceMember } from "../models/workspace-member.model.js";
import { AppError } from "../utils/app-error.js";
import type {
  ChangePasswordInput,
  UpdateProfileInput,
} from "../validations/user.validation.js";

const serializeUser = (user: IUser) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  avatar: user.avatar,
  role: user.role,
});

export const getCurrentUser = async (userId: string) => {
  const user = await User.findById(userId).select("-passwordHash");

  if (!user) {
    throw new AppError("User not found", 404);
  }

  return serializeUser(user);
};

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Find users by name or email so they can be added to a workspace or messaged.
 * Requires at least 3 characters and returns at most 10 results.
 * When workspaceId is supplied, each result says whether the user is already a member.
 */
export const searchUsers = async (
  currentUserId: string,
  query: string,
  workspaceId?: string,
) => {
  if (workspaceId) {
    const membership = await WorkspaceMember.findOne({
      workspace: workspaceId,
      user: currentUserId,
    });

    if (!membership) {
      throw new AppError("You are not a member of this workspace", 403);
    }
  }

  const pattern = new RegExp(escapeRegex(query), "i");

  const users = await User.find({
    _id: { $ne: currentUserId },
    $or: [{ name: pattern }, { email: pattern }],
  })
    .select("name email avatar")
    .sort({ name: 1 })
    .limit(10);

  const memberIds = new Set<string>();

  if (workspaceId && users.length > 0) {
    const members = await WorkspaceMember.find({
      workspace: workspaceId,
      user: { $in: users.map((user) => user._id) },
    }).select("user");

    members.forEach((member) => memberIds.add(member.user.toString()));
  }

  return users.map((user) => ({
    id: user._id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    ...(workspaceId ? { alreadyMember: memberIds.has(user._id.toString()) } : {}),
  }));
};

// Tells everyone who shares a workspace with the user (and the user's other
// tabs) that the profile changed, so names and avatars update live.
const broadcastProfile = async (user: IUser) => {
  try {
    const memberships = await WorkspaceMember.find({ user: user._id }).select(
      "workspace",
    );

    const rooms = [
      `user:${user._id.toString()}`,
      ...memberships.map((m) => `workspace:${m.workspace.toString()}`),
    ];

    getIO()
      .to(rooms)
      .emit("user:updated", {
        id: user._id.toString(),
        name: user.name,
        avatar: user.avatar ?? null,
      });
  } catch {
    // Socket server not initialised (scripts/tests): the change is still saved.
  }
};

export const updateProfile = async (
  userId: string,
  data: UpdateProfileInput,
) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new AppError("User not found", 404);
  }

  user.name = data.name;
  await user.save();

  await broadcastProfile(user);

  return serializeUser(user);
};

type CloudinaryUpload = { public_id: string; secure_url: string };

const destroyAvatar = async (publicId?: string) => {
  if (!publicId) return;

  await cloudinary.uploader
    .destroy(publicId, { resource_type: "image" })
    .catch(() => undefined);
};

export const uploadAvatar = async (
  userId: string,
  file: Express.Multer.File,
) => {
  const user = await User.findById(userId).select("+avatarPublicId");

  if (!user) {
    throw new AppError("User not found", 404);
  }

  const uploaded = await new Promise<CloudinaryUpload>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "syncspace/avatars",
        resource_type: "image",
        // Square 256px crop centred on the subject keeps avatars small and consistent.
        transformation: [
          { width: 256, height: 256, crop: "fill", gravity: "auto" },
        ],
      },
      (error, result) => {
        if (error || !result) {
          reject(new AppError("Avatar upload failed", 502));
          return;
        }

        resolve(result);
      },
    );

    stream.end(file.buffer);
  });

  const previousPublicId = user.avatarPublicId;

  user.avatar = uploaded.secure_url;
  user.avatarPublicId = uploaded.public_id;

  try {
    await user.save();
  } catch (error) {
    await destroyAvatar(uploaded.public_id);
    throw error;
  }

  // Replace, don't accumulate: remove the previous picture from Cloudinary.
  await destroyAvatar(previousPublicId);
  await broadcastProfile(user);

  return serializeUser(user);
};

export const removeAvatar = async (userId: string) => {
  const user = await User.findById(userId).select("+avatarPublicId");

  if (!user) {
    throw new AppError("User not found", 404);
  }

  const previousPublicId = user.avatarPublicId;

  user.avatar = undefined;
  user.avatarPublicId = undefined;
  await user.save();

  await destroyAvatar(previousPublicId);
  await broadcastProfile(user);

  return serializeUser(user);
};

export const changePassword = async (
  userId: string,
  data: ChangePasswordInput,
) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new AppError("User not found", 404);
  }

  const matches = await bcrypt.compare(data.currentPassword, user.passwordHash);

  if (!matches) {
    throw new AppError("Current password is incorrect", 400);
  }

  user.passwordHash = await bcrypt.hash(data.newPassword, 12);
  await user.save();

  return null;
};
