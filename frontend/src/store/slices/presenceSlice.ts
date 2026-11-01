import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface TypingEntry {
  name: string;
  expiresAt: number;
}

interface PresenceState {
  online: Record<string, true>;
  // "channel:<id>" | "dm:<id>" -> userId -> entry
  typing: Record<string, Record<string, TypingEntry>>;
}

const initialState: PresenceState = { online: {}, typing: {} };

const presenceSlice = createSlice({
  name: "presence",
  initialState,
  reducers: {
    onlineUsersSet(state, action: PayloadAction<string[]>) {
      state.online = Object.fromEntries(action.payload.map((id) => [id, true as const]));
    },
    userCameOnline(state, action: PayloadAction<string>) {
      state.online[action.payload] = true;
    },
    userWentOffline(state, action: PayloadAction<string>) {
      delete state.online[action.payload];
    },
    typingStarted(
      state,
      action: PayloadAction<{ key: string; userId: string; name: string; expiresAt: number }>,
    ) {
      const { key, userId, name, expiresAt } = action.payload;
      (state.typing[key] ??= {})[userId] = { name, expiresAt };
    },
    typingStopped(state, action: PayloadAction<{ key: string; userId: string }>) {
      const entries = state.typing[action.payload.key];
      if (entries) delete entries[action.payload.userId];
    },
    // Drops entries whose timer has elapsed (a stop event can be lost).
    typingExpired(state, action: PayloadAction<number>) {
      for (const entries of Object.values(state.typing)) {
        for (const [userId, entry] of Object.entries(entries)) {
          if (entry.expiresAt <= action.payload) delete entries[userId];
        }
      }
    },
  },
});

export const {
  onlineUsersSet,
  userCameOnline,
  userWentOffline,
  typingStarted,
  typingStopped,
  typingExpired,
} = presenceSlice.actions;
export default presenceSlice.reducer;
