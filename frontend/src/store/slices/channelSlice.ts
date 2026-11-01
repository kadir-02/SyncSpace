import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { api } from "@/lib/api";
import type { Channel, ChannelMember, ChannelType } from "@/types";
import { apiThunk } from "../thunk";

interface ChannelState {
  byTeam: Record<string, Channel[]>;
  members: Record<string, ChannelMember[]>;
}

const initialState: ChannelState = { byTeam: {}, members: {} };

export const fetchTeamChannels = apiThunk<
  { teamId: string; channels: Channel[] },
  string
>("channels/fetchForTeam", async (teamId) => ({
  teamId,
  channels: await api<Channel[]>(`/channels/teams/${teamId}/channels`),
}));

export const createChannel = apiThunk<
  Channel,
  { teamId: string; name: string; description?: string; type: ChannelType }
>("channels/create", async ({ teamId, ...body }, { dispatch }) => {
  const created = await api<Channel>(`/channels/teams/${teamId}/channels`, {
    method: "POST",
    body,
  });

  await dispatch(fetchTeamChannels(teamId)).unwrap();

  return created;
});

export const updateChannel = apiThunk<
  Channel,
  {
    channelId: string;
    teamId: string;
    name?: string;
    description?: string;
    type?: ChannelType;
  }
>("channels/update", async ({ channelId, teamId, ...body }, { dispatch }) => {
  const updated = await api<Channel>(`/channels/${channelId}`, {
    method: "PATCH",
    body,
  });

  // Changing visibility changes who can see the channel; resync the team list.
  await dispatch(fetchTeamChannels(teamId)).unwrap();

  return updated;
});

export const deleteChannel = apiThunk<string, { channelId: string }>(
  "channels/delete",
  async ({ channelId }) => {
    await api(`/channels/${channelId}`, { method: "DELETE" });
    return channelId;
  },
);

export const fetchChannelMembers = apiThunk<
  { channelId: string; members: ChannelMember[] },
  string
>("channels/fetchMembers", async (channelId) => ({
  channelId,
  members: await api<ChannelMember[]>(`/channels/${channelId}/members`),
}));

export const addChannelMember = apiThunk<
  { channelId: string; members: ChannelMember[] },
  { channelId: string; userId: string }
>("channels/addMember", async ({ channelId, userId }) => {
  await api(`/channels/${channelId}/members`, { method: "POST", body: { userId } });

  return {
    channelId,
    members: await api<ChannelMember[]>(`/channels/${channelId}/members`),
  };
});

export const removeChannelMember = apiThunk<
  { channelId: string; userId: string },
  { channelId: string; userId: string }
>("channels/removeMember", async ({ channelId, userId }) => {
  await api(`/channels/${channelId}/members/${userId}`, { method: "DELETE" });
  return { channelId, userId };
});

const dropChannel = (state: ChannelState, channelId: string) => {
  for (const teamId of Object.keys(state.byTeam)) {
    state.byTeam[teamId] = state.byTeam[teamId].filter((item) => item.id !== channelId);
  }
  delete state.members[channelId];
};

const channelSlice = createSlice({
  name: "channels",
  initialState,
  reducers: {
    // Fired from the socket when a channel is deleted by someone else.
    channelRemoved(state, action: PayloadAction<string>) {
      dropChannel(state, action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTeamChannels.fulfilled, (state, { payload }) => {
        state.byTeam[payload.teamId] = payload.channels;
      })
      .addCase(deleteChannel.fulfilled, (state, { payload }) => {
        dropChannel(state, payload);
      })
      .addCase(fetchChannelMembers.fulfilled, (state, { payload }) => {
        state.members[payload.channelId] = payload.members;
      })
      .addCase(addChannelMember.fulfilled, (state, { payload }) => {
        state.members[payload.channelId] = payload.members;
      })
      .addCase(removeChannelMember.fulfilled, (state, { payload }) => {
        state.members[payload.channelId] = (state.members[payload.channelId] ?? []).filter(
          (item) => item.user.id !== payload.userId,
        );
      });
  },
});

export const { channelRemoved } = channelSlice.actions;
export default channelSlice.reducer;
