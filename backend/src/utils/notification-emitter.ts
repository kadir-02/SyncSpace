import { getIO } from "../config/socket.js";

export const emitNotification = (userId: string, notification: unknown) => {
  getIO().to(`user:${userId}`).emit("notification:new", notification);
};

export const emitNotificationRead = (
  userId: string,
  notificationId: string,
) => {
  getIO().to(`user:${userId}`).emit("notification:read", {
    notificationId,
  });
};

export const emitNotificationDeleted = (
  userId: string,
  notificationId: string,
) => {
  getIO().to(`user:${userId}`).emit("notification:deleted", {
    notificationId,
  });
};
