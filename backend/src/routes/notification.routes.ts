import { Router } from "express";
import {
  getNotificationsController,
  markNotificationAsReadController,
  markAllNotificationsAsReadController,
  deleteNotificationController,
} from "../controllers/notification.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

const router = Router();

router.use(authMiddleware);

router.get("/", asyncHandler(getNotificationsController));

router.patch("/read-all", asyncHandler(markAllNotificationsAsReadController));

router.patch(
  "/:notificationId/read",
  asyncHandler(markNotificationAsReadController),
);

router.delete("/:notificationId", asyncHandler(deleteNotificationController));

export default router;
