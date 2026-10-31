import { User } from "../models/user.model.js";
import { WorkspaceMember } from "../models/workspace-member.model.js";
import { AppError } from "../utils/app-error.js";

export const getCurrentUser = async (userId: string) => {
  const user = await User.findById(userId).select("-passwordHash");

  if (!user) {
    throw new AppError("User not found", 404);
  }

  return {
    id: user._id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    role: user.role,
  };
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
