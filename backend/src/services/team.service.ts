import { Team } from "../models/team.model.js";
import { TeamMember } from "../models/team-member.model.js";
import { WorkspaceMember } from "../models/workspace-member.model.js";
import { AppError } from "../utils/app-error.js";
import {
  CreateTeamInput,
  AddTeamMemberInput,
  UpdateTeamMemberRoleInput,
  UpdateTeamInput,
} from "../validations/team.validation.js";

export const createTeam = async (
  workspaceId: string,
  userId: string,
  data: CreateTeamInput,
) => {
  const workspaceMembership = await WorkspaceMember.findOne({
    workspace: workspaceId,
    user: userId,
  });

  if (!workspaceMembership) {
    throw new AppError("You are not a member of this workspace", 403);
  }

  if (
    workspaceMembership.role !== "owner" &&
    workspaceMembership.role !== "admin"
  ) {
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
  const membership = await WorkspaceMember.findOne({
    workspace: workspaceId,
    user: userId,
  });

  if (!membership) {
    throw new AppError("You are not a member of this workspace", 403);
  }

  const teams = await Team.find({
    workspace: workspaceId,
  })
    .populate("createdBy", "name email avatar")
    .sort({ createdAt: -1 });

  return teams.map((team) => {
    const creator = team.createdBy as any;

    return {
      id: team._id,
      name: team.name,
      description: team.description,
      workspace: team.workspace,
      createdBy: {
        id: creator._id,
        name: creator.name,
        email: creator.email,
        avatar: creator.avatar,
      },
      createdAt: team.createdAt,
      updatedAt: team.updatedAt,
    };
  });
};

export const getTeamById = async (teamId: string, userId: string) => {
  const team = await Team.findById(teamId).populate(
    "createdBy",
    "name email avatar",
  );

  if (!team) {
    throw new AppError("Team not found", 404);
  }

  const workspaceMembership = await WorkspaceMember.findOne({
    workspace: team.workspace,
    user: userId,
  });

  if (!workspaceMembership) {
    throw new AppError("You are not a member of this workspace", 403);
  }

  const creator = team.createdBy as any;

  return {
    id: team._id,
    name: team.name,
    description: team.description,
    workspace: team.workspace,
    createdBy: {
      id: creator._id,
      name: creator.name,
      email: creator.email,
      avatar: creator.avatar,
    },
    createdAt: team.createdAt,
    updatedAt: team.updatedAt,
  };
};

export const addTeamMember = async (
  teamId: string,
  currentUserId: string,
  data: AddTeamMemberInput,
) => {
  const team = await Team.findById(teamId);

  if (!team) {
    throw new AppError("Team not found", 404);
  }

  // Check current user's workspace membership
  const currentWorkspaceMembership = await WorkspaceMember.findOne({
    workspace: team.workspace,
    user: currentUserId,
  });

  if (!currentWorkspaceMembership) {
    throw new AppError("You are not a member of this workspace", 403);
  }

  // Only workspace owner/admin or team lead can add members
  const isWorkspaceManager =
    currentWorkspaceMembership.role === "owner" ||
    currentWorkspaceMembership.role === "admin";

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

  return {
    id: member._id,
    team: member.team,
    user: member.user,
    role: member.role,
    joinedAt: member.joinedAt,
  };
};

export const getTeamMembers = async (teamId: string, userId: string) => {
  const team = await Team.findById(teamId);

  if (!team) {
    throw new AppError("Team not found", 404);
  }

  const currentMember = await TeamMember.findOne({
    team: teamId,
    user: userId,
  });

  if (!currentMember) {
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
  const team = await Team.findById(teamId);

  if (!team) {
    throw new AppError("Team not found", 404);
  }

  if (currentUserId === memberUserId) {
    throw new AppError("You cannot change your own team role", 400);
  }

  const currentWorkspaceMembership = await WorkspaceMember.findOne({
    workspace: team.workspace,
    user: currentUserId,
  });

  if (!currentWorkspaceMembership) {
    throw new AppError("You are not a member of this workspace", 403);
  }

  const currentTeamMember = await TeamMember.findOne({
    team: teamId,
    user: currentUserId,
  });

  if (!currentTeamMember) {
    throw new AppError("You are not a member of this team", 403);
  }

  const isWorkspaceManager =
    currentWorkspaceMembership.role === "owner" ||
    currentWorkspaceMembership.role === "admin";

  const isTeamLead = currentTeamMember.role === "lead";

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
  const team = await Team.findById(teamId);

  if (!team) {
    throw new AppError("Team not found", 404);
  }

  if (currentUserId === memberUserId) {
    throw new AppError("You cannot remove yourself from the team", 400);
  }

  const currentWorkspaceMembership = await WorkspaceMember.findOne({
    workspace: team.workspace,
    user: currentUserId,
  });

  if (!currentWorkspaceMembership) {
    throw new AppError("You are not a member of this workspace", 403);
  }

  const currentTeamMember = await TeamMember.findOne({
    team: teamId,
    user: currentUserId,
  });

  if (!currentTeamMember) {
    throw new AppError("You are not a member of this team", 403);
  }

  const isWorkspaceManager =
    currentWorkspaceMembership.role === "owner" ||
    currentWorkspaceMembership.role === "admin";

  const isTeamLead = currentTeamMember.role === "lead";

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

  return null;
};

export const updateTeam = async (
  teamId: string,
  userId: string,
  data: UpdateTeamInput,
) => {
  const team = await Team.findById(teamId);

  if (!team) {
    throw new AppError("Team not found", 404);
  }

  const workspaceMembership = await WorkspaceMember.findOne({
    workspace: team.workspace,
    user: userId,
  });

  if (!workspaceMembership) {
    throw new AppError("You are not a member of this workspace", 403);
  }

  const isWorkspaceManager =
    workspaceMembership.role === "owner" ||
    workspaceMembership.role === "admin";

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


export const deleteTeam = async (
  teamId: string,
  userId: string
) => {
  const team = await Team.findById(teamId);

  if (!team) {
    throw new AppError("Team not found", 404);
  }

  const workspaceMembership =
    await WorkspaceMember.findOne({
      workspace: team.workspace,
      user: userId,
    });

  if (!workspaceMembership) {
    throw new AppError(
      "You are not a member of this workspace",
      403
    );
  }

  if (
    workspaceMembership.role !== "owner" &&
    workspaceMembership.role !== "admin"
  ) {
    throw new AppError(
      "Only workspace owner or admin can delete a team",
      403
    );
  }

  await TeamMember.deleteMany({
    team: teamId,
  });

  await Team.deleteOne({
    _id: teamId,
  });

  return null;
};