import { Request, Response } from "express";
import {
  addWorkspaceMember,
  createWorkspace,
  deleteWorkspace,
  getUserWorkspaces,
  getWorkspaceById,
  getWorkspaceMembers,
  leaveWorkspace,
  removeWorkspaceMember,
  transferWorkspaceOwnership,
  updateWorkspaceMemberRole,
} from "../services/workspace.service.js";
import {
  addWorkspaceMemberSchema,
  createWorkspaceSchema,
  transferWorkspaceOwnershipSchema,
  updateWorkspaceMemberRoleSchema,
} from "../validations/workspace.validation.js";
import { sendSuccess } from "../utils/api-response.js";

export const createWorkspaceController = async (
  req: Request,
  res: Response,
) => {
  const data = createWorkspaceSchema.parse(req.body);

  const workspace = await createWorkspace(req.user!.userId, data);

  return sendSuccess(res, 201, "Workspace created successfully", workspace);
};

export const getMyWorkspaces = async (req: Request, res: Response) => {
  const workspaces = await getUserWorkspaces(req.user!.userId);

  return sendSuccess(res, 200, "Workspaces fetched successfully", workspaces);
};

export const getWorkspace = async (
  req: Request<{ id: string }>,
  res: Response,
) => {
  const workspace = await getWorkspaceById(req.params.id, req.user!.userId);

  return sendSuccess(res, 200, "Workspace fetched successfully", workspace);
};

export const addMember = async (
  req: Request<{ id: string }>,
  res: Response,
) => {
  const data = addWorkspaceMemberSchema.parse(req.body);

  const member = await addWorkspaceMember(
    req.params.id,
    req.user!.userId,
    data,
  );

  return sendSuccess(res, 201, "Member added successfully", member);
};

export const getMembers = async (
  req: Request<{ id: string }>,
  res: Response,
) => {
  const members = await getWorkspaceMembers(req.params.id, req.user!.userId);

  return sendSuccess(
    res,
    200,
    "Workspace members fetched successfully",
    members,
  );
};

export const removeMember = async (
  req: Request<{ id: string; userId: string }>,
  res: Response,
) => {
  await removeWorkspaceMember(
    req.params.id,
    req.user!.userId,
    req.params.userId,
  );

  return sendSuccess(res, 200, "Member removed successfully", null);
};

export const updateMemberRole = async (
  req: Request<{ id: string; userId: string }>,
  res: Response,
) => {
  const data = updateWorkspaceMemberRoleSchema.parse(req.body);

  const member = await updateWorkspaceMemberRole(
    req.params.id,
    req.user!.userId,
    req.params.userId,
    data,
  );

  return sendSuccess(res, 200, "Member role updated successfully", member);
};

export const leaveWorkspaceController = async (
  req: Request<{ id: string }>,
  res: Response,
) => {
  await leaveWorkspace(req.params.id, req.user!.userId);

  return sendSuccess(res, 200, "You have left the workspace", null);
};

export const deleteWorkspaceController = async (
  req: Request<{ id: string }>,
  res: Response,
) => {
  await deleteWorkspace(req.params.id, req.user!.userId);

  return sendSuccess(res, 200, "Workspace deleted successfully", null);
};

export const transferOwnership = async (
  req: Request<{ id: string }>,
  res: Response,
) => {
  const data = transferWorkspaceOwnershipSchema.parse(req.body);

  const result = await transferWorkspaceOwnership(
    req.params.id,
    req.user!.userId,
    data,
  );

  return sendSuccess(
    res,
    200,
    "Workspace ownership transferred successfully",
    result,
  );
};
