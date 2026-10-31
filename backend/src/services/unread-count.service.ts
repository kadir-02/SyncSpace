import mongoose from "mongoose";
import { Message } from "../models/message.model.js";
import { MessageRead } from "../models/message-read.model.js";
import { Channel } from "../models/channel.model.js";
import { TeamMember } from "../models/team-member.model.js";
import { ChannelMember } from "../models/channel-member.model.js";
import { AppError } from "../utils/app-error.js";

export const getUnreadCounts = async (userId: string) => {
  const userObjectId = new mongoose.Types.ObjectId(userId);

  const teamMemberships = await TeamMember.find({
    user: userObjectId,
  }).select("team");

  const teamIds = teamMemberships.map((membership) => membership.team);

  const channels = await Channel.find({
    team: { $in: teamIds },
  }).select("_id name type");

  const privateMemberships = await ChannelMember.find({
    user: userObjectId,
  }).select("channel");

  const privateChannelIds = new Set(
    privateMemberships.map((membership) => membership.channel.toString()),
  );

  const unreadCounts = await Promise.all(
    channels
      .filter(
        (channel) =>
          channel.type !== "private" ||
          privateChannelIds.has(channel._id.toString()),
      )
      .map(async (channel) => {
        const readMessageIds = await MessageRead.find({
          channel: channel._id,
          user: userObjectId,
        }).distinct("message");

        const count = await Message.countDocuments({
          channel: channel._id,
          sender: { $ne: userObjectId },
          _id: { $nin: readMessageIds },
        });

        return {
          channelId: channel._id,
          channelName: channel.name,
          unreadCount: count,
        };
      }),
  );

  return unreadCounts;
};
