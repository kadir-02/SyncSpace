import type { Server } from "socket.io";
import type { AuthenticatedSocket } from "../middlewares/socket-auth.middleware.js";
import { Channel } from "../models/channel.model.js";
import { ChannelMember } from "../models/channel-member.model.js";
import { TeamMember } from "../models/team-member.model.js";

export const joinChannel = async (
  io: Server,
  socket: AuthenticatedSocket,
  channelId: string,
): Promise<void> => {
  if (!/^[a-f\d]{24}$/i.test(channelId)) {
    socket.emit("channel:error", {
      message: "Invalid channel ID",
    });
    return;
  }

  const channel = await Channel.findById(channelId);

  if (!channel) {
    socket.emit("channel:error", {
      message: "Channel not found",
    });
    return;
  }

  const userId = socket.user?.userId;

  if (!userId) {
    socket.emit("channel:error", {
      message: "Authentication required",
    });
    return;
  }

  const teamMembership = await TeamMember.findOne({
    team: channel.team,
    user: userId,
  });

  if (!teamMembership) {
    socket.emit("channel:error", {
      message: "You are not a member of this team",
    });
    return;
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
      return;
    }
  }

  const roomName = `channel:${channelId}`;

  await socket.join(roomName);

  socket.emit("channel:joined", {
    channelId,
    message: "Joined channel successfully",
  });

  socket.to(roomName).emit("channel:user-joined", {
    channelId,
    userId,
  });
};

export const leaveChannel = async (
  socket: AuthenticatedSocket,
  channelId: string,
): Promise<void> => {
  if (!/^[a-f\d]{24}$/i.test(channelId)) {
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
