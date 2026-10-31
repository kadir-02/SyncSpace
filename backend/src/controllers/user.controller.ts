import { Request, Response } from "express";
import { sendSuccess } from "../utils/api-response.js";
import { getCurrentUser, searchUsers } from "../services/user.service.js";
import { searchUsersSchema } from "../validations/user.validation.js";

export const getMe = async (req: Request, res: Response) => {
  const user = await getCurrentUser(req.user!.userId);

  return sendSuccess(res, 200, "User fetched successfully", user);
};

export const searchUsersController = async (req: Request, res: Response) => {
  const { q, workspaceId } = searchUsersSchema.parse(req.query);

  const users = await searchUsers(req.user!.userId, q, workspaceId);

  return sendSuccess(res, 200, "Users fetched successfully", users);
};
