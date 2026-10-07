import { Workspace } from "../models/workspace.model.js";
import { WorkspaceMember } from "../models/workspace-member.model.js";
import { AppError } from "../utils/app-error.js";
import {
  AddWorkspaceMemberInput,
  CreateWorkspaceInput,
  TransferWorkspaceOwnershipInput,
  UpdateWorkspaceMemberRoleInput,
} from "../validations/workspace.validation.js";
import { generateSlug } from "../utils/slug-generator.js";
import { User } from "../models/user.model.js";

export const createWorkspace = async (
  userId: string,
  data: CreateWorkspaceInput,
) => {
  const slug = generateSlug(data.name);

  const existingWorkspace = await Workspace.findOne({
    slug,
  });

  if (existingWorkspace) {
    throw new AppError("Workspace with this name already exists", 409);
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

  const user = await User.findById(data.userId);

  if (!user) {
    throw new AppError("User not found", 404);
  }

  const existingMember = await WorkspaceMember.findOne({
    workspace: workspaceId,
    user: data.userId,
  });

  if (existingMember) {
    throw new AppError("User is already a workspace member", 409);
  }

  const member = await WorkspaceMember.create({
    workspace: workspaceId,
    user: data.userId,
    role: data.role,
  });

  return {
    id: member._id,
    user: user._id,
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

  await WorkspaceMember.deleteMany({
    workspace: workspaceId,
  });

  await Workspace.deleteOne({
    _id: workspaceId,
  });

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
