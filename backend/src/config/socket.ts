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

const isString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

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

    // Personal room used for notifications and cross-room events.
    authenticatedSocket.join(`user:${userId}`);

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
        const channelId = data?.channelId;

        if (!isString(channelId)) return;

        try {
          const inRoom = await joinChannel(io, authenticatedSocket, channelId, {
            silent: true,
          });

          if (!inRoom) return;

          authenticatedSocket.to(`channel:${channelId}`).emit("typing:update", {
            userId,
            name: authenticatedSocket.data.name,
            channelId,
            isTyping: true,
          });
        } catch (error) {
          console.error("Typing start error:", error);
        }
      },
    );

    authenticatedSocket.on("typing:stop", (data: { channelId: string }) => {
      const channelId = data?.channelId;
      const room = `channel:${channelId}`;

      // Only members who are actually in the room may emit to it.
      if (!isString(channelId) || !authenticatedSocket.rooms.has(room)) return;

      authenticatedSocket.to(room).emit("typing:update", {
        userId,
        name: authenticatedSocket.data.name,
        channelId,
        isTyping: false,
      });
    });

    authenticatedSocket.on(
      "dm:typing:start",
      async (data: { conversationId: string }) => {
        const conversationId = data?.conversationId;

        if (!isString(conversationId)) return;

        try {
          if (!authenticatedSocket.rooms.has(`dm:${conversationId}`)) {
            await joinConversation(authenticatedSocket, conversationId);
          }

          authenticatedSocket
            .to(`dm:${conversationId}`)
            .emit("dm:typing:update", {
              userId,
              name: authenticatedSocket.data.name,
              conversationId,
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
        const conversationId = data?.conversationId;
        const room = `dm:${conversationId}`;

        if (
          !isString(conversationId) ||
          !authenticatedSocket.rooms.has(room)
        ) {
          return;
        }

        authenticatedSocket.to(room).emit("dm:typing:update", {
          userId,
          name: authenticatedSocket.data.name,
          conversationId,
          isTyping: false,
        });
      },
    );

    authenticatedSocket.on("disconnect", () => {
      unregisterUserSocket(io, authenticatedSocket);
    });

    // Registered last: it queries the database, so don't block the handlers above.
    registerUserSocket(io, authenticatedSocket).catch((error) => {
      console.error("Presence registration error:", error);
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
