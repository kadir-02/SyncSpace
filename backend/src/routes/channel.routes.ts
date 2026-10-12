import { Router } from "express";
import {
  createChannelController,
  getTeamChannelsController,
  getChannelController,
  deleteChannelController,
  updateChannelController,
  removeChannelMemberController,
  getChannelMembersController,
  addChannelMemberController,
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

router.post(
  "/:channelId/members",
  authMiddleware,
  asyncHandler(addChannelMemberController),
);

router.get(
  "/:channelId/members",
  authMiddleware,
  asyncHandler(getChannelMembersController),
);

router.delete(
  "/:channelId/members/:userId",
  authMiddleware,
  asyncHandler(removeChannelMemberController),
);

router.get("/:channelId", authMiddleware, asyncHandler(getChannelController));

export default router;
