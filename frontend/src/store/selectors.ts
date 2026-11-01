import type { RootState } from "./index";
import type { Channel, Team } from "@/types";

export const EMPTY: never[] = [];

export const selectCurrentWorkspace = (state: RootState) =>
  state.workspaces.items.find((item) => item.id === state.workspaces.currentId) ?? null;

export const selectIsWorkspaceAdmin = (state: RootState) => {
  const role = selectCurrentWorkspace(state)?.role;
  return role === "owner" || role === "admin";
};

export const selectTeams = (workspaceId: string | null) => (state: RootState): Team[] =>
  (workspaceId ? state.teams.byWorkspace[workspaceId] : undefined) ?? EMPTY;

export const selectChannelById =
  (channelId: string) =>
  (state: RootState): Channel | null => {
    for (const channels of Object.values(state.channels.byTeam)) {
      const match = channels.find((channel) => channel.id === channelId);
      if (match) return match;
    }

    return null;
  };

export const selectUnreadActivityCount = (state: RootState) =>
  state.notifications.items.filter((item) => !item.isRead).length;

export const selectTotalDmUnread = (state: RootState) =>
  Object.values(state.unread.dms).reduce((sum, ids) => sum + ids.length, 0);
