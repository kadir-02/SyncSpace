import { Types } from "mongoose";
import { Channel } from "../models/channel.model.js";
import { ChannelMember } from "../models/channel-member.model.js";
import { Message } from "../models/message.model.js";
import { MessageRead } from "../models/message-read.model.js";
import { Notification } from "../models/notification.model.js";
import { Team } from "../models/team.model.js";
import { TeamMember } from "../models/team-member.model.js";
import { WorkspaceMember } from "../models/workspace-member.model.js";
import { AppError } from "../utils/app-error.js";
import {
  CreateChannelInput,
  UpdateChannelInput,
} from "../validations/channel.validation.js";
import { createNotification } from "./notification.service.js";
import { deleteFilesByChannels } from "./file.service.js";
import {
  closeChannelRooms,
  removeUserFromRooms,
} from "../utils/socket-rooms.js";

/**
 * Deletes channels together with everything that hangs off them:
 * memberships, messages, read receipts, notifications and uploaded files.
 */
export const deleteChannelsCascade = async (channelIds: Types.ObjectId[]) => {
  if (channelIds.length === 0) return;

  await deleteFilesByChannels(channelIds);

  await Promise.all([
    ChannelMember.deleteMany({ channel: { $in: channelIds } }),
    MessageRead.deleteMany({ channel: { $in: channelIds } }),
    Message.deleteMany({ channel: { $in: channelIds } }),
    Notification.deleteMany({ channel: { $in: channelIds } }),
    Channel.deleteMany({ _id: { $in: channelIds } }),
  ]);

  closeChannelRooms(channelIds.map((id) => id.toString()));
};

/**
 * Removes a user's private-channel memberships for a team and kicks their live
 * sockets out of those channel rooms.
 */
export const removeUserFromTeamChannels = async (
  teamId: string | Types.ObjectId,
  userId: string,
) => {
  const channelIds = (await Channel.find({ team: teamId }).distinct(
    "_id",
  )) as Types.ObjectId[];

  if (channelIds.length === 0) return;

  await ChannelMember.deleteMany({
    user: userId,
    channel: { $in: channelIds },
  });

  removeUserFromRooms(
    userId,
    channelIds.map((id) => `channel:${id.toString()}`),
  );
};

export const createChannel = async (
  teamId: string,
  userId: string,
  data: CreateChannelInput,
) => {
  const team = await Team.findById(teamId);

  if (!team) {
    throw new AppError("Team not found", 404);
  }

  const teamMembership = await TeamMember.findOne({
    team: teamId,
    user: userId,
  });

  if (!teamMembership) {
    throw new AppError("You are not a member of this team", 403);
  }

  const workspaceMembership = await WorkspaceMember.findOne({
    workspace: team.workspace,
    user: userId,
  });

  if (
    !workspaceMembership ||
    !["owner", "admin"].includes(workspaceMembership.role)
  ) {
    throw new AppError(
      "Only workspace owners or admins can create channels",
      403,
    );
  }

  const existingChannel = await Channel.findOne({
    team: teamId,
    name: data.name,
  });

  if (existingChannel) {
    throw new AppError("A channel with this name already exists", 409);
  }

  const channel = await Channel.create({
    name: data.name,
    description: data.description,
    type: data.type,
    team: teamId,
    createdBy: userId,
  });

  // Private channels require explicit membership.
  if (channel.type === "private") {
    await ChannelMember.create({
      channel: channel._id,
      user: userId,
    });
  }

  return {
    id: channel._id,
    name: channel.name,
    description: channel.description,
    type: channel.type,
    team: channel.team,
    createdBy: channel.createdBy,
    createdAt: channel.createdAt,
  };
};

export const getTeamChannels = async (teamId: string, userId: string) => {
  const team = await Team.findById(teamId);

  if (!team) {
    throw new AppError("Team not found", 404);
  }

  const teamMembership = await TeamMember.findOne({
    team: teamId,
    user: userId,
  });

  if (!teamMembership) {
    throw new AppError("You are not a member of this team", 403);
  }

  const privateChannelIds = await ChannelMember.find({
    user: userId,
  }).distinct("channel");

  const channels = await Channel.find({
    team: teamId,
    $or: [
      { type: "public" },
      { type: "private", _id: { $in: privateChannelIds } },
    ],
  })
    .populate("createdBy", "name email avatar")
    .sort({ createdAt: 1 });

  return channels;
};

export const getChannelById = async (channelId: string, userId: string) => {
  const channel = await Channel.findById(channelId).populate(
    "createdBy",
    "name email avatar",
  );

  if (!channel) {
    throw new AppError("Channel not found", 404);
  }

  const teamMembership = await TeamMember.findOne({
    team: channel.team,
    user: userId,
  });

  if (!teamMembership) {
    throw new AppError("You are not a member of this team", 403);
  }

  if (channel.type === "private") {
    const channelMembership = await ChannelMember.findOne({
      channel: channelId,
      user: userId,
    });

    if (!channelMembership) {
      throw new AppError("You do not have access to this private channel", 403);
    }
  }

  return channel;
};

export const updateChannel = async (
  channelId: string,
  userId: string,
  data: UpdateChannelInput,
) => {
  const channel = await Channel.findById(channelId);

  if (!channel) {
    throw new AppError("Channel not found", 404);
  }

  const team = await Team.findById(channel.team);

  const workspaceMembership = team
    ? await WorkspaceMember.findOne({
        workspace: team.workspace,
        user: userId,
      })
    : null;

  if (
    !workspaceMembership ||
    !["owner", "admin"].includes(workspaceMembership.role)
  ) {
    throw new AppError(
      "Only workspace owners or admins can update channels",
      403,
    );
  }

  if (data.name && data.name !== channel.name) {
    const existingChannel = await Channel.findOne({
      team: channel.team,
      name: data.name,
      _id: { $ne: channelId },
    });

    if (existingChannel) {
      throw new AppError("A channel with this name already exists", 409);
    }
  }

  if (data.name !== undefined) channel.name = data.name;
  if (data.description !== undefined) {
    channel.description = data.description;
  }

  if (data.type !== undefined && data.type !== channel.type) {
    if (data.type === "private") {
      // Keep everyone who currently has access (all team members) plus the
      // creator, so converting to private doesn't silently lock people out.
      const teamMembers = await TeamMember.find({
        team: channel.team,
      }).select("user");

      const userIds = new Set(teamMembers.map((m) => m.user.toString()));
      userIds.add(channel.createdBy.toString());

      await ChannelMember.bulkWrite(
        Array.from(userIds).map((memberId) => ({
          updateOne: {
            filter: {
              channel: channel._id,
              user: new Types.ObjectId(memberId),
            },
            update: {
              $setOnInsert: {
                channel: channel._id,
                user: new Types.ObjectId(memberId),
                joinedAt: new Date(),
              },
            },
            upsert: true,
          },
        })),
      );
    } else {
      // Public channels use team membership; drop stale explicit members.
      await ChannelMember.deleteMany({ channel: channel._id });
    }

    channel.type = data.type;
  }

  await channel.save();

  return channel;
};

export const deleteChannel = async (channelId: string, userId: string) => {
  const channel = await Channel.findById(channelId);

  if (!channel) {
    throw new AppError("Channel not found", 404);
  }

  const team = await Team.findById(channel.team);

  if (!team) {
    throw new AppError("Team not found", 404);
  }

  const workspaceMembership = await WorkspaceMember.findOne({
    workspace: team.workspace,
    user: userId,
  });

  if (
    !workspaceMembership ||
    !["owner", "admin"].includes(workspaceMembership.role)
  ) {
    throw new AppError(
      "Only workspace owners or admins can delete channels",
      403,
    );
  }

  await deleteChannelsCascade([channel._id]);

  return { id: channel._id };
};

export const addChannelMember = async (
  channelId: string,
  currentUserId: string,
  targetUserId: string,
) => {
  const channel = await Channel.findById(channelId);

  if (!channel) {
    throw new AppError("Channel not found", 404);
  }

  if (channel.type !== "private") {
    throw new AppError("Members are managed only for private channels", 400);
  }

  const team = await Team.findById(channel.team);

  if (!team) {
    throw new AppError("Team not found", 404);
  }

  const currentMembership = await TeamMember.findOne({
    team: team._id,
    user: currentUserId,
  });

  if (!currentMembership) {
    throw new AppError("You are not a member of this team", 403);
  }

  const targetMembership = await TeamMember.findOne({
    team: team._id,
    user: targetUserId,
  });

  if (!targetMembership) {
    throw new AppError("Target user is not a member of this team", 400);
  }

  const workspaceMembership = await WorkspaceMember.findOne({
    workspace: team.workspace,
    user: currentUserId,
  });

  const isWorkspaceAdmin =
    workspaceMembership && ["owner", "admin"].includes(workspaceMembership.role);

  const isChannelCreator = channel.createdBy.toString() === currentUserId;

  if (!isWorkspaceAdmin && !isChannelCreator) {
    throw new AppError(
      "Only the channel creator or workspace admins can add members",
      403,
    );
  }

  const existingMembership = await ChannelMember.findOne({
    channel: channelId,
    user: targetUserId,
  });

  if (existingMembership) {
    throw new AppError("User is already a channel member", 409);
  }

  const member = await ChannelMember.create({
    channel: channelId,
    user: targetUserId,
  });

  try {
    await createNotification({
      recipient: targetUserId,
      sender: currentUserId,
      type: "channel_invite",
      title: "Added to a private channel",
      message: `You were added to #${channel.name}`,
      resourceId: channel._id.toString(),
      resourceType: "Channel",
      channel: channel._id.toString(),
    });
  } catch (error) {
    console.error("Channel invite notification failed:", error);
  }

  return {
    id: member._id,
    channel: member.channel,
    user: member.user,
    joinedAt: member.joinedAt,
  };
};

export const getChannelMembers = async (channelId: string, userId: string) => {
  const channel = await Channel.findById(channelId);

  if (!channel) {
    throw new AppError("Channel not found", 404);
  }

  if (channel.type !== "private") {
    throw new AppError(
      "Member lists are only available for private channels",
      400,
    );
  }

  const currentMembership = await TeamMember.findOne({
    team: channel.team,
    user: userId,
  });

  if (!currentMembership) {
    throw new AppError("You are not a member of this team", 403);
  }

  const channelMembership = await ChannelMember.findOne({
    channel: channelId,
    user: userId,
  });

  const team = await Team.findById(channel.team);

  const workspaceMembership = team
    ? await WorkspaceMember.findOne({
        workspace: team.workspace,
        user: userId,
      })
    : null;

  const canManage =
    workspaceMembership && ["owner", "admin"].includes(workspaceMembership.role);

  if (!channelMembership && !canManage) {
    throw new AppError("You do not have access to this private channel", 403);
  }

  return ChannelMember.find({ channel: channelId })
    .populate("user", "name email avatar")
    .sort({ joinedAt: 1 });
};

export const removeChannelMember = async (
  channelId: string,
  currentUserId: string,
  targetUserId: string,
) => {
  const channel = await Channel.findById(channelId);

  if (!channel) {
    throw new AppError("Channel not found", 404);
  }

  if (channel.type !== "private") {
    throw new AppError("Members are managed only for private channels", 400);
  }

  const team = await Team.findById(channel.team);

  if (!team) {
    throw new AppError("Team not found", 404);
  }

  const currentMembership = await TeamMember.findOne({
    team: team._id,
    user: currentUserId,
  });

  if (!currentMembership) {
    throw new AppError("You are not a member of this team", 403);
  }

  const workspaceMembership = await WorkspaceMember.findOne({
    workspace: team.workspace,
    user: currentUserId,
  });

  const isWorkspaceAdmin =
    workspaceMembership && ["owner", "admin"].includes(workspaceMembership.role);

  const isChannelCreator = channel.createdBy.toString() === currentUserId;

  if (!isWorkspaceAdmin && !isChannelCreator) {
    throw new AppError(
      "Only the channel creator or workspace admins can remove members",
      403,
    );
  }

  if (targetUserId === channel.createdBy.toString()) {
    throw new AppError("The channel creator cannot be removed", 400);
  }

  const removed = await ChannelMember.findOneAndDelete({
    channel: channelId,
    user: targetUserId,
  });

  if (!removed) {
    throw new AppError("Channel member not found", 404);
  }

  // Stop live message delivery to the removed user.
  removeUserFromRooms(targetUserId, [`channel:${channelId}`]);

  return { userId: targetUserId };
};
