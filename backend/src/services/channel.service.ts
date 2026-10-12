import { Channel } from "../models/channel.model.js";
import { ChannelMember } from "../models/channel-member.model.js";
import { Team } from "../models/team.model.js";
import { TeamMember } from "../models/team-member.model.js";
import { WorkspaceMember } from "../models/workspace-member.model.js";
import { AppError } from "../utils/app-error.js";
import {
  CreateChannelInput,
  UpdateChannelInput,
} from "../validations/channel.validation.js";

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

  const channels = await Channel.find({
    team: teamId,
    $or: [
      { type: "public" },
      {
        type: "private",
        _id: {
          $in: await ChannelMember.find({ user: userId }).distinct("channel"),
        },
      },
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

  const workspaceMembership = await WorkspaceMember.findOne({
    workspace: (await Team.findById(channel.team))?.workspace,
    user: userId,
  });

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
      // When converting to private, explicitly add the creator.
      await ChannelMember.updateOne(
        { channel: channel._id, user: channel.createdBy },
        { $setOnInsert: { channel: channel._id, user: channel.createdBy } },
        { upsert: true },
      );
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

  await ChannelMember.deleteMany({ channel: channel._id });
  await channel.deleteOne();

  return { id: channel._id };
};
