import { createSlice } from "@reduxjs/toolkit";
import { api } from "@/lib/api";
import type { Team, TeamMember, TeamRole } from "@/types";
import { apiThunk } from "../thunk";
import { userUpdated } from "../actions";

type LoadStatus = "idle" | "loading" | "ready" | "error";

interface TeamState {
  byWorkspace: Record<string, Team[]>;
  status: Record<string, LoadStatus>;
  members: Record<string, TeamMember[]>;
  membersStatus: Record<string, LoadStatus>;
}

const initialState: TeamState = {
  byWorkspace: {},
  status: {},
  members: {},
  membersStatus: {},
};

export const fetchTeams = apiThunk<
  { workspaceId: string; teams: Team[] },
  string
>("teams/fetch", async (workspaceId) => ({
  workspaceId,
  teams: await api<Team[]>(`/workspaces/${workspaceId}/teams`),
}));

export const createTeam = apiThunk<
  { workspaceId: string; teamId: string },
  { workspaceId: string; name: string; description?: string }
>("teams/create", async ({ workspaceId, ...body }, { dispatch }) => {
  const created = await api<{ id: string }>(`/workspaces/${workspaceId}/teams`, {
    method: "POST",
    body,
  });

  // Refetch so the new team carries isMember/myRole.
  await dispatch(fetchTeams(workspaceId)).unwrap();

  return { workspaceId, teamId: created.id };
});

export const updateTeam = apiThunk<
  { workspaceId: string; teamId: string; name?: string; description?: string },
  { workspaceId: string; teamId: string; name?: string; description?: string }
>("teams/update", async ({ workspaceId, teamId, ...body }) => {
  await api(`/teams/${teamId}`, { method: "PATCH", body });
  return { workspaceId, teamId, ...body };
});

export const deleteTeam = apiThunk<
  { workspaceId: string; teamId: string },
  { workspaceId: string; teamId: string }
>("teams/delete", async ({ workspaceId, teamId }) => {
  await api(`/teams/${teamId}`, { method: "DELETE" });
  return { workspaceId, teamId };
});

export const fetchTeamMembers = apiThunk<
  { teamId: string; members: TeamMember[] },
  string
>("teams/fetchMembers", async (teamId) => ({
  teamId,
  members: await api<TeamMember[]>(`/teams/${teamId}/members`),
}));

export const addTeamMember = apiThunk<
  { teamId: string; members: TeamMember[] },
  { teamId: string; workspaceId: string; userId: string; role: TeamRole }
>("teams/addMember", async ({ teamId, workspaceId, userId, role }, { dispatch }) => {
  await api(`/teams/${teamId}/members`, { method: "POST", body: { userId, role } });

  const [members] = await Promise.all([
    api<TeamMember[]>(`/teams/${teamId}/members`),
    // The signed-in user may have just been added; refresh isMember/myRole.
    dispatch(fetchTeams(workspaceId)).unwrap(),
  ]);

  return { teamId, members };
});

export const updateTeamMemberRole = apiThunk<
  { teamId: string; userId: string; role: TeamRole },
  { teamId: string; userId: string; role: TeamRole }
>("teams/updateMemberRole", async ({ teamId, userId, role }) => {
  await api(`/teams/${teamId}/members/${userId}`, { method: "PATCH", body: { role } });
  return { teamId, userId, role };
});

export const removeTeamMember = apiThunk<
  { teamId: string; userId: string },
  { teamId: string; userId: string }
>("teams/removeMember", async ({ teamId, userId }) => {
  await api(`/teams/${teamId}/members/${userId}`, { method: "DELETE" });
  return { teamId, userId };
});

const teamSlice = createSlice({
  name: "teams",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTeams.pending, (state, { meta }) => {
        if (!state.byWorkspace[meta.arg]) state.status[meta.arg] = "loading";
      })
      .addCase(fetchTeams.fulfilled, (state, { payload }) => {
        state.byWorkspace[payload.workspaceId] = payload.teams;
        state.status[payload.workspaceId] = "ready";
      })
      .addCase(fetchTeams.rejected, (state, { meta }) => {
        state.status[meta.arg] = "error";
      })
      .addCase(updateTeam.fulfilled, (state, { payload }) => {
        const team = state.byWorkspace[payload.workspaceId]?.find(
          (item) => item.id === payload.teamId,
        );
        if (!team) return;
        if (payload.name !== undefined) team.name = payload.name;
        if (payload.description !== undefined) team.description = payload.description;
      })
      .addCase(deleteTeam.fulfilled, (state, { payload }) => {
        state.byWorkspace[payload.workspaceId] = (
          state.byWorkspace[payload.workspaceId] ?? []
        ).filter((item) => item.id !== payload.teamId);
        delete state.members[payload.teamId];
      })
      .addCase(fetchTeamMembers.pending, (state, { meta }) => {
        if (!state.members[meta.arg]) state.membersStatus[meta.arg] = "loading";
      })
      .addCase(fetchTeamMembers.fulfilled, (state, { payload }) => {
        state.members[payload.teamId] = payload.members;
        state.membersStatus[payload.teamId] = "ready";
      })
      .addCase(fetchTeamMembers.rejected, (state, { meta }) => {
        state.membersStatus[meta.arg] = "error";
      })
      .addCase(addTeamMember.fulfilled, (state, { payload }) => {
        state.members[payload.teamId] = payload.members;
      })
      .addCase(updateTeamMemberRole.fulfilled, (state, { payload }) => {
        const member = state.members[payload.teamId]?.find(
          (item) => item.userId === payload.userId,
        );
        if (member) member.teamRole = payload.role;
      })
      .addCase(userUpdated, (state, { payload }) => {
        for (const members of Object.values(state.members)) {
          for (const member of members) {
            if (member.userId === payload.id) {
              member.name = payload.name;
              member.avatar = payload.avatar ?? undefined;
            }
          }
        }
      })
      .addCase(removeTeamMember.fulfilled, (state, { payload }) => {
        state.members[payload.teamId] = (state.members[payload.teamId] ?? []).filter(
          (item) => item.userId !== payload.userId,
        );
      });
  },
});

export default teamSlice.reducer;
