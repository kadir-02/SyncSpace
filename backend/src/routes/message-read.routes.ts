import { Router } from "express";
import {
  markMessagesAsReadController,
  getMessageReadReceiptsController,
} from "../controllers/message-read.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

const router = Router();

router.use(authMiddleware);

router.post("/", asyncHandler(markMessagesAsReadController));
router.post("/receipts", asyncHandler(getMessageReadReceiptsController));

export default router;
