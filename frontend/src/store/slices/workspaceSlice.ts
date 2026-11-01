import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { api } from "@/lib/api";
import type { Workspace, WorkspaceMember, WorkspaceRole } from "@/types";
import { apiThunk } from "../thunk";

type LoadStatus = "idle" | "loading" | "ready" | "error";

interface WorkspaceState {
  items: Workspace[];
  status: LoadStatus;
  currentId: string | null;
  members: Record<string, WorkspaceMember[]>;
  membersStatus: Record<string, LoadStatus>;
}

const initialState: WorkspaceState = {
  items: [],
  status: "idle",
  currentId: null,
  members: {},
  membersStatus: {},
};

export const fetchWorkspaces = apiThunk<Workspace[]>("workspaces/fetch", () =>
  api<Workspace[]>("/workspaces"),
);

export const createWorkspace = apiThunk<Workspace, { name: string }>(
  "workspaces/create",
  async ({ name }) => {
    const created = await api<{ id: string; name: string; slug: string }>(
      "/workspaces",
      { method: "POST", body: { name } },
    );

    return { ...created, role: "owner" as WorkspaceRole };
  },
);

export const fetchWorkspaceMembers = apiThunk<
  { workspaceId: string; members: WorkspaceMember[] },
  string
>("workspaces/fetchMembers", async (workspaceId) => ({
  workspaceId,
  members: await api<WorkspaceMember[]>(`/workspaces/${workspaceId}/members`),
}));

export const addWorkspaceMember = apiThunk<
  { workspaceId: string; members: WorkspaceMember[] },
  { workspaceId: string; userId?: string; email?: string; role: "admin" | "member" }
>("workspaces/addMember", async ({ workspaceId, ...body }) => {
  await api(`/workspaces/${workspaceId}/members`, { method: "POST", body });

  return {
    workspaceId,
    members: await api<WorkspaceMember[]>(`/workspaces/${workspaceId}/members`),
  };
});

export const updateWorkspaceMemberRole = apiThunk<
  { workspaceId: string; userId: string; role: WorkspaceRole },
  { workspaceId: string; userId: string; role: "admin" | "member" }
>("workspaces/updateMemberRole", async ({ workspaceId, userId, role }) => {
  await api(`/workspaces/${workspaceId}/members/${userId}`, {
    method: "PATCH",
    body: { role },
  });

  return { workspaceId, userId, role };
});

export const removeWorkspaceMember = apiThunk<
  { workspaceId: string; userId: string },
  { workspaceId: string; userId: string }
>("workspaces/removeMember", async ({ workspaceId, userId }) => {
  await api(`/workspaces/${workspaceId}/members/${userId}`, { method: "DELETE" });
  return { workspaceId, userId };
});

export const leaveWorkspace = apiThunk<string, string>(
  "workspaces/leave",
  async (workspaceId) => {
    await api(`/workspaces/${workspaceId}/leave`, { method: "DELETE" });
    return workspaceId;
  },
);

export const deleteWorkspace = apiThunk<string, string>(
  "workspaces/delete",
  async (workspaceId) => {
    await api(`/workspaces/${workspaceId}`, { method: "DELETE" });
    return workspaceId;
  },
);

export const transferOwnership = apiThunk<
  void,
  { workspaceId: string; userId: string }
>("workspaces/transferOwnership", async ({ workspaceId, userId }, { dispatch }) => {
  await api(`/workspaces/${workspaceId}/transfer-ownership`, {
    method: "PATCH",
    body: { userId },
  });

  await Promise.all([
    dispatch(fetchWorkspaces()).unwrap(),
    dispatch(fetchWorkspaceMembers(workspaceId)).unwrap(),
  ]);
});

const removeWorkspace = (state: WorkspaceState, workspaceId: string) => {
  state.items = state.items.filter((item) => item.id !== workspaceId);
  delete state.members[workspaceId];
  if (state.currentId === workspaceId) state.currentId = null;
};

const workspaceSlice = createSlice({
  name: "workspaces",
  initialState,
  reducers: {
    setCurrentWorkspace(state, action: PayloadAction<string | null>) {
      state.currentId = action.payload;
    },
    // Fired from the socket when a workspace is deleted elsewhere.
    workspaceRemoved(state, action: PayloadAction<string>) {
      removeWorkspace(state, action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWorkspaces.pending, (state) => {
        if (state.status === "idle") state.status = "loading";
      })
      .addCase(fetchWorkspaces.fulfilled, (state, { payload }) => {
        state.items = payload;
        state.status = "ready";
      })
      .addCase(fetchWorkspaces.rejected, (state) => {
        state.status = "error";
      })
      .addCase(createWorkspace.fulfilled, (state, { payload }) => {
        state.items.unshift(payload);
      })
      .addCase(fetchWorkspaceMembers.pending, (state, { meta }) => {
        if (!state.members[meta.arg]) state.membersStatus[meta.arg] = "loading";
      })
      .addCase(fetchWorkspaceMembers.fulfilled, (state, { payload }) => {
        state.members[payload.workspaceId] = payload.members;
        state.membersStatus[payload.workspaceId] = "ready";
      })
      .addCase(fetchWorkspaceMembers.rejected, (state, { meta }) => {
        state.membersStatus[meta.arg] = "error";
      })
      .addCase(addWorkspaceMember.fulfilled, (state, { payload }) => {
        state.members[payload.workspaceId] = payload.members;
      })
      .addCase(updateWorkspaceMemberRole.fulfilled, (state, { payload }) => {
        const member = state.members[payload.workspaceId]?.find(
          (item) => item.userId === payload.userId,
        );
        if (member) member.workspaceRole = payload.role;
      })
      .addCase(removeWorkspaceMember.fulfilled, (state, { payload }) => {
        state.members[payload.workspaceId] = (
          state.members[payload.workspaceId] ?? []
        ).filter((item) => item.userId !== payload.userId);
      })
      .addCase(leaveWorkspace.fulfilled, (state, { payload }) => {
        removeWorkspace(state, payload);
      })
      .addCase(deleteWorkspace.fulfilled, (state, { payload }) => {
        removeWorkspace(state, payload);
      });
  },
});

export const { setCurrentWorkspace, workspaceRemoved } = workspaceSlice.actions;
export default workspaceSlice.reducer;
