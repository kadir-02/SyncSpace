import type { Request, Response } from "express";
import { messageSearchSchema } from "../validations/message-search.validation.js";
import { searchMessages } from "../services/message-search.service.js";
import { sendSuccess } from "../utils/api-response.js";

export const searchMessagesController = async (req: Request, res: Response) => {
  const query = messageSearchSchema.parse(req.query);

  const result = await searchMessages(
    query.channelId,
    req.user!.userId,
    query.query,
    query.page,
    query.limit,
  );

  return sendSuccess(res, 200, "Messages searched successfully", result);
};
