import { Router } from "express";
import {
  createChannelController,
  getTeamChannelsController,
  getChannelController,
  deleteChannelController,
  updateChannelController,
} from "../controllers/channel.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

const router = Router();

router.post(
  "/teams/:teamId/channels",
  authMiddleware,
  asyncHandler(createChannelController),
);

router.get(
  "/teams/:teamId/channels",
  authMiddleware,
  asyncHandler(getTeamChannelsController),
);

router.patch(
  "/:channelId",
  authMiddleware,
  asyncHandler(updateChannelController),
);

router.delete(
  "/:channelId",
  authMiddleware,
  asyncHandler(deleteChannelController),
);

router.get("/:channelId", authMiddleware, asyncHandler(getChannelController));

export default router;
