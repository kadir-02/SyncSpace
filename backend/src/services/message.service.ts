import { Types } from "mongoose";
import { Message } from "../models/message.model.js";
import { MessageRead } from "../models/message-read.model.js";
import { Channel } from "../models/channel.model.js";
import { ChannelMember } from "../models/channel-member.model.js";
import { TeamMember } from "../models/team-member.model.js";
import { Team } from "../models/team.model.js";
import { File } from "../models/file.model.js";
import { AppError } from "../utils/app-error.js";
import { createNotification } from "./notification.service.js";

const NOTIFICATION_PREVIEW_LENGTH = 200;

export const checkChannelAccess = async (channelId: string, userId: string) => {
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

// Always return messages in the same shape (populated sender and attachments),
// whether they come from REST responses or socket events.
const populateMessage = async (messageId: string | Types.ObjectId) => {
  const message = await Message.findById(messageId)
    .populate("sender", "name email avatar")
    .populate("attachments", "originalName url mimeType size")
    .lean();

  if (!message) {
    throw new AppError("Message not found", 404);
  }

  return message;
};

const validateAttachments = async (
  channelId: string,
  workspaceId: Types.ObjectId,
  userId: string,
  attachmentIds: string[],
) => {
  if (attachmentIds.length === 0) return;

  const uniqueIds = Array.from(new Set(attachmentIds));

  const files = await File.find({
    _id: { $in: uniqueIds },
    workspace: workspaceId,
    uploadedBy: userId,
  }).select("channel");

  const allValid =
    files.length === uniqueIds.length &&
    files.every((file) => !file.channel || file.channel.toString() === channelId);

  if (!allValid) {
    throw new AppError("One or more attachments are invalid", 400);
  }
};

export const sendMessage = async (
  channelId: string,
  userId: string,
  content: string,
  attachmentIds: string[] = [],
) => {
  const channel = await checkChannelAccess(channelId, userId);

  const team = await Team.findById(channel.team).select("workspace");

  if (!team) {
    throw new AppError("Team not found", 404);
  }

  await validateAttachments(channelId, team.workspace, userId, attachmentIds);

  const message = await Message.create({
    channel: channelId,
    sender: userId,
    content,
    attachments: Array.from(new Set(attachmentIds)),
  });

  // Notifications are best-effort: a failure must never fail (or hide) a message
  // that has already been saved.
  try {
    const recipients =
      channel.type === "private"
        ? await ChannelMember.find({
            channel: channelId,
            user: { $ne: userId },
          }).select("user")
        : await TeamMember.find({
            team: channel.team,
            user: { $ne: userId },
          }).select("user");

    const preview = (content || "Sent an attachment").slice(
      0,
      NOTIFICATION_PREVIEW_LENGTH,
    );

    await Promise.allSettled(
      recipients.map((member) =>
        createNotification({
          recipient: member.user.toString(),
          sender: userId,
          type: "message",
          title: `New message in #${channel.name}`,
          message: preview,
          resourceId: message._id.toString(),
          resourceType: "Message",
          channel: channelId,
        }),
      ),
    );
  } catch (error) {
    console.error("Message notification failed:", error);
  }

  return populateMessage(message._id);
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
      .populate("attachments", "originalName url mimeType size")
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

  return populateMessage(message._id);
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

  const channelId = message.channel.toString();

  await message.deleteOne();
  await MessageRead.deleteMany({ message: message._id });

  return {
    messageId,
    channelId,
  };
};
