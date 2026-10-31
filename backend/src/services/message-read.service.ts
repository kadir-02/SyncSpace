import { Message } from "../models/message.model.js";
import { MessageRead } from "../models/message-read.model.js";
import { checkChannelAccess } from "./message.service.js";
import mongoose from "mongoose";
import { getIO } from "../config/socket.js";

export const markMessagesAsRead = async (
  channelId: string,
  messageIds: string[],
  userId: string,
) => {
  await checkChannelAccess(channelId, userId);

  const channelObjectId = new mongoose.Types.ObjectId(channelId);
  const userObjectId = new mongoose.Types.ObjectId(userId);

  const messages = await Message.find({
    _id: { $in: messageIds },
    channel: channelObjectId,
    sender: { $ne: userObjectId },
  }).select("_id");

  // Nothing to mark (e.g. only your own messages) is not an error.
  if (messages.length === 0) {
    return [];
  }

  const readAt = new Date();

  await MessageRead.bulkWrite(
    messages.map((message) => ({
      updateOne: {
        filter: {
          message: message._id,
          user: userObjectId,
        },
        update: {
          $setOnInsert: {
            message: message._id,
            channel: channelObjectId,
            user: userObjectId,
            readAt,
          },
        },
        upsert: true,
      },
    })),
  );

  getIO()
    .to(`channel:${channelId}`)
    .emit("message:read", {
      channelId,
      userId,
      messageIds: messages.map((message) => message._id.toString()),
      readAt,
    });

  return MessageRead.find({
    message: { $in: messages.map((message) => message._id) },
    user: userObjectId,
  });
};

export const getMessageReadReceipts = async (
  channelId: string,
  messageIds: string[],
  userId: string,
) => {
  await checkChannelAccess(channelId, userId);

  const channelObjectId = new mongoose.Types.ObjectId(channelId);

  const messages = await Message.find({
    _id: { $in: messageIds },
    channel: channelObjectId,
  }).select("_id");

  if (messages.length === 0) {
    return [];
  }

  const validMessageIds = messages.map((message) => message._id);

  return MessageRead.find({
    channel: channelObjectId,
    message: { $in: validMessageIds },
  })
    .populate("user", "name email avatar")
    .sort({ readAt: -1 });
};
