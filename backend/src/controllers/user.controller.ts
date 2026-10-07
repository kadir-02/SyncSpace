import { Request, Response } from "express";
import { sendSuccess } from "../utils/api-response.js";
import { getCurrentUser } from "../services/user.service.js";

export const getMe = async (
  req: Request,
  res: Response
) => {
  const user = await getCurrentUser(req.user!.userId);

  return sendSuccess(
    res,
    200,
    "User fetched successfully",
    user
  );
};