import { Router } from "express";
import {
  getAiStatusController,
  summarizeChannelController,
} from "../controllers/ai.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

const router = Router();

router.use(authMiddleware);

router.get("/status", asyncHandler(getAiStatusController));
router.post("/channels/:channelId/summary", asyncHandler(summarizeChannelController));

export default router;
