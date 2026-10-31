import { Message } from "../models/message.model.js";
import { AppError } from "../utils/app-error.js";
import { checkChannelAccess } from "./message.service.js";

export const searchMessages = async (
  channelId: string,
  userId: string,
  query: string,
  page = 1,
  limit = 20,
) => {
  await checkChannelAccess(channelId, userId);

  const safePage = Math.max(1, page);
  const safeLimit = Math.min(50, Math.max(1, limit));

  const filter = {
    channel: channelId,
    content: {
      $regex: query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      $options: "i",
    },
  };

  const [messages, total] = await Promise.all([
    Message.find(filter)
      .populate("sender", "name email avatar")
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit),
    Message.countDocuments(filter),
  ]);

  return {
    messages,
    pagination: {
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    },
  };
};
