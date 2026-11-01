import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { api } from "@/lib/api";
import type { AppNotification } from "@/types";
import { apiThunk } from "../thunk";

interface NotificationState {
  // Activity notifications only (invites, system). Chat message notifications
  // are folded into the unread counters instead of listed.
  items: AppNotification[];
  status: "idle" | "loading" | "ready" | "error";
}

const initialState: NotificationState = { items: [], status: "idle" };

export const isChatNotification = (notification: AppNotification) =>
  notification.type === "message" || notification.type === "direct_message";

export const fetchNotifications = apiThunk<AppNotification[]>(
  "notifications/fetch",
  async () => {
    const result = await api<{ notifications: AppNotification[] }>("/notifications", {
      query: { limit: 100 },
    });

    return result.notifications;
  },
);

export const markNotificationRead = apiThunk<string, string>(
  "notifications/markRead",
  async (notificationId) => {
    await api(`/notifications/${notificationId}/read`, { method: "PATCH" });
    return notificationId;
  },
);

export const markAllNotificationsRead = apiThunk<void>(
  "notifications/markAllRead",
  async () => {
    await api("/notifications/read-all", { method: "PATCH" });
  },
);

export const deleteNotification = apiThunk<string, string>(
  "notifications/delete",
  async (notificationId) => {
    await api(`/notifications/${notificationId}`, { method: "DELETE" });
    return notificationId;
  },
);

const notificationSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    notificationReceived(state, action: PayloadAction<AppNotification>) {
      if (!state.items.some((item) => item.id === action.payload.id)) {
        state.items.unshift(action.payload);
      }
    },
    notificationMarkedRead(state, action: PayloadAction<string>) {
      const item = state.items.find((entry) => entry.id === action.payload);
      if (item) item.isRead = true;
    },
    allNotificationsMarkedRead(state) {
      state.items.forEach((item) => {
        item.isRead = true;
      });
    },
    notificationRemoved(state, action: PayloadAction<string>) {
      state.items = state.items.filter((item) => item.id !== action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        if (state.status === "idle") state.status = "loading";
      })
      .addCase(fetchNotifications.fulfilled, (state, { payload }) => {
        state.items = payload.filter((item) => !isChatNotification(item));
        state.status = "ready";
      })
      .addCase(fetchNotifications.rejected, (state) => {
        state.status = "error";
      })
      .addCase(markNotificationRead.fulfilled, (state, { payload }) => {
        const item = state.items.find((entry) => entry.id === payload);
        if (item) item.isRead = true;
      })
      .addCase(markAllNotificationsRead.fulfilled, (state) => {
        state.items.forEach((item) => {
          item.isRead = true;
        });
      })
      .addCase(deleteNotification.fulfilled, (state, { payload }) => {
        state.items = state.items.filter((item) => item.id !== payload);
      });
  },
});

export const {
  notificationReceived,
  notificationMarkedRead,
  allNotificationsMarkedRead,
  notificationRemoved,
} = notificationSlice.actions;
export default notificationSlice.reducer;
