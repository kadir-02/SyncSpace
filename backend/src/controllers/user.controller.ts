import { Request, Response } from "express";
import { sendSuccess } from "../utils/api-response.js";
import { AppError } from "../utils/app-error.js";
import {
  changePassword,
  getCurrentUser,
  removeAvatar,
  searchUsers,
  updateProfile,
  uploadAvatar,
} from "../services/user.service.js";
import {
  changePasswordSchema,
  searchUsersSchema,
  updateProfileSchema,
} from "../validations/user.validation.js";

export const getMe = async (req: Request, res: Response) => {
  const user = await getCurrentUser(req.user!.userId);

  return sendSuccess(res, 200, "User fetched successfully", user);
};

export const searchUsersController = async (req: Request, res: Response) => {
  const { q, workspaceId } = searchUsersSchema.parse(req.query);

  const users = await searchUsers(req.user!.userId, q, workspaceId);

  return sendSuccess(res, 200, "Users fetched successfully", users);
};

export const updateProfileController = async (req: Request, res: Response) => {
  const data = updateProfileSchema.parse(req.body);

  const user = await updateProfile(req.user!.userId, data);

  return sendSuccess(res, 200, "Profile updated successfully", user);
};

export const uploadAvatarController = async (req: Request, res: Response) => {
  if (!req.file) {
    throw new AppError("Avatar image is required", 400);
  }

  const user = await uploadAvatar(req.user!.userId, req.file);

  return sendSuccess(res, 200, "Avatar updated successfully", user);
};

export const removeAvatarController = async (req: Request, res: Response) => {
  const user = await removeAvatar(req.user!.userId);

  return sendSuccess(res, 200, "Avatar removed successfully", user);
};

export const changePasswordController = async (
  req: Request,
  res: Response,
) => {
  const data = changePasswordSchema.parse(req.body);

  await changePassword(req.user!.userId, data);

  return sendSuccess(res, 200, "Password changed successfully", null);
};
