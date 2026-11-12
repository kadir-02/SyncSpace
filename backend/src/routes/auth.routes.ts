import { Router } from "express";
import { registerUser, login, forgotPassword } from "../controllers/auth.controller.js";
import { asyncHandler } from "../utils/async-handler.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { getMe } from "../controllers/user.controller.js";

const router = Router();

router.post("/register", asyncHandler(registerUser));
router.post("/login", asyncHandler(login));
router.post("/forgot-password", asyncHandler(forgotPassword));
router.get(
  "/me",
  authMiddleware,
  asyncHandler(getMe)
);

export default router;