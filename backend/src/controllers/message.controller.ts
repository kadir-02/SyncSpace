import { Request, Response } from "express";
import {
  sendMessage,
  getChannelMessages,
  updateMessage,
  deleteMessage,
} from "../services/message.service.js";
import {
  createMessageSchema,
  updateMessageSchema,
} from "../validations/message.validation.js";
import { sendSuccess } from "../utils/api-response.js";
import { AppError } from "../utils/app-error.js";

export const createMessageController = async (
  req: Request<{ channelId: string }>,
  res: Response,
) => {
  const { content } = createMessageSchema.parse(req.body);

  const message = await sendMessage(
    req.params.channelId,
    req.user!.userId,
    content,
  );

  return sendSuccess(res, 201, "Message sent successfully", message);
};

export const getChannelMessagesController = async (
  req: Request<{ channelId: string }>,
  res: Response,
) => {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 20);

  if (
    !Number.isInteger(page) ||
    page < 1 ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 100
  ) {
    throw new AppError(
      "Page must be positive and limit must be between 1 and 100",
      400,
    );
  }

  const result = await getChannelMessages(
    req.params.channelId,
    req.user!.userId,
    page,
    limit,
  );

  return sendSuccess(res, 200, "Messages fetched successfully", result);
};

export const updateMessageController = async (
  req: Request<{ messageId: string }>,
  res: Response,
) => {
  const { content } = updateMessageSchema.parse(req.body);

  const message = await updateMessage(
    req.params.messageId,
    req.user!.userId,
    content,
  );

  return sendSuccess(res, 200, "Message updated successfully", message);
};

export const deleteMessageController = async (
  req: Request<{ messageId: string }>,
  res: Response,
) => {
  await deleteMessage(req.params.messageId, req.user!.userId);

  return sendSuccess(res, 200, "Message deleted successfully", null);
};
