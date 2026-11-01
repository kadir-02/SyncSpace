import { createSlice, nanoid, type PayloadAction } from "@reduxjs/toolkit";
import type { ActiveChat } from "@/types";

export interface Toast {
  id: string;
  kind: "info" | "success" | "error";
  title: string;
  description?: string;
  href?: string;
}

interface UiState {
  toasts: Toast[];
  sidebarOpen: boolean;
  activeChat: ActiveChat;
  socketConnected: boolean;
  // User whose profile card is open (null = closed).
  profileUserId: string | null;
}

const initialState: UiState = {
  toasts: [],
  sidebarOpen: false,
  activeChat: null,
  socketConnected: false,
  profileUserId: null,
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    toastAdded: {
      reducer(state, action: PayloadAction<Toast>) {
        state.toasts.push(action.payload);
        if (state.toasts.length > 4) state.toasts.shift();
      },
      prepare(toast: Omit<Toast, "id">) {
        return { payload: { id: nanoid(), ...toast } };
      },
    },
    toastDismissed(state, action: PayloadAction<string>) {
      state.toasts = state.toasts.filter((toast) => toast.id !== action.payload);
    },
    sidebarToggled(state, action: PayloadAction<boolean | undefined>) {
      state.sidebarOpen = action.payload ?? !state.sidebarOpen;
    },
    activeChatSet(state, action: PayloadAction<ActiveChat>) {
      state.activeChat = action.payload;
    },
    profileOpened(state, action: PayloadAction<string | null>) {
      state.profileUserId = action.payload;
    },
    socketStatusChanged(state, action: PayloadAction<boolean>) {
      state.socketConnected = action.payload;
    },
  },
});

export const {
  toastAdded,
  toastDismissed,
  sidebarToggled,
  activeChatSet,
  socketStatusChanged,
  profileOpened,
} = uiSlice.actions;
export default uiSlice.reducer;
