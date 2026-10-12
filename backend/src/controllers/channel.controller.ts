import { Request, Response } from "express";
import {
  createChannel,
  getTeamChannels,
  getChannelById,
  updateChannel,
  deleteChannel,
  addChannelMember,
  getChannelMembers,
  removeChannelMember,
} from "../services/channel.service.js";
import {
  createChannelSchema,
  updateChannelSchema,
  channelMemberSchema,
} from "../validations/channel.validation.js";
import { sendSuccess } from "../utils/api-response.js";
import { AppError } from "../utils/app-error.js";

export const createChannelController = async (
  req: Request<{ teamId: string }>,
  res: Response,
) => {
  const data = createChannelSchema.parse(req.body);

  const channel = await createChannel(
    req.params.teamId,
    req.user!.userId,
    data,
  );

  return sendSuccess(res, 201, "Channel created successfully", channel);
};

export const getTeamChannelsController = async (
  req: Request<{ teamId: string }>,
  res: Response,
) => {
  const channels = await getTeamChannels(req.params.teamId, req.user!.userId);

  return sendSuccess(res, 200, "Channels fetched successfully", channels);
};

export const getChannelController = async (
  req: Request<{ channelId: string }>,
  res: Response,
) => {
  const channel = await getChannelById(req.params.channelId, req.user!.userId);

  return sendSuccess(res, 200, "Channel fetched successfully", channel);
};

export const updateChannelController = async (
  req: Request<{ channelId: string }>,
  res: Response,
) => {
  const data = updateChannelSchema.parse(req.body);

  const channel = await updateChannel(
    req.params.channelId,
    req.user!.userId,
    data,
  );

  return sendSuccess(res, 200, "Channel updated successfully", channel);
};

export const deleteChannelController = async (
  req: Request<{ channelId: string }>,
  res: Response,
) => {
  await deleteChannel(req.params.channelId, req.user!.userId);

  return sendSuccess(res, 200, "Channel deleted successfully", null);
};

export const addChannelMemberController = async (
  req: Request<{ channelId: string }>,
  res: Response,
) => {
  const { userId } = channelMemberSchema.parse(req.body);

  if (!userId || typeof userId !== "string") {
    throw new AppError("A valid userId is required", 400);
  }

  const member = await addChannelMember(
    req.params.channelId,
    req.user!.userId,
    userId,
  );

  return sendSuccess(res, 201, "Channel member added successfully", member);
};

export const getChannelMembersController = async (
  req: Request<{ channelId: string }>,
  res: Response,
) => {
  const members = await getChannelMembers(
    req.params.channelId,
    req.user!.userId,
  );

  return sendSuccess(res, 200, "Channel members fetched successfully", members);
};

export const removeChannelMemberController = async (
  req: Request<{ channelId: string; userId: string }>,
  res: Response,
) => {
  await removeChannelMember(
    req.params.channelId,
    req.user!.userId,
    req.params.userId,
  );

  return sendSuccess(res, 200, "Channel member removed successfully", null);
};
