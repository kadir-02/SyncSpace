import type { Server } from "socket.io";
import type { AuthenticatedSocket } from "../middlewares/socket-auth.middleware.js";
import { Channel } from "../models/channel.model.js";
import { ChannelMember } from "../models/channel-member.model.js";
import { TeamMember } from "../models/team-member.model.js";
import { Conversation } from "../models/conversation.model.js";
import { WorkspaceMember } from "../models/workspace-member.model.js";
import { User } from "../models/user.model.js";

interface JoinChannelOptions {
  // Skip the "joined" acknowledgements (used by typing events).
  silent?: boolean;
}

/**
 * Joins the socket to a channel room after checking access.
 * Returns true when the socket is in the room afterwards.
 */
export const joinChannel = async (
  io: Server,
  socket: AuthenticatedSocket,
  channelId: string,
  options: JoinChannelOptions = {},
): Promise<boolean> => {
  if (typeof channelId !== "string" || !/^[a-f\d]{24}$/i.test(channelId)) {
    socket.emit("channel:error", {
      message: "Invalid channel ID",
    });
    return false;
  }

  const roomName = `channel:${channelId}`;

  // Access was verified when the socket joined, and removals kick the socket
  // out of the room, so typing events can skip the database round trips.
  if (options.silent && socket.rooms.has(roomName)) {
    return true;
  }

  const channel = await Channel.findById(channelId);

  if (!channel) {
    socket.emit("channel:error", {
      message: "Channel not found",
    });
    return false;
  }

  const userId = socket.user?.userId;

  if (!userId) {
    socket.emit("channel:error", {
      message: "Authentication required",
    });
    return false;
  }

  const teamMembership = await TeamMember.findOne({
    team: channel.team,
    user: userId,
  });

  if (!teamMembership) {
    socket.emit("channel:error", {
      message: "You are not a member of this team",
    });
    return false;
  }

  if (channel.type === "private") {
    const channelMembership = await ChannelMember.findOne({
      channel: channel._id,
      user: userId,
    });

    if (!channelMembership) {
      socket.emit("channel:error", {
        message: "You are not a member of this private channel",
      });
      return false;
    }
  }

  await socket.join(roomName);

  if (!options.silent) {
    socket.emit("channel:joined", {
      channelId,
      message: "Joined channel successfully",
    });

    socket.to(roomName).emit("channel:user-joined", {
      channelId,
      userId,
    });
  }

  return true;
};

export const leaveChannel = async (
  socket: AuthenticatedSocket,
  channelId: string,
): Promise<void> => {
  if (typeof channelId !== "string" || !/^[a-f\d]{24}$/i.test(channelId)) {
    socket.emit("channel:error", {
      message: "Invalid channel ID",
    });
    return;
  }

  await socket.leave(`channel:${channelId}`);

  socket.emit("channel:left", {
    channelId,
    message: "Left channel successfully",
  });
};

export const joinConversation = async (
  socket: AuthenticatedSocket,
  conversationId: string,
) => {
  const userId = socket.user?.userId;

  if (typeof conversationId !== "string" || !/^[a-f\d]{24}$/i.test(conversationId)) {
    throw new Error("Invalid conversation ID");
  }

  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: userId,
  });

  if (!conversation) {
    throw new Error("Conversation not found or access denied");
  }

  await socket.join(`dm:${conversationId}`);
};

export const leaveConversation = async (
  socket: AuthenticatedSocket,
  conversationId: string,
) => {
  await socket.leave(`dm:${conversationId}`);
};

// userId -> socket ids (a user can have several tabs/devices)
const onlineUsers = new Map<string, Set<string>>();

const workspaceRooms = (socket: AuthenticatedSocket): string[] =>
  ((socket.data.workspaceIds as string[] | undefined) ?? []).map(
    (id) => `workspace:${id}`,
  );

/**
 * Registers the socket as online. Presence is scoped to workspaces: a user is
 * only announced to (and sees) people who share at least one workspace.
 */
export const registerUserSocket = async (
  _io: Server,
  socket: AuthenticatedSocket,
) => {
  const userId = socket.user?.userId;

  if (!userId) {
    console.error("User ID is missing in the authenticated socket.");
    return;
  }

  const [memberships, user] = await Promise.all([
    WorkspaceMember.find({ user: userId }).select("workspace"),
    User.findById(userId).select("name"),
  ]);

  // The client may have disconnected while we were querying.
  if (!socket.connected) return;

  const workspaceIds = memberships.map((m) => m.workspace.toString());

  socket.data.workspaceIds = workspaceIds;
  socket.data.name = user?.name;

  const rooms = workspaceIds.map((id) => `workspace:${id}`);

  if (rooms.length > 0) {
    await socket.join(rooms);
  }

  let socketIds = onlineUsers.get(userId);
  const isFirstConnection = !socketIds || socketIds.size === 0;

  if (!socketIds) {
    socketIds = new Set<string>();
    onlineUsers.set(userId, socketIds);
  }

  socketIds.add(socket.id);

  // An empty room list would broadcast to everyone, so guard it.
  if (isFirstConnection && rooms.length > 0) {
    socket.to(rooms).emit("presence:online", { userId });
  }

  // Tell this socket who is online among the people it shares workspaces with.
  let visibleUserIds: string[] = [];

  if (workspaceIds.length > 0) {
    const peers = await WorkspaceMember.find({
      workspace: { $in: workspaceIds },
      user: { $in: Array.from(onlineUsers.keys()) },
    }).distinct("user");

    visibleUserIds = peers.map((id) => id.toString());
  }

  if (!visibleUserIds.includes(userId)) visibleUserIds.push(userId);

  socket.emit("presence:online-users", { userIds: visibleUserIds });
};

export const unregisterUserSocket = (
  io: Server,
  socket: AuthenticatedSocket,
) => {
  const userId = socket.user?.userId;

  if (!userId) return;

  const socketIds = onlineUsers.get(userId);

  if (!socketIds) return;

  socketIds.delete(socket.id);

  // Keep the user online if another tab/device is connected.
  if (socketIds.size === 0) {
    onlineUsers.delete(userId);

    const rooms = workspaceRooms(socket);

    if (rooms.length > 0) {
      io.to(rooms).emit("presence:offline", { userId });
    }
  }
};
