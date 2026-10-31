import type { Request, Response } from "express";
import { markMessagesReadSchema } from "../validations/message-read.validation.js";
import { markMessagesAsRead } from "../services/message-read.service.js";
import { sendSuccess } from "../utils/api-response.js";

export const markMessagesAsReadController = async (
  req: Request,
  res: Response,
) => {
  const { channelId, messageIds } = markMessagesReadSchema.parse(req.body);

  const result = await markMessagesAsRead(
    channelId,
    messageIds,
    req.user!.userId,
  );

  return sendSuccess(res, 200, "Messages marked as read successfully", result);
};
