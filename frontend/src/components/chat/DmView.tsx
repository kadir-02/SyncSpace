"use client";

import { useCallback, useEffect, useMemo } from "react";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { FullScreenSpinner } from "@/components/ui/Spinner";
import { useUserResolver } from "@/hooks/useUserResolver";
import { useWorkspace } from "@/hooks/useWorkspace";
import { otherParticipant } from "@/lib/conversation";
import { getSocket } from "@/lib/socket";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  deleteDirectMessage,
  editDirectMessage,
  fetchConversations,
  fetchDirectMessages,
  sendDirectMessage,
} from "@/store/slices/dmSlice";
import { activeChatSet, profileOpened, toastAdded } from "@/store/slices/uiSlice";
import { markDmRead } from "@/store/slices/unreadSlice";
import { Composer } from "./Composer";
import { MessageFeed } from "./MessageFeed";
import type { FeedMessage } from "./MessageItem";
import { TypingIndicator } from "./TypingIndicator";

export function DmView({ conversationId }: { conversationId: string }) {
  const dispatch = useAppDispatch();
  const resolve = useUserResolver();
  const { workspaceId, me } = useWorkspace();

  const conversationsStatus = useAppSelector((state) => state.dm.status);
  const conversation = useAppSelector((state) =>
    state.dm.conversations.find((item) => item.id === conversationId),
  );
  const thread = useAppSelector((state) => state.dm.messages[conversationId]);
  const unreadIds = useAppSelector((state) => state.unread.dms[conversationId]);
  const online = useAppSelector((state) => state.presence.online);

  const other = conversation ? otherParticipant(conversation, me?.id) : undefined;

  useEffect(() => {
    dispatch(activeChatSet({ type: "dm", id: conversationId }));
    return () => {
      dispatch(activeChatSet(null));
    };
  }, [conversationId, dispatch]);

  useEffect(() => {
    // Opened from a link before the list loaded.
    if (conversationsStatus === "idle") dispatch(fetchConversations());
  }, [conversationsStatus, dispatch]);

  useEffect(() => {
    if (conversation) dispatch(fetchDirectMessages({ conversationId }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, Boolean(conversation), dispatch]);

  // Viewing the thread clears its unread notifications.
  useEffect(() => {
    if (unreadIds && unreadIds.length > 0 && !document.hidden) {
      dispatch(markDmRead({ conversationId, notificationIds: unreadIds }));
    }
  }, [unreadIds, conversationId, dispatch]);

  const feedMessages = useMemo<FeedMessage[]>(
    () =>
      (thread?.items ?? []).map((message) => ({
        id: message.id,
        createdAt: message.createdAt,
        sender: resolve(message.sender),
        content: message.content,
        edited: message.edited,
        attachments: message.attachments ?? [],
      })),
    [thread?.items, resolve],
  );

  const loadOlder = useCallback(() => {
    if (!thread || thread.loadingMore || thread.page >= thread.totalPages) return;
    dispatch(fetchDirectMessages({ conversationId, page: thread.page + 1 }));
  }, [thread, conversationId, dispatch]);

  const emitTyping = useCallback(
    (event: "dm:typing:start" | "dm:typing:stop") =>
      getSocket()?.emit(event, { conversationId }),
    [conversationId],
  );

  if (!conversation) {
    if (conversationsStatus === "idle" || conversationsStatus === "loading") {
      return <FullScreenSpinner label="Loading conversation…" />;
    }

    return (
      <EmptyState
        icon={<MessageCircle className="h-6 w-6" />}
        title="Conversation not found"
        description="It may not exist, or you aren't a participant."
        action={
          <Link href={`/w/${workspaceId}`}>
            <Button variant="secondary">Back to workspace</Button>
          </Link>
        }
      />
    );
  }

  return (
    <section className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-3 border-b border-slate-200 px-5 py-3">
        <button
          type="button"
          onClick={() => other && dispatch(profileOpened(other.id))}
          className="flex min-w-0 items-center gap-3 text-left"
          aria-label="View profile"
        >
        <Avatar
          id={other?.id}
          name={other?.name}
          src={other?.avatar}
          size="md"
          online={other ? Boolean(online[other.id]) : undefined}
        />
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold text-slate-900">{other?.name}</h1>
          <p className="truncate text-xs text-slate-500">
            {other && online[other.id] ? "Active now" : other?.email}
          </p>
        </div>
        </button>
      </header>

      <MessageFeed
        messages={feedMessages}
        meId={me?.id}
        resetKey={conversationId}
        loading={!thread || thread.status === "loading" || thread.status === "idle"}
        error={thread?.status === "error" ? thread.error : null}
        hasMore={Boolean(thread && thread.page > 0 && thread.page < thread.totalPages)}
        loadingMore={Boolean(thread?.loadingMore)}
        emptyTitle={`This is the beginning of your chat with ${other?.name ?? "them"}`}
        emptyDescription="Messages here are private between the two of you."
        onLoadOlder={loadOlder}
        onRetry={() => dispatch(fetchDirectMessages({ conversationId }))}
        onEdit={async (messageId, content) => {
          try {
            await dispatch(editDirectMessage({ messageId, content })).unwrap();
          } catch (message) {
            dispatch(
              toastAdded({
                kind: "error",
                title: typeof message === "string" ? message : "Could not edit message",
              }),
            );
            throw message;
          }
        }}
        onDelete={async (messageId) => {
          try {
            await dispatch(deleteDirectMessage({ messageId, conversationId })).unwrap();
          } catch (message) {
            dispatch(
              toastAdded({
                kind: "error",
                title: typeof message === "string" ? message : "Could not delete message",
              }),
            );
          }
        }}
      />

      <TypingIndicator chatKey={`dm:${conversationId}`} />

      <Composer
        key={conversationId}
        placeholder={`Message ${other?.name ?? ""}`}
        attachments={{ workspaceId, conversationId }}
        onTypingStart={() => emitTyping("dm:typing:start")}
        onTypingStop={() => emitTyping("dm:typing:stop")}
        onSend={async (content, attachmentIds) => {
          await dispatch(
            sendDirectMessage({ conversationId, content, attachmentIds }),
          ).unwrap();
        }}
      />
    </section>
  );
}
