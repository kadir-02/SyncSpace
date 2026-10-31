import { Notification } from "../models/notification.model.js";
import { AppError } from "../utils/app-error.js";
import type { NotificationType } from "../models/notification.model.js";

export const getNotifications = async (
  userId: string,
  page = 1,
  limit = 20,
  unreadOnly = false,
) => {
  const filter = {
    recipient: userId,
    ...(unreadOnly ? { isRead: false } : {}),
  };

  const skip = (page - 1) * limit;

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter)
      .populate("sender", "name email avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Notification.countDocuments(filter),
    Notification.countDocuments({
      recipient: userId,
      isRead: false,
    }),
  ]);

  return {
    notifications,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
    unreadCount,
  };
};

export const markNotificationAsRead = async (
  notificationId: string,
  userId: string,
) => {
  const notification = await Notification.findOne({
    _id: notificationId,
    recipient: userId,
  });

  if (!notification) {
    throw new AppError("Notification not found", 404);
  }

  if (!notification.isRead) {
    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();
  }

  return notification;
};

export const markAllNotificationsAsRead = async (userId: string) => {
  const result = await Notification.updateMany(
    { recipient: userId, isRead: false },
    { $set: { isRead: true, readAt: new Date() } },
  );

  return { modifiedCount: result.modifiedCount };
};

export const deleteNotification = async (
  notificationId: string,
  userId: string,
) => {
  const notification = await Notification.findOne({
    _id: notificationId,
    recipient: userId,
  });

  if (!notification) {
    throw new AppError("Notification not found", 404);
  }

  await notification.deleteOne();

  return { notificationId };
};


export const createNotification = async (data: {
  recipient: string;
  sender?: string;
  type: NotificationType;
  title: string;
  message: string;
  resourceId?: string;
  resourceType?: string;
}) => {
  return Notification.create({
    ...data,
    isRead: false,
  });
};