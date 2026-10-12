import { Router } from "express";
import {
  createMessageController,
  getChannelMessagesController,
  updateMessageController,
  deleteMessageController,
} from "../controllers/message.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

const router = Router();

router.post(
  "/channels/:channelId/messages",
  authMiddleware,
  asyncHandler(createMessageController),
);

router.get(
  "/channels/:channelId/messages",
  authMiddleware,
  asyncHandler(getChannelMessagesController),
);

router.patch(
  "/:messageId",
  authMiddleware,
  asyncHandler(updateMessageController),
);

router.delete(
  "/:messageId",
  authMiddleware,
  asyncHandler(deleteMessageController),
);

export default router;
