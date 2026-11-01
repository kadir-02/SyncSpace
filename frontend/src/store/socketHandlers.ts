import type { Socket } from "socket.io-client";
import { normalize } from "@/lib/api";
import type {
  AppNotification,
  Conversation,
  DirectMessage,
  Message,
} from "@/types";
import { idOf } from "@/lib/utils";
import type { AppDispatch, RootState } from "./index";
import {
  messageReceived,
  messageRemoved,
  messageUpdated,
  markChannelRead,
  fetchMessages,
} from "./slices/messageSlice";
import {
  conversationAdded,
  dmMessageReceived,
  dmMessageRemoved,
  fetchDirectMessages,
} from "./slices/dmSlice";
import {
  allNotificationsMarkedRead,
  isChatNotification,
  markNotificationRead,
  notificationMarkedRead,
  notificationReceived,
  notificationRemoved,
} from "./slices/notificationSlice";
import {
  channelUnreadIncremented,
  dmUnreadAdded,
} from "./slices/unreadSlice";
import {
  onlineUsersSet,
  typingExpired,
  typingStarted,
  typingStopped,
  userCameOnline,
  userWentOffline,
} from "./slices/presenceSlice";
import { channelRemoved } from "./slices/channelSlice";
import { fetchWorkspaces, workspaceRemoved } from "./slices/workspaceSlice";
import { socketStatusChanged, toastAdded } from "./slices/uiSlice";
import { loadGlobalData, loadWorkspaceData } from "./workspaceThunks";

const TYPING_TTL_MS = 5000;

interface Store {
  dispatch: AppDispatch;
  getState: () => RootState;
}

const withAttachments = (message: Message): Message => ({
  ...message,
  attachments: message.attachments ?? [],
});

/**
 * Translates Socket.IO events into Redux actions. This is the only place that
 * knows about the wire protocol, so components only ever read from the store.
 */
export function bindSocketEvents(socket: Socket, { dispatch, getState }: Store) {
  let hasConnectedBefore = false;
  let typingTimer: ReturnType<typeof setInterval> | null = null;

  const me = () => getState().auth.user?.id;

  const refetchAfterReconnect = () => {
    const { workspaces, ui } = getState();

    dispatch(loadGlobalData());
    if (workspaces.currentId) dispatch(loadWorkspaceData(workspaces.currentId));

    if (ui.activeChat?.type === "channel") {
      dispatch(fetchMessages({ channelId: ui.activeChat.id }));
    } else if (ui.activeChat?.type === "dm") {
      dispatch(fetchDirectMessages({ conversationId: ui.activeChat.id }));
    }
  };

  socket.on("connect", () => {
    dispatch(socketStatusChanged(true));

    if (hasConnectedBefore) refetchAfterReconnect();
    hasConnectedBefore = true;
  });

  socket.on("disconnect", () => dispatch(socketStatusChanged(false)));
  socket.on("connect_error", () => dispatch(socketStatusChanged(false)));

  // ---- presence -----------------------------------------------------------
  socket.on("presence:online-users", (data: { userIds: string[] }) =>
    dispatch(onlineUsersSet(data.userIds ?? [])),
  );
  socket.on("presence:online", (data: { userId: string }) =>
    dispatch(userCameOnline(data.userId)),
  );
  socket.on("presence:offline", (data: { userId: string }) =>
    dispatch(userWentOffline(data.userId)),
  );

  // ---- channel messages ---------------------------------------------------
  socket.on("message:new", (raw: unknown) => {
    const message = withAttachments(normalize<Message>(raw));

    dispatch(messageReceived(message));

    const { activeChat } = getState().ui;
    const isActive = activeChat?.type === "channel" && activeChat.id === message.channel;

    if (isActive && idOf(message.sender) !== me() && !document.hidden) {
      dispatch(markChannelRead({ channelId: message.channel, messageIds: [message.id] }));
    }
  });

  socket.on("message:updated", (raw: unknown) =>
    dispatch(messageUpdated(withAttachments(normalize<Message>(raw)))),
  );

  socket.on("message:deleted", (data: { messageId: string; channelId: string }) =>
    dispatch(messageRemoved(data)),
  );

  // ---- typing -------------------------------------------------------------
  const onTyping =
    (prefix: "channel" | "dm") =>
    (data: {
      userId: string;
      name?: string;
      channelId?: string;
      conversationId?: string;
      isTyping: boolean;
    }) => {
      const key = `${prefix}:${data.channelId ?? data.conversationId}`;

      if (data.userId === me()) return;

      if (data.isTyping) {
        dispatch(
          typingStarted({
            key,
            userId: data.userId,
            name: data.name ?? "Someone",
            expiresAt: Date.now() + TYPING_TTL_MS,
          }),
        );
      } else {
        dispatch(typingStopped({ key, userId: data.userId }));
      }
    };

  socket.on("typing:update", onTyping("channel"));
  socket.on("dm:typing:update", onTyping("dm"));

  // A lost "stop" event must not leave "X is typing" stuck on screen.
  typingTimer = setInterval(() => dispatch(typingExpired(Date.now())), 1500);

  // ---- direct messages ----------------------------------------------------
  socket.on("dm:message:new", (raw: unknown) =>
    dispatch(dmMessageReceived(normalize<DirectMessage>(raw))),
  );

  socket.on(
    "dm:message:deleted",
    (data: { messageId: string; conversationId: string }) =>
      dispatch(dmMessageRemoved(data)),
  );

  socket.on("dm:conversation:new", (raw: unknown) =>
    dispatch(conversationAdded(normalize<Conversation>(raw))),
  );

  // ---- notifications ------------------------------------------------------
  socket.on("notification:new", (raw: unknown) => {
    const notification = normalize<AppNotification>(raw);
    const { activeChat } = getState().ui;

    if (notification.type === "message") {
      const channelId =
        typeof notification.channel === "string"
          ? notification.channel
          : notification.channel?.id;

      // Unread badge only when the channel isn't already open.
      if (channelId && !(activeChat?.type === "channel" && activeChat.id === channelId)) {
        dispatch(channelUnreadIncremented(channelId));
      }
      return;
    }

    if (notification.type === "direct_message") {
      const conversationId = notification.resourceId;
      if (!conversationId) return;

      if (activeChat?.type === "dm" && activeChat.id === conversationId) {
        dispatch(markNotificationRead(notification.id));
      } else {
        dispatch(dmUnreadAdded({ conversationId, notificationId: notification.id }));
      }
      return;
    }

    if (!isChatNotification(notification)) {
      dispatch(notificationReceived(notification));
      dispatch(
        toastAdded({
          kind: "info",
          title: notification.title,
          description: notification.message,
        }),
      );
    }

    // Access changed: pull fresh structure.
    const currentWorkspaceId = getState().workspaces.currentId;

    if (notification.type === "workspace_invite") dispatch(fetchWorkspaces());
    else if (
      currentWorkspaceId &&
      (notification.type === "team_invite" || notification.type === "channel_invite")
    ) {
      dispatch(loadWorkspaceData(currentWorkspaceId));
    }
  });

  socket.on("notification:read", (data: { notificationId: string }) =>
    dispatch(notificationMarkedRead(data.notificationId)),
  );
  socket.on("notification:read-all", () => dispatch(allNotificationsMarkedRead()));
  socket.on("notification:deleted", (data: { notificationId: string }) =>
    dispatch(notificationRemoved(data.notificationId)),
  );

  // ---- structure ----------------------------------------------------------
  socket.on("channel:deleted", (data: { channelId: string }) =>
    dispatch(channelRemoved(data.channelId)),
  );
  socket.on("workspace:deleted", (data: { workspaceId: string }) =>
    dispatch(workspaceRemoved(data.workspaceId)),
  );

  const onError = (data: { message?: string }) =>
    dispatch(toastAdded({ kind: "error", title: data?.message ?? "Realtime error" }));

  socket.on("channel:error", onError);
  socket.on("dm:error", onError);

  return () => {
    if (typingTimer) clearInterval(typingTimer);
    socket.removeAllListeners();
  };
}
