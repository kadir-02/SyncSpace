import { Request, Response } from "express";
import {
  createChannel,
  getTeamChannels,
  getChannelById,
  updateChannel,
  deleteChannel,
} from "../services/channel.service.js";
import {
  createChannelSchema,
  updateChannelSchema,
} from "../validations/channel.validation.js";
import { sendSuccess } from "../utils/api-response.js";

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
