import { Server } from "socket.io";
import type { Server as HttpServer } from "http";
import {
  socketAuthMiddleware,
  type AuthenticatedSocket,
} from "../middlewares/socket-auth.middleware.js";
import {
  joinChannel,
  leaveChannel,
  joinConversation,
  leaveConversation,
} from "../services/socket.service.js";

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
    const userId = authenticatedSocket.user.userId;

    authenticatedSocket.join(`user:${userId}`);

    console.log(`User joined notification room: user:${userId}`);

    console.log(
      `Authenticated socket connected: ${authenticatedSocket.id}, user: ${authenticatedSocket.user.userId}`,
    );

    authenticatedSocket.on(
      "channel:join",
      async (data: { channelId: string }) => {
        try {
          await joinChannel(io, authenticatedSocket, data?.channelId);
        } catch (error) {
          console.error("Channel join error:", error);
          authenticatedSocket.emit("channel:error", {
            message: "Failed to join channel",
          });
        }
      },
    );

    authenticatedSocket.on(
      "channel:leave",
      async (data: { channelId: string }) => {
        try {
          await leaveChannel(authenticatedSocket, data?.channelId);
        } catch (error) {
          console.error("Channel leave error:", error);
          authenticatedSocket.emit("channel:error", {
            message: "Failed to leave channel",
          });
        }
      },
    );

    authenticatedSocket.on(
      "dm:join",
      async (data: { conversationId: string }) => {
        try {
          await joinConversation(authenticatedSocket, data?.conversationId);
        } catch (error) {
          console.error("DM join error:", error);

          authenticatedSocket.emit("dm:error", {
            message: "Failed to join conversation",
          });
        }
      },
    );

    authenticatedSocket.on(
      "dm:leave",
      async (data: { conversationId: string }) => {
        try {
          await leaveConversation(authenticatedSocket, data?.conversationId);
        } catch (error) {
          console.error("DM leave error:", error);

          authenticatedSocket.emit("dm:error", {
            message: "Failed to leave conversation",
          });
        }
      },
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
