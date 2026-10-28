import { Router } from "express";
import {
  createConversationController,
  getConversationsController,
  getDirectMessagesController,
  sendDirectMessageController,
  deleteDirectMessageController,
} from "../controllers/dm.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

const router = Router();

router.use(authMiddleware);

router.post("/conversations", asyncHandler(createConversationController));
router.get("/conversations", asyncHandler(getConversationsController));

router.get(
  "/conversations/:conversationId/messages",
  asyncHandler(getDirectMessagesController),
);

router.post(
  "/conversations/:conversationId/messages",
  asyncHandler(sendDirectMessageController),
);

router.delete(
  "/messages/:messageId",
  asyncHandler(deleteDirectMessageController),
);

export default router;
