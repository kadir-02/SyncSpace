import { Router } from "express";
import { searchUsersController } from "../controllers/user.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

const router = Router();

router.use(authMiddleware);

router.get("/search", asyncHandler(searchUsersController));

export default router;
