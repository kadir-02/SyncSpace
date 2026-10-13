import { Server } from "socket.io";
import type { Server as HttpServer } from "http";
import {
  socketAuthMiddleware,
  type AuthenticatedSocket,
} from "../middlewares/socket-auth.middleware.js";

let io: Server;

export const initializeSocket = (httpServer: HttpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.use(socketAuthMiddleware);

  io.on("connection", (socket) => {
    const authenticatedSocket = socket as AuthenticatedSocket;

    if (!authenticatedSocket.user) {
      authenticatedSocket.disconnect(true);
      return;
    }

    console.log(
      `Authenticated socket connected: ${authenticatedSocket.id}, user: ${authenticatedSocket.user.userId}`,
    );

    authenticatedSocket.on("disconnect", () => {
      console.log(`Socket disconnected: ${authenticatedSocket.id}`);
    });
  });

  return io;
};

export const getIO = (): Server => {
  if (!io) {
    throw new Error("Socket.IO has not been initialized");
  }

  return io;
};
