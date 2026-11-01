import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { api } from "@/lib/api";
import type { Message, Pagination } from "@/types";
import { apiThunk } from "../thunk";

interface ChannelMessages {
  items: Message[]; // oldest -> newest
  page: number; // furthest page loaded (pages are newest-first)
  totalPages: number;
  status: "idle" | "loading" | "ready" | "error";
  loadingMore: boolean;
  error: string | null;
}

interface SearchState {
  channelId: string | null;
  query: string;
  results: Message[];
  total: number;
  status: "idle" | "loading" | "ready" | "error";
  error: string | null;
}

interface MessageState {
  byChannel: Record<string, ChannelMessages>;
  search: SearchState;
}

const emptyChannel = (): ChannelMessages => ({
  items: [],
  page: 0,
  totalPages: 1,
  status: "idle",
  loadingMore: false,
  error: null,
});

const initialState: MessageState = {
  byChannel: {},
  search: {
    channelId: null,
    query: "",
    results: [],
    total: 0,
    status: "idle",
    error: null,
  },
};

const PAGE_SIZE = 30;

// Insert keeping chronological order and de-duplicating by id. Both the REST
// response and the socket event deliver the same message, so this must be idempotent.
const upsert = (items: Message[], message: Message) => {
  const index = items.findIndex((item) => item.id === message.id);

  if (index !== -1) {
    items[index] = message;
    return;
  }

  let position = items.length;
  while (position > 0 && items[position - 1].createdAt > message.createdAt) position--;
  items.splice(position, 0, message);
};

const ensure = (state: MessageState, channelId: string) => {
  if (!state.byChannel[channelId]) state.byChannel[channelId] = emptyChannel();
  return state.byChannel[channelId];
};

export const fetchMessages = apiThunk<
  { channelId: string; page: number; messages: Message[]; pagination: Pagination },
  { channelId: string; page?: number }
>("messages/fetch", async ({ channelId, page = 1 }) => {
  const result = await api<{ messages: Message[]; pagination: Pagination }>(
    `/messages/channels/${channelId}/messages`,
    { query: { page, limit: PAGE_SIZE } },
  );

  return { channelId, page, ...result };
});

export const sendMessage = apiThunk<
  Message,
  { channelId: string; content: string; attachmentIds?: string[] }
>("messages/send", ({ channelId, content, attachmentIds }) =>
  api<Message>(`/messages/channels/${channelId}/messages`, {
    method: "POST",
    body: { content, attachmentIds: attachmentIds ?? [] },
  }),
);

export const editMessage = apiThunk<Message, { messageId: string; content: string }>(
  "messages/edit",
  ({ messageId, content }) =>
    api<Message>(`/messages/${messageId}`, { method: "PATCH", body: { content } }),
);

export const deleteMessage = apiThunk<
  { messageId: string; channelId: string },
  { messageId: string; channelId: string }
>("messages/delete", async ({ messageId, channelId }) => {
  await api(`/messages/${messageId}`, { method: "DELETE" });
  return { messageId, channelId };
});

export const markChannelRead = apiThunk<
  { channelId: string },
  { channelId: string; messageIds: string[] }
>("messages/markRead", async ({ channelId, messageIds }) => {
  await api("/message-reads", { method: "POST", body: { channelId, messageIds } });
  return { channelId };
});

export const searchMessages = apiThunk<
  { channelId: string; query: string; messages: Message[]; total: number },
  { channelId: string; query: string }
>("messages/search", async ({ channelId, query }) => {
  const result = await api<{ messages: Message[]; pagination: Pagination }>(
    "/message-search",
    { query: { channelId, query, limit: 30 } },
  );

  return { channelId, query, messages: result.messages, total: result.pagination.total };
});

const messageSlice = createSlice({
  name: "messages",
  initialState,
  reducers: {
    messageReceived(state, action: PayloadAction<Message>) {
      upsert(ensure(state, action.payload.channel).items, action.payload);
    },
    messageUpdated(state, action: PayloadAction<Message>) {
      const channel = state.byChannel[action.payload.channel];
      if (channel) upsert(channel.items, action.payload);
    },
    messageRemoved(
      state,
      action: PayloadAction<{ messageId: string; channelId: string }>,
    ) {
      const channel = state.byChannel[action.payload.channelId];
      if (channel) {
        channel.items = channel.items.filter((item) => item.id !== action.payload.messageId);
      }
    },
    channelMessagesCleared(state, action: PayloadAction<string>) {
      delete state.byChannel[action.payload];
    },
    searchCleared(state) {
      state.search = initialState.search;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMessages.pending, (state, { meta }) => {
        const channel = ensure(state, meta.arg.channelId);
        const page = meta.arg.page ?? 1;

        if (page > 1) channel.loadingMore = true;
        else if (channel.status !== "ready") channel.status = "loading";

        channel.error = null;
      })
      .addCase(fetchMessages.fulfilled, (state, { payload }) => {
        const channel = ensure(state, payload.channelId);

        payload.messages.forEach((message) => upsert(channel.items, message));

        channel.page = Math.max(channel.page, payload.page);
        channel.totalPages = payload.pagination.totalPages;
        channel.status = "ready";
        channel.loadingMore = false;
      })
      .addCase(fetchMessages.rejected, (state, { meta, payload }) => {
        const channel = ensure(state, meta.arg.channelId);

        channel.status = "error";
        channel.loadingMore = false;
        channel.error = payload ?? "Could not load messages";
      })
      .addCase(sendMessage.fulfilled, (state, { payload }) => {
        upsert(ensure(state, payload.channel).items, payload);
      })
      .addCase(editMessage.fulfilled, (state, { payload }) => {
        const channel = state.byChannel[payload.channel];
        if (channel) upsert(channel.items, payload);
      })
      .addCase(deleteMessage.fulfilled, (state, { payload }) => {
        const channel = state.byChannel[payload.channelId];
        if (channel) {
          channel.items = channel.items.filter((item) => item.id !== payload.messageId);
        }
      })
      .addCase(searchMessages.pending, (state, { meta }) => {
        state.search.channelId = meta.arg.channelId;
        state.search.query = meta.arg.query;
        state.search.status = "loading";
        state.search.error = null;
      })
      .addCase(searchMessages.fulfilled, (state, { payload }) => {
        // Ignore stale responses from an earlier keystroke.
        if (state.search.query !== payload.query) return;
        state.search.results = payload.messages;
        state.search.total = payload.total;
        state.search.status = "ready";
      })
      .addCase(searchMessages.rejected, (state, { payload }) => {
        state.search.status = "error";
        state.search.error = payload ?? "Search failed";
      });
  },
});

export const {
  messageReceived,
  messageUpdated,
  messageRemoved,
  channelMessagesCleared,
  searchCleared,
} = messageSlice.actions;
export default messageSlice.reducer;
