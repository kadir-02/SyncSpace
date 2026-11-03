import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { api } from "@/lib/api";
import type { Conversation, DirectMessage, Pagination } from "@/types";
import { apiThunk } from "../thunk";
import { userUpdated } from "../actions";

interface ConversationMessages {
  items: DirectMessage[]; // oldest -> newest
  page: number;
  totalPages: number;
  status: "idle" | "loading" | "ready" | "error";
  loadingMore: boolean;
  error: string | null;
}

interface DmState {
  conversations: Conversation[];
  status: "idle" | "loading" | "ready" | "error";
  messages: Record<string, ConversationMessages>;
}

const initialState: DmState = { conversations: [], status: "idle", messages: {} };

const PAGE_SIZE = 30;

const emptyThread = (): ConversationMessages => ({
  items: [],
  page: 0,
  totalPages: 1,
  status: "idle",
  loadingMore: false,
  error: null,
});

const upsertMessage = (items: DirectMessage[], message: DirectMessage) => {
  const index = items.findIndex((item) => item.id === message.id);

  if (index !== -1) {
    items[index] = message;
    return;
  }

  let position = items.length;
  while (position > 0 && items[position - 1].createdAt > message.createdAt) position--;
  items.splice(position, 0, message);
};

const ensure = (state: DmState, conversationId: string) => {
  if (!state.messages[conversationId]) state.messages[conversationId] = emptyThread();
  return state.messages[conversationId];
};

const upsertConversation = (state: DmState, conversation: Conversation) => {
  const index = state.conversations.findIndex((item) => item.id === conversation.id);

  if (index === -1) state.conversations.unshift(conversation);
  else state.conversations[index] = { ...state.conversations[index], ...conversation };
};

// Keeps the sidebar preview right when the newest message is edited.
const refreshPreview = (state: DmState, message: DirectMessage) => {
  const conversation = state.conversations.find((item) => item.id === message.conversation);

  if (conversation?.lastMessage?.id === message.id) {
    conversation.lastMessage.content = message.content;
  }
};

const touchConversation = (state: DmState, message: DirectMessage) => {
  const conversation = state.conversations.find((item) => item.id === message.conversation);
  if (!conversation) return;

  conversation.lastMessage = {
    id: message.id,
    content: message.content,
    sender: message.sender,
    createdAt: message.createdAt,
  };
  conversation.updatedAt = message.createdAt;

  state.conversations.sort((a, b) =>
    (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""),
  );
};

export const fetchConversations = apiThunk<Conversation[]>("dm/fetchConversations", () =>
  api<Conversation[]>("/dms/conversations"),
);

export const startConversation = apiThunk<Conversation, string>(
  "dm/start",
  (recipientId) =>
    api<Conversation>("/dms/conversations", { method: "POST", body: { recipientId } }),
);

export const fetchDirectMessages = apiThunk<
  {
    conversationId: string;
    page: number;
    messages: DirectMessage[];
    pagination: Pagination;
  },
  { conversationId: string; page?: number }
>("dm/fetchMessages", async ({ conversationId, page = 1 }) => {
  const result = await api<{ messages: DirectMessage[]; pagination: Pagination }>(
    `/dms/conversations/${conversationId}/messages`,
    { query: { page, limit: PAGE_SIZE } },
  );

  return { conversationId, page, ...result };
});

export const sendDirectMessage = apiThunk<
  DirectMessage,
  { conversationId: string; content: string; attachmentIds?: string[] }
>("dm/send", ({ conversationId, content, attachmentIds }) =>
  api<DirectMessage>(`/dms/conversations/${conversationId}/messages`, {
    method: "POST",
    body: { content, attachmentIds: attachmentIds ?? [] },
  }),
);

export const editDirectMessage = apiThunk<
  DirectMessage,
  { messageId: string; content: string }
>("dm/edit", ({ messageId, content }) =>
  api<DirectMessage>(`/dms/messages/${messageId}`, {
    method: "PATCH",
    body: { content },
  }),
);

export const deleteDirectMessage = apiThunk<
  { messageId: string; conversationId: string },
  { messageId: string; conversationId: string }
>("dm/delete", async ({ messageId, conversationId }) => {
  await api(`/dms/messages/${messageId}`, { method: "DELETE" });
  return { messageId, conversationId };
});

const dmSlice = createSlice({
  name: "dm",
  initialState,
  reducers: {
    dmMessageReceived(state, action: PayloadAction<DirectMessage>) {
      upsertMessage(ensure(state, action.payload.conversation).items, action.payload);
      touchConversation(state, action.payload);
    },
    dmMessageUpdated(state, action: PayloadAction<DirectMessage>) {
      const thread = state.messages[action.payload.conversation];
      if (thread) upsertMessage(thread.items, action.payload);
      refreshPreview(state, action.payload);
    },
    dmMessageRemoved(
      state,
      action: PayloadAction<{ messageId: string; conversationId: string }>,
    ) {
      const thread = state.messages[action.payload.conversationId];
      if (thread) {
        thread.items = thread.items.filter((item) => item.id !== action.payload.messageId);
      }
    },
    conversationAdded(state, action: PayloadAction<Conversation>) {
      upsertConversation(state, action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchConversations.pending, (state) => {
        if (state.status === "idle") state.status = "loading";
      })
      .addCase(fetchConversations.fulfilled, (state, { payload }) => {
        state.conversations = payload;
        state.status = "ready";
      })
      .addCase(fetchConversations.rejected, (state) => {
        state.status = "error";
      })
      .addCase(startConversation.fulfilled, (state, { payload }) => {
        upsertConversation(state, payload);
      })
      .addCase(fetchDirectMessages.pending, (state, { meta }) => {
        const thread = ensure(state, meta.arg.conversationId);
        const page = meta.arg.page ?? 1;

        if (page > 1) thread.loadingMore = true;
        else if (thread.status !== "ready") thread.status = "loading";

        thread.error = null;
      })
      .addCase(fetchDirectMessages.fulfilled, (state, { payload }) => {
        const thread = ensure(state, payload.conversationId);

        payload.messages.forEach((message) => upsertMessage(thread.items, message));

        thread.page = Math.max(thread.page, payload.page);
        thread.totalPages = payload.pagination.totalPages;
        thread.status = "ready";
        thread.loadingMore = false;
      })
      .addCase(fetchDirectMessages.rejected, (state, { meta, payload }) => {
        const thread = ensure(state, meta.arg.conversationId);

        thread.status = "error";
        thread.loadingMore = false;
        thread.error = payload ?? "Could not load messages";
      })
      .addCase(sendDirectMessage.fulfilled, (state, { payload }) => {
        upsertMessage(ensure(state, payload.conversation).items, payload);
        touchConversation(state, payload);
      })
      .addCase(editDirectMessage.fulfilled, (state, { payload }) => {
        const thread = state.messages[payload.conversation];
        if (thread) upsertMessage(thread.items, payload);
        refreshPreview(state, payload);
      })
      .addCase(userUpdated, (state, { payload }) => {
        for (const conversation of state.conversations) {
          for (const participant of conversation.participants) {
            if (participant.id === payload.id) {
              participant.name = payload.name;
              participant.avatar = payload.avatar ?? undefined;
            }
          }
        }
      })
      .addCase(deleteDirectMessage.fulfilled, (state, { payload }) => {
        const thread = state.messages[payload.conversationId];
        if (thread) {
          thread.items = thread.items.filter((item) => item.id !== payload.messageId);
        }
      });
  },
});

export const {
  dmMessageReceived,
  dmMessageUpdated,
  dmMessageRemoved,
  conversationAdded,
} = dmSlice.actions;
export default dmSlice.reducer;
