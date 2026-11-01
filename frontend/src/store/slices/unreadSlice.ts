import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { api } from "@/lib/api";
import type { UnreadCount } from "@/types";
import { apiThunk } from "../thunk";
import { markChannelRead } from "./messageSlice";
import { fetchNotifications, markNotificationRead } from "./notificationSlice";

interface UnreadState {
  // channelId -> unread message count
  channels: Record<string, number>;
  // conversationId -> ids of unread direct_message notifications
  dms: Record<string, string[]>;
}

const initialState: UnreadState = { channels: {}, dms: {} };

export const fetchUnreadCounts = apiThunk<UnreadCount[]>("unread/fetch", () =>
  api<UnreadCount[]>("/unread-counts"),
);

// Clears a DM's unread notifications on the server, one per notification.
export const markDmRead = apiThunk<
  string,
  { conversationId: string; notificationIds: string[] }
>("unread/markDmRead", async ({ conversationId, notificationIds }, { dispatch }) => {
  await Promise.allSettled(
    notificationIds.map((id) => dispatch(markNotificationRead(id)).unwrap()),
  );
  return conversationId;
});

const unreadSlice = createSlice({
  name: "unread",
  initialState,
  reducers: {
    channelUnreadIncremented(state, action: PayloadAction<string>) {
      state.channels[action.payload] = (state.channels[action.payload] ?? 0) + 1;
    },
    channelUnreadCleared(state, action: PayloadAction<string>) {
      state.channels[action.payload] = 0;
    },
    dmUnreadAdded(
      state,
      action: PayloadAction<{ conversationId: string; notificationId: string }>,
    ) {
      const list = (state.dms[action.payload.conversationId] ??= []);
      if (!list.includes(action.payload.notificationId)) {
        list.push(action.payload.notificationId);
      }
    },
    dmUnreadCleared(state, action: PayloadAction<string>) {
      delete state.dms[action.payload];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUnreadCounts.fulfilled, (state, { payload }) => {
        state.channels = Object.fromEntries(
          payload.map((item) => [item.channelId, item.unreadCount]),
        );
      })
      .addCase(markChannelRead.fulfilled, (state, { payload }) => {
        state.channels[payload.channelId] = 0;
      })
      .addCase(markDmRead.fulfilled, (state, { payload }) => {
        delete state.dms[payload];
      })
      // The notification feed is the source of truth for unread DMs.
      .addCase(fetchNotifications.fulfilled, (state, { payload }) => {
        state.dms = {};

        for (const notification of payload) {
          if (
            notification.type === "direct_message" &&
            !notification.isRead &&
            notification.resourceId
          ) {
            (state.dms[notification.resourceId] ??= []).push(notification.id);
          }
        }
      });
  },
});

export const {
  channelUnreadIncremented,
  channelUnreadCleared,
  dmUnreadAdded,
  dmUnreadCleared,
} = unreadSlice.actions;
export default unreadSlice.reducer;
