import { apiThunk } from "./thunk";
import { fetchTeams } from "./slices/teamSlice";
import { fetchTeamChannels } from "./slices/channelSlice";
import { fetchWorkspaceMembers } from "./slices/workspaceSlice";
import { fetchConversations } from "./slices/dmSlice";
import { fetchNotifications } from "./slices/notificationSlice";
import { fetchUnreadCounts } from "./slices/unreadSlice";

// Teams -> channels for teams the user belongs to, plus the member roster.
export const loadWorkspaceData = apiThunk<void, string>(
  "app/loadWorkspaceData",
  async (workspaceId, { dispatch }) => {
    const { teams } = await dispatch(fetchTeams(workspaceId)).unwrap();

    await Promise.allSettled([
      dispatch(fetchWorkspaceMembers(workspaceId)).unwrap(),
      ...teams
        .filter((team) => team.isMember)
        .map((team) => dispatch(fetchTeamChannels(team.id)).unwrap()),
    ]);
  },
);

// Data that spans workspaces: DMs, notifications, unread counters.
export const loadGlobalData = apiThunk<void>(
  "app/loadGlobalData",
  async (_arg, { dispatch }) => {
    await Promise.allSettled([
      dispatch(fetchConversations()).unwrap(),
      dispatch(fetchNotifications()).unwrap(),
      dispatch(fetchUnreadCounts()).unwrap(),
    ]);
  },
);
