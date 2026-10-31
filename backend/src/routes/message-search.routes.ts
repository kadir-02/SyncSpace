import { Router } from "express";
import { searchMessagesController } from "../controllers/message-search.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

const router = Router();

router.use(authMiddleware);

router.get("/", asyncHandler(searchMessagesController));

export default router;
