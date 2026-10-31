import { Types } from "mongoose";
import { Team } from "../models/team.model.js";
import { TeamMember } from "../models/team-member.model.js";
import { WorkspaceMember } from "../models/workspace-member.model.js";
import { Channel } from "../models/channel.model.js";
import { AppError } from "../utils/app-error.js";
import {
  CreateTeamInput,
  AddTeamMemberInput,
  UpdateTeamMemberRoleInput,
  UpdateTeamInput,
} from "../validations/team.validation.js";
import {
  deleteChannelsCascade,
  removeUserFromTeamChannels,
} from "./channel.service.js";
import { createNotification } from "./notification.service.js";

const isManagerRole = (role?: string | null) =>
  role === "owner" || role === "admin";

const getWorkspaceMembershipOrThrow = async (
  workspaceId: string | Types.ObjectId,
  userId: string,
) => {
  const membership = await WorkspaceMember.findOne({
    workspace: workspaceId,
    user: userId,
  });

  if (!membership) {
    throw new AppError("You are not a member of this workspace", 403);
  }

  return membership;
};

const getTeamOrThrow = async (teamId: string) => {
  const team = await Team.findById(teamId);

  if (!team) {
    throw new AppError("Team not found", 404);
  }

  return team;
};

const serializeCreator = (creator: any) =>
  creator
    ? {
        id: creator._id,
        name: creator.name,
        email: creator.email,
        avatar: creator.avatar,
      }
    : null;

/**
 * Deletes teams with their channels (and everything in them) and memberships.
 */
export const deleteTeamsCascade = async (teamIds: Types.ObjectId[]) => {
  if (teamIds.length === 0) return;

  const channelIds = (await Channel.find({
    team: { $in: teamIds },
  }).distinct("_id")) as Types.ObjectId[];

  await deleteChannelsCascade(channelIds);

  await TeamMember.deleteMany({ team: { $in: teamIds } });
  await Team.deleteMany({ _id: { $in: teamIds } });
};

export const createTeam = async (
  workspaceId: string,
  userId: string,
  data: CreateTeamInput,
) => {
  const workspaceMembership = await getWorkspaceMembershipOrThrow(
    workspaceId,
    userId,
  );

  if (!isManagerRole(workspaceMembership.role)) {
    throw new AppError("Only workspace owner or admin can create a team", 403);
  }

  const existingTeam = await Team.findOne({
    workspace: workspaceId,
    name: data.name,
  });

  if (existingTeam) {
    throw new AppError("A team with this name already exists", 409);
  }

  const team = await Team.create({
    name: data.name,
    description: data.description,
    workspace: workspaceId,
    createdBy: userId,
  });

  await TeamMember.create({
    team: team._id,
    user: userId,
    role: "lead",
  });

  return {
    id: team._id,
    name: team.name,
    description: team.description,
    workspace: team.workspace,
    createdBy: team.createdBy,
  };
};

export const getWorkspaceTeams = async (
  workspaceId: string,
  userId: string,
) => {
  await getWorkspaceMembershipOrThrow(workspaceId, userId);

  const teams = await Team.find({
    workspace: workspaceId,
  })
    .populate("createdBy", "name email avatar")
    .sort({ createdAt: -1 });

  // Tell the client which teams the caller belongs to.
  const memberships = await TeamMember.find({
    user: userId,
    team: { $in: teams.map((team) => team._id) },
  });

  const roleByTeam = new Map(
    memberships.map((membership) => [
      membership.team.toString(),
      membership.role,
    ]),
  );

  return teams.map((team) => ({
    id: team._id,
    name: team.name,
    description: team.description,
    workspace: team.workspace,
    createdBy: serializeCreator(team.createdBy),
    isMember: roleByTeam.has(team._id.toString()),
    myRole: roleByTeam.get(team._id.toString()) ?? null,
    createdAt: team.createdAt,
    updatedAt: team.updatedAt,
  }));
};

export const getTeamById = async (teamId: string, userId: string) => {
  const team = await Team.findById(teamId).populate(
    "createdBy",
    "name email avatar",
  );

  if (!team) {
    throw new AppError("Team not found", 404);
  }

  await getWorkspaceMembershipOrThrow(team.workspace, userId);

  const teamMembership = await TeamMember.findOne({
    team: teamId,
    user: userId,
  });

  return {
    id: team._id,
    name: team.name,
    description: team.description,
    workspace: team.workspace,
    createdBy: serializeCreator(team.createdBy),
    isMember: Boolean(teamMembership),
    myRole: teamMembership?.role ?? null,
    createdAt: team.createdAt,
    updatedAt: team.updatedAt,
  };
};

export const addTeamMember = async (
  teamId: string,
  currentUserId: string,
  data: AddTeamMemberInput,
) => {
  const team = await getTeamOrThrow(teamId);

  const currentWorkspaceMembership = await getWorkspaceMembershipOrThrow(
    team.workspace,
    currentUserId,
  );

  // Only workspace owner/admin or team lead can add members
  const isWorkspaceManager = isManagerRole(currentWorkspaceMembership.role);

  const isTeamLead = await TeamMember.findOne({
    team: teamId,
    user: currentUserId,
    role: "lead",
  });

  if (!isWorkspaceManager && !isTeamLead) {
    throw new AppError("You do not have permission to add team members", 403);
  }

  // Target user must belong to the workspace
  const targetWorkspaceMembership = await WorkspaceMember.findOne({
    workspace: team.workspace,
    user: data.userId,
  });

  if (!targetWorkspaceMembership) {
    throw new AppError("User is not a member of this workspace", 400);
  }

  // Prevent duplicate membership
  const existingMember = await TeamMember.findOne({
    team: teamId,
    user: data.userId,
  });

  if (existingMember) {
    throw new AppError("User is already a member of this team", 409);
  }

  const member = await TeamMember.create({
    team: teamId,
    user: data.userId,
    role: data.role,
  });

  try {
    await createNotification({
      recipient: data.userId,
      sender: currentUserId,
      type: "team_invite",
      title: "Added to a team",
      message: `You were added to the team ${team.name}`,
      resourceId: team._id.toString(),
      resourceType: "Team",
    });
  } catch (error) {
    console.error("Team invite notification failed:", error);
  }

  return {
    id: member._id,
    team: member.team,
    user: member.user,
    role: member.role,
    joinedAt: member.joinedAt,
  };
};

export const getTeamMembers = async (teamId: string, userId: string) => {
  const team = await getTeamOrThrow(teamId);

  const workspaceMembership = await getWorkspaceMembershipOrThrow(
    team.workspace,
    userId,
  );

  const currentMember = await TeamMember.findOne({
    team: teamId,
    user: userId,
  });

  // Workspace owners/admins can view any team's roster.
  if (!currentMember && !isManagerRole(workspaceMembership.role)) {
    throw new AppError("You are not a member of this team", 403);
  }

  const members = await TeamMember.find({
    team: teamId,
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
      teamRole: member.role,
      joinedAt: member.joinedAt,
    };
  });
};

export const updateTeamMemberRole = async (
  teamId: string,
  currentUserId: string,
  memberUserId: string,
  data: UpdateTeamMemberRoleInput,
) => {
  const team = await getTeamOrThrow(teamId);

  if (currentUserId === memberUserId) {
    throw new AppError("You cannot change your own team role", 400);
  }

  const currentWorkspaceMembership = await getWorkspaceMembershipOrThrow(
    team.workspace,
    currentUserId,
  );

  const currentTeamMember = await TeamMember.findOne({
    team: teamId,
    user: currentUserId,
  });

  const isWorkspaceManager = isManagerRole(currentWorkspaceMembership.role);
  const isTeamLead = currentTeamMember?.role === "lead";

  // Workspace owners/admins don't need to be team members to manage roles.
  if (!isWorkspaceManager && !currentTeamMember) {
    throw new AppError("You are not a member of this team", 403);
  }

  if (!isWorkspaceManager && !isTeamLead) {
    throw new AppError("You do not have permission to change team roles", 403);
  }

  const targetMember = await TeamMember.findOne({
    team: teamId,
    user: memberUserId,
  });

  if (!targetMember) {
    throw new AppError("User is not a member of this team", 404);
  }

  if (!isWorkspaceManager && targetMember.role === "lead") {
    throw new AppError("Team lead cannot change another team lead's role", 403);
  }

  // Prevent removing the final team lead.
  if (targetMember.role === "lead" && data.role === "member") {
    const leadCount = await TeamMember.countDocuments({
      team: teamId,
      role: "lead",
    });

    if (leadCount <= 1) {
      throw new AppError("Team must have at least one lead", 400);
    }
  }

  targetMember.role = data.role;

  await targetMember.save();

  return {
    id: targetMember._id,
    userId: targetMember.user,
    role: targetMember.role,
  };
};

export const removeTeamMember = async (
  teamId: string,
  currentUserId: string,
  memberUserId: string,
) => {
  const team = await getTeamOrThrow(teamId);

  if (currentUserId === memberUserId) {
    throw new AppError("You cannot remove yourself from the team", 400);
  }

  const currentWorkspaceMembership = await getWorkspaceMembershipOrThrow(
    team.workspace,
    currentUserId,
  );

  const currentTeamMember = await TeamMember.findOne({
    team: teamId,
    user: currentUserId,
  });

  const isWorkspaceManager = isManagerRole(currentWorkspaceMembership.role);
  const isTeamLead = currentTeamMember?.role === "lead";

  // Workspace owners/admins don't need to be team members to manage members.
  if (!isWorkspaceManager && !currentTeamMember) {
    throw new AppError("You are not a member of this team", 403);
  }

  if (!isWorkspaceManager && !isTeamLead) {
    throw new AppError(
      "You do not have permission to remove team members",
      403,
    );
  }

  const targetMember = await TeamMember.findOne({
    team: teamId,
    user: memberUserId,
  });

  if (!targetMember) {
    throw new AppError("User is not a member of this team", 404);
  }

  if (!isWorkspaceManager && targetMember.role === "lead") {
    throw new AppError("Team lead cannot remove another team lead", 403);
  }

  if (targetMember.role === "lead") {
    const leadCount = await TeamMember.countDocuments({
      team: teamId,
      role: "lead",
    });

    if (leadCount <= 1) {
      throw new AppError("Team must have at least one lead", 400);
    }
  }

  await TeamMember.deleteOne({
    _id: targetMember._id,
  });

  // Revoke private-channel access and live channel rooms for this team.
  await removeUserFromTeamChannels(teamId, memberUserId);

  return null;
};

export const updateTeam = async (
  teamId: string,
  userId: string,
  data: UpdateTeamInput,
) => {
  const team = await getTeamOrThrow(teamId);

  const workspaceMembership = await getWorkspaceMembershipOrThrow(
    team.workspace,
    userId,
  );

  const isWorkspaceManager = isManagerRole(workspaceMembership.role);

  const teamMembership = await TeamMember.findOne({
    team: teamId,
    user: userId,
  });

  const isTeamLead = teamMembership?.role === "lead";

  if (!isWorkspaceManager && !isTeamLead) {
    throw new AppError("You do not have permission to update this team", 403);
  }

  if (data.name && data.name !== team.name) {
    const existingTeam = await Team.findOne({
      workspace: team.workspace,
      name: data.name,
      _id: { $ne: teamId },
    });

    if (existingTeam) {
      throw new AppError("A team with this name already exists", 409);
    }
  }

  if (data.name !== undefined) {
    team.name = data.name;
  }

  if (data.description !== undefined) {
    team.description = data.description;
  }

  await team.save();

  return {
    id: team._id,
    name: team.name,
    description: team.description,
    workspace: team.workspace,
    createdBy: team.createdBy,
    updatedAt: team.updatedAt,
  };
};

export const deleteTeam = async (teamId: string, userId: string) => {
  const team = await getTeamOrThrow(teamId);

  const workspaceMembership = await getWorkspaceMembershipOrThrow(
    team.workspace,
    userId,
  );

  if (!isManagerRole(workspaceMembership.role)) {
    throw new AppError("Only workspace owner or admin can delete a team", 403);
  }

  await deleteTeamsCascade([team._id]);

  return null;
};
