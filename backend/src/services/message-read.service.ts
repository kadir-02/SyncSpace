import { Message } from "../models/message.model.js";
import { MessageRead } from "../models/message-read.model.js";
import { AppError } from "../utils/app-error.js";
import { checkChannelAccess } from "./message.service.js";
import mongoose from "mongoose";

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

  if (messages.length === 0) {
    throw new AppError("No eligible messages found", 404);
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

  return MessageRead.find({
    message: { $in: messages.map((message) => message._id) },
    user: userObjectId,
  });
};
