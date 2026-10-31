import { Router } from "express";
import { getUnreadCountsController } from "../controllers/unread-count.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

const router = Router();

router.use(authMiddleware);

router.get("/", asyncHandler(getUnreadCountsController));

export default router;
