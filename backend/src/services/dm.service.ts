import mongoose from "mongoose";
import { Conversation } from "../models/conversation.model.js";
import { DirectMessage } from "../models/direct-message.model.js";
import { File } from "../models/file.model.js";
import { User } from "../models/user.model.js";
import { AppError } from "../utils/app-error.js";
import { getIO } from "../config/socket.js";
import { createNotification } from "./notification.service.js";

const NOTIFICATION_PREVIEW_LENGTH = 200;

const checkConversationAccess = async (
  conversationId: string,
  userId: string,
) => {
  const conversation = await Conversation.findById(conversationId);

  if (!conversation) {
    throw new AppError("Conversation not found", 404);
  }

  const isParticipant = conversation.participants.some(
    (participant) => participant.toString() === userId,
  );

  if (!isParticipant) {
    throw new AppError("You do not have access to this conversation", 403);
  }

  return conversation;
};

export const createConversation = async (
  userId: string,
  recipientId: string,
) => {
  if (userId === recipientId) {
    throw new AppError("You cannot start a conversation with yourself", 400);
  }

  const recipient = await User.findById(recipientId);

  if (!recipient) {
    throw new AppError("Recipient not found", 404);
  }

  const participants = [
    new mongoose.Types.ObjectId(userId),
    new mongoose.Types.ObjectId(recipientId),
  ];

  const existingConversation = await Conversation.findOne({
    participants: { $all: participants, $size: 2 },
  }).populate("participants", "name email avatar");

  if (existingConversation) {
    return existingConversation;
  }

  const conversation = await Conversation.create({
    participants,
    createdBy: userId,
  });

  const populated = await Conversation.findById(conversation._id).populate(
    "participants",
    "name email avatar",
  );

  // Let the recipient's open sessions show the new conversation immediately.
  try {
    getIO().to(`user:${recipientId}`).emit("dm:conversation:new", populated);
  } catch {
    // Socket server not initialised.
  }

  return populated;
};

export const getConversations = async (userId: string) => {
  return Conversation.find({ participants: userId })
    .populate("participants", "name email avatar")
    .populate({
      path: "lastMessage",
      select: "content sender createdAt",
    })
    .sort({ updatedAt: -1 });
};

export const getDirectMessages = async (
  conversationId: string,
  userId: string,
  page = 1,
  limit = 20,
) => {
  await checkConversationAccess(conversationId, userId);

  const skip = (page - 1) * limit;

  const [messages, total] = await Promise.all([
    DirectMessage.find({ conversation: conversationId })
      .populate("sender", "name email avatar")
      .populate("attachments", "originalName url mimeType size")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    DirectMessage.countDocuments({ conversation: conversationId }),
  ]);

  return {
    messages,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// Attachments must be the sender's own uploads and not tied to a channel.
const validateAttachments = async (userId: string, attachmentIds: string[]) => {
  if (attachmentIds.length === 0) return;

  const files = await File.find({
    _id: { $in: attachmentIds },
    uploadedBy: userId,
  }).select("channel");

  if (files.length !== attachmentIds.length || files.some((file) => file.channel)) {
    throw new AppError("One or more attachments are invalid", 400);
  }
};

export const sendDirectMessage = async (
  conversationId: string,
  userId: string,
  content: string,
  attachmentIds: string[] = [],
) => {
  const conversation = await checkConversationAccess(conversationId, userId);

  const uniqueAttachmentIds = Array.from(new Set(attachmentIds));
  await validateAttachments(userId, uniqueAttachmentIds);

  const message = await DirectMessage.create({
    conversation: conversationId,
    sender: userId,
    content,
    attachments: uniqueAttachmentIds,
  });

  conversation.lastMessage = message._id;
  await conversation.save();

  const participantIds = conversation.participants.map((id) => id.toString());

  // Best-effort: DM notifications for the other participant.
  try {
    await Promise.allSettled(
      participantIds
        .filter((id) => id !== userId)
        .map((recipient) =>
          createNotification({
            recipient,
            sender: userId,
            type: "direct_message",
            title: "New direct message",
            message: (content || "Sent an attachment").slice(
              0,
              NOTIFICATION_PREVIEW_LENGTH,
            ),
            resourceId: conversationId,
            resourceType: "Conversation",
          }),
        ),
    );
  } catch (error) {
    console.error("DM notification failed:", error);
  }

  const populated = await DirectMessage.findById(message._id)
    .populate("sender", "name email avatar")
    .populate("attachments", "originalName url mimeType size");

  return { message: populated, participantIds };
};

export const updateDirectMessage = async (
  messageId: string,
  userId: string,
  content: string,
) => {
  const message = await DirectMessage.findById(messageId);

  if (!message) {
    throw new AppError("Message not found", 404);
  }

  if (message.sender.toString() !== userId) {
    throw new AppError("You can only edit your own messages", 403);
  }

  const conversation = await checkConversationAccess(
    message.conversation.toString(),
    userId,
  );

  message.content = content;
  message.edited = true;
  await message.save();

  const populated = await DirectMessage.findById(message._id)
    .populate("sender", "name email avatar")
    .populate("attachments", "originalName url mimeType size");

  return {
    message: populated,
    participantIds: conversation.participants.map((id) => id.toString()),
  };
};

export const deleteDirectMessage = async (
  messageId: string,
  userId: string,
) => {
  const message = await DirectMessage.findById(messageId);

  if (!message) {
    throw new AppError("Message not found", 404);
  }

  if (message.sender.toString() !== userId) {
    throw new AppError("You can only delete your own messages", 403);
  }

  const conversationId = message.conversation.toString();

  const conversation = await checkConversationAccess(conversationId, userId);

  await message.deleteOne();

  const latestMessage = await DirectMessage.findOne({
    conversation: conversationId,
  }).sort({ createdAt: -1 });

  await Conversation.findByIdAndUpdate(conversationId, {
    lastMessage: latestMessage?._id ?? null,
  });

  return {
    messageId,
    conversationId,
    participantIds: conversation.participants.map((id) => id.toString()),
  };
};
