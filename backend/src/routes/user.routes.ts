import { Router } from "express";
import {
  changePasswordController,
  removeAvatarController,
  searchUsersController,
  updateProfileController,
  uploadAvatarController,
} from "../controllers/user.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { avatarUpload } from "../middlewares/avatar-upload.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

const router = Router();

router.use(authMiddleware);

router.get("/search", asyncHandler(searchUsersController));

// Current user's profile
router.patch("/me", asyncHandler(updateProfileController));
router.post(
  "/me/avatar",
  avatarUpload.single("avatar"),
  asyncHandler(uploadAvatarController),
);
router.delete("/me/avatar", asyncHandler(removeAvatarController));
router.patch("/me/password", asyncHandler(changePasswordController));

export default router;
