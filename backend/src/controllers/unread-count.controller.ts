import type { Request, Response } from "express";
import { getUnreadCounts } from "../services/unread-count.service.js";
import { sendSuccess } from "../utils/api-response.js";

export const getUnreadCountsController = async (
  req: Request,
  res: Response,
) => {
  const result = await getUnreadCounts(req.user!.userId);

  return sendSuccess(res, 200, "Unread counts fetched successfully", result);
};
