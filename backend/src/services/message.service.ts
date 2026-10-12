import { Message } from "../models/message.model.js";
import { Channel } from "../models/channel.model.js";
import { ChannelMember } from "../models/channel-member.model.js";
import { TeamMember } from "../models/team-member.model.js";
import { AppError } from "../utils/app-error.js";

const checkChannelAccess = async (channelId: string, userId: string) => {
  const channel = await Channel.findById(channelId);

  if (!channel) {
    throw new AppError("Channel not found", 404);
  }

  const teamMember = await TeamMember.findOne({
    team: channel.team,
    user: userId,
  });

  if (!teamMember) {
    throw new AppError("You are not a member of this team", 403);
  }

  if (channel.type === "private") {
    const channelMember = await ChannelMember.findOne({
      channel: channel._id,
      user: userId,
    });

    if (!channelMember) {
      throw new AppError("You are not a member of this private channel", 403);
    }
  }

  return channel;
};

export const sendMessage = async (
  channelId: string,
  userId: string,
  content: string,
) => {
  await checkChannelAccess(channelId, userId);

  return Message.create({
    channel: channelId,
    sender: userId,
    content,
  });
};

export const getChannelMessages = async (
  channelId: string,
  userId: string,
  page = 1,
  limit = 20,
) => {
  await checkChannelAccess(channelId, userId);

  const safePage = Math.max(1, Math.floor(page));
  const safeLimit = Math.min(100, Math.max(1, Math.floor(limit)));

  const [messages, total] = await Promise.all([
    Message.find({ channel: channelId })
      .populate("sender", "name email avatar")
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .lean(),

    Message.countDocuments({ channel: channelId }),
  ]);

  return {
    messages,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
    },
  };
};

export const updateMessage = async (
  messageId: string,
  userId: string,
  content: string,
) => {
  const message = await Message.findById(messageId);

  if (!message) {
    throw new AppError("Message not found", 404);
  }

  if (message.sender.toString() !== userId) {
    throw new AppError("You can only edit your own messages", 403);
  }

  await checkChannelAccess(message.channel.toString(), userId);

  message.content = content;
  message.edited = true;

  await message.save();

  return message;
};

export const deleteMessage = async (messageId: string, userId: string) => {
  const message = await Message.findById(messageId);

  if (!message) {
    throw new AppError("Message not found", 404);
  }

  if (message.sender.toString() !== userId) {
    throw new AppError("You can only delete your own messages", 403);
  }

  await checkChannelAccess(message.channel.toString(), userId);

  await message.deleteOne();

  return { messageId };
};
