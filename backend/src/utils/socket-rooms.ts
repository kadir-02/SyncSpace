import { getIO } from "../config/socket.js";

/**
 * Helpers to keep live socket rooms in sync with database memberships.
 * All of them are no-ops when the socket server isn't running (scripts, tests).
 */

export const addUserToRooms = (userId: string, rooms: string[]) => {
  if (rooms.length === 0) return;

  try {
    getIO().in(`user:${userId}`).socketsJoin(rooms);
  } catch {
    // Socket server not initialised.
  }
};

export const removeUserFromRooms = (userId: string, rooms: string[]) => {
  if (rooms.length === 0) return;

  try {
    getIO().in(`user:${userId}`).socketsLeave(rooms);
  } catch {
    // Socket server not initialised.
  }
};

export const closeChannelRooms = (channelIds: string[]) => {
  if (channelIds.length === 0) return;

  try {
    const io = getIO();
    const rooms = channelIds.map((id) => `channel:${id}`);

    for (const channelId of channelIds) {
      io.to(`channel:${channelId}`).emit("channel:deleted", { channelId });
    }

    io.in(rooms).socketsLeave(rooms);
  } catch {
    // Socket server not initialised.
  }
};

export const closeWorkspaceRoom = (workspaceId: string) => {
  try {
    const io = getIO();
    const room = `workspace:${workspaceId}`;

    io.to(room).emit("workspace:deleted", { workspaceId });
    io.in(room).socketsLeave(room);
  } catch {
    // Socket server not initialised.
  }
};
