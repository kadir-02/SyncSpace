import { randomBytes } from "crypto";
import { Types } from "mongoose";
import { Workspace } from "../models/workspace.model.js";
import { WorkspaceMember } from "../models/workspace-member.model.js";
import { Team } from "../models/team.model.js";
import { TeamMember } from "../models/team-member.model.js";
import { Channel } from "../models/channel.model.js";
import { ChannelMember } from "../models/channel-member.model.js";
import { User } from "../models/user.model.js";
import { AppError } from "../utils/app-error.js";
import {
  AddWorkspaceMemberInput,
  UpdateWorkspaceInput,
  CreateWorkspaceInput,
  TransferWorkspaceOwnershipInput,
  UpdateWorkspaceMemberRoleInput,
} from "../validations/workspace.validation.js";
import { generateSlug } from "../utils/slug-generator.js";
import { deleteTeamsCascade } from "./team.service.js";
import { deleteWorkspaceFiles } from "./file.service.js";
import { createNotification } from "./notification.service.js";
import { getIO } from "../config/socket.js";
import {
  addUserToRooms,
  closeWorkspaceRoom,
  removeUserFromRooms,
} from "../utils/socket-rooms.js";

/**
 * Removes every trace of a user's access inside a workspace: team memberships,
 * private-channel memberships and live socket rooms. Without this, a removed
 * user would keep reading channels because those checks look at team membership.
 */
const revokeWorkspaceAccess = async (workspaceId: string, userId: string) => {
  const teamIds = (await Team.find({ workspace: workspaceId }).distinct(
    "_id",
  )) as Types.ObjectId[];

  const channelIds = (await Channel.find({
    team: { $in: teamIds },
  }).distinct("_id")) as Types.ObjectId[];

  await Promise.all([
    TeamMember.deleteMany({ user: userId, team: { $in: teamIds } }),
    ChannelMember.deleteMany({ user: userId, channel: { $in: channelIds } }),
  ]);

  removeUserFromRooms(userId, [
    `workspace:${workspaceId}`,
    ...channelIds.map((id) => `channel:${id.toString()}`),
  ]);
};

export const createWorkspace = async (
  userId: string,
  data: CreateWorkspaceInput,
) => {
  // Workspace names don't have to be globally unique; only the slug does.
  const baseSlug = generateSlug(data.name) || "workspace";
  let slug = baseSlug;

  while (await Workspace.exists({ slug })) {
    slug = `${baseSlug}-${randomBytes(2).toString("hex")}`;
  }

  const workspace = await Workspace.create({
    name: data.name,
    slug,
    owner: userId,
  });

  await WorkspaceMember.create({
    workspace: workspace._id,
    user: userId,
    role: "owner",
  });

  return {
    id: workspace._id,
    name: workspace.name,
    slug: workspace.slug,
    owner: workspace.owner,
  };
};

export const getUserWorkspaces = async (userId: string) => {
  const memberships = await WorkspaceMember.find({
    user: userId,
  })
    .populate("workspace")
    .sort({ createdAt: -1 });

  return memberships.map((membership) => {
    const workspace = membership.workspace as any;

    return {
      id: workspace._id,
      name: workspace.name,
      slug: workspace.slug,
      role: membership.role,
      createdAt: workspace.createdAt,
    };
  });
};

export const getWorkspaceById = async (workspaceId: string, userId: string) => {
  const membership = await WorkspaceMember.findOne({
    workspace: workspaceId,
    user: userId,
  }).populate("workspace");

  if (!membership) {
    throw new AppError("You are not a member of this workspace", 403);
  }

  const workspace = membership.workspace as any;

  return {
    id: workspace._id,
    name: workspace.name,
    slug: workspace.slug,
    owner: workspace.owner,
    role: membership.role,
    createdAt: workspace.createdAt,
    updatedAt: workspace.updatedAt,
  };
};

export const updateWorkspace = async (
  workspaceId: string,
  userId: string,
  data: UpdateWorkspaceInput,
) => {
  const membership = await WorkspaceMember.findOne({
    workspace: workspaceId,
    user: userId,
  });

  if (!membership) {
    throw new AppError("You are not a member of this workspace", 403);
  }

  if (membership.role !== "owner" && membership.role !== "admin") {
    throw new AppError("Only workspace owners or admins can rename it", 403);
  }

  const workspace = await Workspace.findById(workspaceId);

  if (!workspace) {
    throw new AppError("Workspace not found", 404);
  }

  // The slug is left alone so existing links keep working.
  workspace.name = data.name;
  await workspace.save();

  try {
    getIO()
      .to(`workspace:${workspaceId}`)
      .emit("workspace:updated", { id: workspaceId, name: workspace.name });
  } catch {
    // Socket server not initialised.
  }

  return {
    id: workspace._id,
    name: workspace.name,
    slug: workspace.slug,
  };
};

export const addWorkspaceMember = async (
  workspaceId: string,
  currentUserId: string,
  data: AddWorkspaceMemberInput,
) => {
  const currentMembership = await WorkspaceMember.findOne({
    workspace: workspaceId,
    user: currentUserId,
  });

  if (!currentMembership) {
    throw new AppError("You are not a member of this workspace", 403);
  }

  if (
    currentMembership.role !== "owner" &&
    currentMembership.role !== "admin"
  ) {
    throw new AppError("You do not have permission to add members", 403);
  }

  // Members can be added by ID or by email.
  const user = data.userId
    ? await User.findById(data.userId)
    : await User.findOne({ email: data.email });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  const existingMember = await WorkspaceMember.findOne({
    workspace: workspaceId,
    user: user._id,
  });

  if (existingMember) {
    throw new AppError("User is already a workspace member", 409);
  }

  const member = await WorkspaceMember.create({
    workspace: workspaceId,
    user: user._id,
    role: data.role,
  });

  // Let the new member's open sessions receive workspace presence right away.
  addUserToRooms(user._id.toString(), [`workspace:${workspaceId}`]);

  try {
    const workspace = await Workspace.findById(workspaceId).select("name");

    await createNotification({
      recipient: user._id.toString(),
      sender: currentUserId,
      type: "workspace_invite",
      title: "Added to a workspace",
      message: `You were added to ${workspace?.name ?? "a workspace"}`,
      resourceId: workspaceId,
      resourceType: "Workspace",
    });
  } catch (error) {
    console.error("Workspace invite notification failed:", error);
  }

  return {
    id: member._id,
    user: user._id,
    userId: user._id,
    name: user.name,
    email: user.email,
    role: member.role,
  };
};

export const getWorkspaceMembers = async (
  workspaceId: string,
  userId: string,
) => {
  const currentMembership = await WorkspaceMember.findOne({
    workspace: workspaceId,
    user: userId,
  });

  if (!currentMembership) {
    throw new AppError("You are not a member of this workspace", 403);
  }

  const members = await WorkspaceMember.find({
    workspace: workspaceId,
  })
    .populate("user", "name email avatar role")
    .sort({ createdAt: 1 });

  return members.map((member) => {
    const user = member.user as any;

    return {
      id: member._id,
      userId: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      platformRole: user.role,
      workspaceRole: member.role,
      joinedAt: member.joinedAt,
    };
  });
};

export const removeWorkspaceMember = async (
  workspaceId: string,
  currentUserId: string,
  memberUserId: string,
) => {
  const currentMembership = await WorkspaceMember.findOne({
    workspace: workspaceId,
    user: currentUserId,
  });

  if (!currentMembership) {
    throw new AppError("You are not a member of this workspace", 403);
  }

  if (
    currentMembership.role !== "owner" &&
    currentMembership.role !== "admin"
  ) {
    throw new AppError("You do not have permission to remove members", 403);
  }

  if (currentUserId === memberUserId) {
    throw new AppError("You cannot remove yourself", 400);
  }

  const member = await WorkspaceMember.findOne({
    workspace: workspaceId,
    user: memberUserId,
  });

  if (!member) {
    throw new AppError("User is not a member of this workspace", 404);
  }

  if (member.role === "owner") {
    throw new AppError("Workspace owner cannot be removed", 403);
  }

  if (currentMembership.role === "admin" && member.role === "admin") {
    throw new AppError("Admin cannot remove another admin", 403);
  }

  await WorkspaceMember.deleteOne({
    _id: member._id,
  });

  await revokeWorkspaceAccess(workspaceId, memberUserId);

  return null;
};

export const updateWorkspaceMemberRole = async (
  workspaceId: string,
  currentUserId: string,
  memberUserId: string,
  data: UpdateWorkspaceMemberRoleInput,
) => {
  const currentMembership = await WorkspaceMember.findOne({
    workspace: workspaceId,
    user: currentUserId,
  });

  if (!currentMembership) {
    throw new AppError("You are not a member of this workspace", 403);
  }

  if (currentMembership.role !== "owner") {
    throw new AppError("Only the workspace owner can change member roles", 403);
  }

  const member = await WorkspaceMember.findOne({
    workspace: workspaceId,
    user: memberUserId,
  });

  if (!member) {
    throw new AppError("User is not a member of this workspace", 404);
  }

  if (member.role === "owner") {
    throw new AppError("Workspace owner role cannot be changed", 403);
  }

  member.role = data.role;

  await member.save();

  return {
    id: member._id,
    userId: member.user,
    role: member.role,
  };
};

export const leaveWorkspace = async (workspaceId: string, userId: string) => {
  const membership = await WorkspaceMember.findOne({
    workspace: workspaceId,
    user: userId,
  });

  if (!membership) {
    throw new AppError("You are not a member of this workspace", 403);
  }

  if (membership.role === "owner") {
    throw new AppError("Workspace owner cannot leave the workspace", 403);
  }

  await WorkspaceMember.deleteOne({
    _id: membership._id,
  });

  await revokeWorkspaceAccess(workspaceId, userId);

  return null;
};

export const deleteWorkspace = async (workspaceId: string, userId: string) => {
  const workspace = await Workspace.findById(workspaceId);

  if (!workspace) {
    throw new AppError("Workspace not found", 404);
  }

  if (workspace.owner.toString() !== userId) {
    throw new AppError(
      "Only the workspace owner can delete the workspace",
      403,
    );
  }

  const teamIds = (await Team.find({ workspace: workspaceId }).distinct(
    "_id",
  )) as Types.ObjectId[];

  // Teams -> channels -> messages / reads / notifications / channel files.
  await deleteTeamsCascade(teamIds);

  // Remaining workspace-level files (also removed from Cloudinary).
  await deleteWorkspaceFiles(workspaceId);

  await WorkspaceMember.deleteMany({
    workspace: workspaceId,
  });

  await Workspace.deleteOne({
    _id: workspaceId,
  });

  closeWorkspaceRoom(workspaceId);

  return null;
};

export const transferWorkspaceOwnership = async (
  workspaceId: string,
  currentUserId: string,
  data: TransferWorkspaceOwnershipInput,
) => {
  const workspace = await Workspace.findById(workspaceId);

  if (!workspace) {
    throw new AppError("Workspace not found", 404);
  }

  if (workspace.owner.toString() !== currentUserId) {
    throw new AppError("Only the workspace owner can transfer ownership", 403);
  }

  if (currentUserId === data.userId) {
    throw new AppError("You are already the workspace owner", 400);
  }

  const newOwner = await WorkspaceMember.findOne({
    workspace: workspaceId,
    user: data.userId,
  });

  if (!newOwner) {
    throw new AppError("User is not a member of this workspace", 404);
  }

  const currentOwner = await WorkspaceMember.findOne({
    workspace: workspaceId,
    user: currentUserId,
  });

  if (!currentOwner) {
    throw new AppError("Workspace owner membership not found", 404);
  }

  workspace.owner = newOwner.user;
  await workspace.save();

  newOwner.role = "owner";
  await newOwner.save();

  currentOwner.role = "admin";
  await currentOwner.save();

  return {
    workspaceId: workspace._id,
    newOwnerId: newOwner.user,
  };
};
