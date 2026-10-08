import { Request, Response } from "express";
import {
  addTeamMember,
  createTeam,
  deleteTeam,
  getTeamById,
  getTeamMembers,
  getWorkspaceTeams,
  removeTeamMember,
  updateTeam,
  updateTeamMemberRole,
} from "../services/team.service.js";
import {
  addTeamMemberSchema,
  createTeamSchema,
  updateTeamMemberRoleSchema,
  updateTeamSchema,
} from "../validations/team.validation.js";
import { sendSuccess } from "../utils/api-response.js";

export const createTeamController = async (
  req: Request<{ workspaceId: string }>,
  res: Response,
) => {
  const data = createTeamSchema.parse(req.body);

  const team = await createTeam(req.params.workspaceId, req.user!.userId, data);

  return sendSuccess(res, 201, "Team created successfully", team);
};

export const getWorkspaceTeamsController = async (
  req: Request<{ workspaceId: string }>,
  res: Response,
) => {
  const teams = await getWorkspaceTeams(
    req.params.workspaceId,
    req.user!.userId,
  );

  return sendSuccess(res, 200, "Teams fetched successfully", teams);
};

export const getTeamController = async (
  req: Request<{ teamId: string }>,
  res: Response,
) => {
  const team = await getTeamById(req.params.teamId, req.user!.userId);

  return sendSuccess(res, 200, "Team fetched successfully", team);
};

export const addTeamMemberController = async (
  req: Request<{ teamId: string }>,
  res: Response,
) => {
  const data = addTeamMemberSchema.parse(req.body);

  const member = await addTeamMember(req.params.teamId, req.user!.userId, data);

  return sendSuccess(res, 201, "Team member added successfully", member);
};

export const getTeamMembersController = async (
  req: Request<{ teamId: string }>,
  res: Response,
) => {
  const members = await getTeamMembers(req.params.teamId, req.user!.userId);

  return sendSuccess(res, 200, "Team members fetched successfully", members);
};

export const updateTeamMemberRoleController = async (
  req: Request<{ teamId: string; userId: string }>,
  res: Response,
) => {
  const data = updateTeamMemberRoleSchema.parse(req.body);

  const member = await updateTeamMemberRole(
    req.params.teamId,
    req.user!.userId,
    req.params.userId,
    data,
  );

  return sendSuccess(res, 200, "Team member role updated successfully", member);
};

export const removeTeamMemberController = async (
  req: Request<{ teamId: string; userId: string }>,
  res: Response,
) => {
  await removeTeamMember(
    req.params.teamId,
    req.user!.userId,
    req.params.userId,
  );

  return sendSuccess(res, 200, "Team member removed successfully", null);
};

export const updateTeamController = async (
  req: Request<{ teamId: string }>,
  res: Response,
) => {
  const data = updateTeamSchema.parse(req.body);

  const team = await updateTeam(req.params.teamId, req.user!.userId, data);

  return sendSuccess(res, 200, "Team updated successfully", team);
};

export const deleteTeamController = async (
  req: Request<{ teamId: string }>,
  res: Response,
) => {
  await deleteTeam(req.params.teamId, req.user!.userId);

  return sendSuccess(res, 200, "Team deleted successfully", null);
};
