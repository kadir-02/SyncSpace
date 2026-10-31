
import type { Request, Response } from "express";
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from "../services/notification.service.js";
import {
  notificationIdSchema,
  listNotificationsSchema,
} from "../validations/notification.validation.js";
import { sendSuccess } from "../utils/api-response.js";

export const getNotificationsController = async (
  req: Request,
  res: Response,
) => {
  const { page, limit, unreadOnly } = listNotificationsSchema.parse(
    req.query,
  );

  const result = await getNotifications(
    req.user!.userId,
    page,
    limit,
    unreadOnly,
  );

  return sendSuccess(
    res,
    200,
    "Notifications fetched successfully",
    result,
  );
};

export const markNotificationAsReadController = async (
  req: Request<{ notificationId: string }>,
  res: Response,
) => {
  const { notificationId } = notificationIdSchema.parse(req.params);

  const notification = await markNotificationAsRead(
    notificationId,
    req.user!.userId,
  );

  return sendSuccess(
    res,
    200,
    "Notification marked as read",
    notification,
  );
};

export const markAllNotificationsAsReadController = async (
  req: Request,
  res: Response,
) => {
  const result = await markAllNotificationsAsRead(req.user!.userId);

  return sendSuccess(
    res,
    200,
    "All notifications marked as read",
    result,
  );
};

export const deleteNotificationController = async (
  req: Request<{ notificationId: string }>,
  res: Response,
) => {
  const { notificationId } = notificationIdSchema.parse(req.params);

  const result = await deleteNotification(
    notificationId,
    req.user!.userId,
  );

  return sendSuccess(
    res,
    200,
    "Notification deleted successfully",
    result,
  );
};
