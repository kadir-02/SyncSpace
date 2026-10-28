import type { Request, Response } from "express";
import {
  createConversation,
  getConversations,
  getDirectMessages,
  sendDirectMessage,
  deleteDirectMessage,
} from "../services/dm.service.js";
import {
  createConversationSchema,
  sendDirectMessageSchema,
  conversationIdSchema,
  directMessageIdSchema,
} from "../validations/dm.validation.js";
import { sendSuccess } from "../utils/api-response.js";
import { AppError } from "../utils/app-error.js";
import { getIO } from "../config/socket.js";

export const createConversationController = async (
  req: Request,
  res: Response,
) => {
  const { recipientId } = createConversationSchema.parse(req.body);

  const conversation = await createConversation(req.user!.userId, recipientId);

  return sendSuccess(res, 200, "Conversation ready", conversation);
};

export const getConversationsController = async (
  req: Request,
  res: Response,
) => {
  const conversations = await getConversations(req.user!.userId);

  return sendSuccess(
    res,
    200,
    "Conversations fetched successfully",
    conversations,
  );
};

export const getDirectMessagesController = async (
  req: Request<{ conversationId: string }>,
  res: Response,
) => {
  const { conversationId } = conversationIdSchema.parse(req.params);

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

  const result = await getDirectMessages(
    conversationId,
    req.user!.userId,
    page,
    limit,
  );

  return sendSuccess(res, 200, "Direct messages fetched successfully", result);
};

export const sendDirectMessageController = async (
  req: Request<{ conversationId: string }>,
  res: Response,
) => {
  const { conversationId } = conversationIdSchema.parse(req.params);
  const { content } = sendDirectMessageSchema.parse(req.body);

  const message = await sendDirectMessage(
    conversationId,
    req.user!.userId,
    content,
  );

  getIO().to(`dm:${conversationId}`).emit("dm:message:new", message);

  return sendSuccess(res, 201, "Direct message sent successfully", message);
};

export const deleteDirectMessageController = async (
  req: Request<{ messageId: string }>,
  res: Response,
) => {
  const { messageId } = directMessageIdSchema.parse(req.params);

  const result = await deleteDirectMessage(messageId, req.user!.userId);

  getIO().to(`dm:${result.conversationId}`).emit("dm:message:deleted", {
    messageId: result.messageId,
    conversationId: result.conversationId,
  });

  return sendSuccess(res, 200, "Direct message deleted successfully", null);
};
