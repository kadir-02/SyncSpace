import type { Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { AppError } from "../utils/app-error.js";

interface JwtPayload {
  userId: string;
  role: string;
}

export interface AuthenticatedSocket extends Socket {
  user?: {
    userId: string;
    role: string;
  };
}

export const socketAuthMiddleware = (
  socket: AuthenticatedSocket,
  next: (err?: Error) => void,
) => {
  try {
    const token = socket.handshake.auth?.token;

    if (!token || typeof token !== "string") {
      return next(new Error("Authentication token required"));
    }

    const secret = process.env.JWT_SECRET;

    if (!secret) {
      return next(new Error("JWT_SECRET is not configured"));
    }

    const decoded = jwt.verify(token, secret) as JwtPayload;

    if (!decoded.userId || !decoded.role) {
      return next(new Error("Invalid authentication token"));
    }

    socket.user = {
      userId: decoded.userId,
      role: decoded.role,
    };

    next();
  } catch {
    next(new Error("Invalid or expired authentication token"));
  }
};
