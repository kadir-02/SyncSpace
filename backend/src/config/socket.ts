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
  registerUserSocket,
  unregisterUserSocket,
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
    registerUserSocket(io, authenticatedSocket);
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

    authenticatedSocket.on(
      "typing:start",
      async (data: { channelId: string }) => {
        try {
          await joinChannel(io, authenticatedSocket, data?.channelId);

          authenticatedSocket
            .to(`channel:${data.channelId}`)
            .emit("typing:update", {
              userId: authenticatedSocket.user?.userId,
              channelId: data.channelId,
              isTyping: true,
            });
        } catch (error) {
          console.error("Typing start error:", error);
        }
      },
    );

    authenticatedSocket.on("typing:stop", (data: { channelId: string }) => {
      authenticatedSocket
        .to(`channel:${data.channelId}`)
        .emit("typing:update", {
          userId: authenticatedSocket.user?.userId,
          channelId: data.channelId,
          isTyping: false,
        });
    });

    authenticatedSocket.on(
      "dm:typing:start",
      async (data: { conversationId: string }) => {
        try {
          await joinConversation(authenticatedSocket, data?.conversationId);

          authenticatedSocket
            .to(`dm:${data.conversationId}`)
            .emit("dm:typing:update", {
              userId: authenticatedSocket.user?.userId,
              conversationId: data.conversationId,
              isTyping: true,
            });
        } catch (error) {
          console.error("DM typing start error:", error);
        }
      },
    );

    authenticatedSocket.on(
      "dm:typing:stop",
      (data: { conversationId: string }) => {
        authenticatedSocket
          .to(`dm:${data.conversationId}`)
          .emit("dm:typing:update", {
            userId: authenticatedSocket.user?.userId,
            conversationId: data.conversationId,
            isTyping: false,
          });
      },
    );

    authenticatedSocket.on("disconnect", () => {
      unregisterUserSocket(io, authenticatedSocket);
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
