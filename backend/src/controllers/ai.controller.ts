import { Request, Response } from "express";
import { aiConfig, isAiConfigured } from "../config/ai.js";
import { summarizeChannel } from "../services/channel-summary.service.js";
import { sendSuccess } from "../utils/api-response.js";
import { summarizeChannelSchema } from "../validations/ai.validation.js";
import { channelIdSchema } from "../validations/message.validation.js";

// Lets the UI know whether the server has an AI provider set up.
export const getAiStatusController = async (_req: Request, res: Response) => {
  const configured = isAiConfigured();

  return sendSuccess(res, 200, "AI status fetched successfully", {
    configured,
    model: configured ? aiConfig.model : null,
    maxRangeDays: aiConfig.maxRangeDays,
  });
};

export const summarizeChannelController = async (
  req: Request<{ channelId: string }>,
  res: Response,
) => {
  const { channelId } = channelIdSchema.parse(req.params);
  const data = summarizeChannelSchema.parse(req.body);

  const result = await summarizeChannel(channelId, req.user!.userId, data);

  return sendSuccess(res, 200, "Channel summarized successfully", result);
};
