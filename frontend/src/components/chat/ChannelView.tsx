"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Hash, Lock, Search, Settings } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { FullScreenSpinner } from "@/components/ui/Spinner";
import { useUserResolver } from "@/hooks/useUserResolver";
import { useWorkspace } from "@/hooks/useWorkspace";
import { getSocket } from "@/lib/socket";
import { idOf } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectChannelById } from "@/store/selectors";
import {
  deleteMessage,
  editMessage,
  fetchMessages,
  markChannelRead,
  sendMessage,
} from "@/store/slices/messageSlice";
import { activeChatSet, toastAdded } from "@/store/slices/uiSlice";
import { ChannelSettingsModal } from "./ChannelSettingsModal";
import { Composer } from "./Composer";
import { MessageFeed } from "./MessageFeed";
import type { FeedMessage } from "./MessageItem";
import { SearchPanel } from "./SearchPanel";
import { TypingIndicator } from "./TypingIndicator";

export function ChannelView({ channelId }: { channelId: string }) {
  const dispatch = useAppDispatch();
  const resolve = useUserResolver();
  const { workspaceId, me, teams } = useWorkspace();

  const channel = useAppSelector(selectChannelById(channelId));
  const thread = useAppSelector((state) => state.messages.byChannel[channelId]);
  const unreadCount = useAppSelector((state) => state.unread.channels[channelId] ?? 0);
  const structureLoaded = useAppSelector((state) => {
    const teamsReady = state.teams.status[workspaceId] === "ready";
    return (
      teamsReady &&
      teams.filter((team) => team.isMember).every((team) => state.channels.byTeam[team.id] !== undefined)
    );
  });

  // Remember which channel the search panel was opened for so it closes on navigation.
  const [searchFor, setSearchFor] = useState<string | null>(null);
  const searchOpen = searchFor === channelId;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const markedIds = useRef<Set<string>>(new Set());

  // Tell the socket bridge which room to join, and clear it on the way out.
  useEffect(() => {
    dispatch(activeChatSet({ type: "channel", id: channelId }));
    markedIds.current = new Set();

    return () => {
      dispatch(activeChatSet(null));
    };
  }, [channelId, dispatch]);

  // Always refresh the newest page on entry; older pages stay cached.
  useEffect(() => {
    if (channel) dispatch(fetchMessages({ channelId }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId, Boolean(channel), dispatch]);

  // Mark what the user can now see as read (clears the sidebar badge).
  useEffect(() => {
    if (!thread || thread.status !== "ready" || unreadCount === 0 || document.hidden) return;

    const ids = thread.items
      .filter((message) => idOf(message.sender) !== me?.id && !markedIds.current.has(message.id))
      .slice(-100)
      .map((message) => message.id);

    if (ids.length === 0) return;

    ids.forEach((id) => markedIds.current.add(id));
    dispatch(markChannelRead({ channelId, messageIds: ids }));
  }, [thread, unreadCount, me?.id, channelId, dispatch]);

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
    dispatch(fetchMessages({ channelId, page: thread.page + 1 }));
  }, [thread, channelId, dispatch]);

  const emitTyping = useCallback(
    (event: "typing:start" | "typing:stop") => getSocket()?.emit(event, { channelId }),
    [channelId],
  );

  if (!channel) {
    if (!structureLoaded) return <FullScreenSpinner label="Loading channel…" />;

    return (
      <EmptyState
        icon={<Hash className="h-6 w-6" />}
        title="Channel not available"
        description="It may have been deleted, or you don't have access to it."
        action={
          <Link href={`/w/${workspaceId}`}>
            <Button variant="secondary">Back to workspace</Button>
          </Link>
        }
      />
    );
  }

  const canOpenSettings = channel.type === "private" || teams.some((team) => team.id === channel.team);

  return (
    <div className="flex h-full min-h-0">
      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-slate-200 px-5 py-3">
          <span className="text-slate-500">
            {channel.type === "private" ? <Lock className="h-5 w-5" /> : <Hash className="h-5 w-5" />}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold text-slate-900">{channel.name}</h1>
            {channel.description && (
              <p className="truncate text-xs text-slate-500">{channel.description}</p>
            )}
          </div>
          <Button
            variant={searchOpen ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setSearchFor(searchOpen ? null : channelId)}
            aria-label="Search messages"
          >
            <Search className="h-4 w-4" />
          </Button>
          {canOpenSettings && (
            <Button variant="ghost" size="sm" onClick={() => setSettingsOpen(true)} aria-label="Channel settings">
              <Settings className="h-4 w-4" />
            </Button>
          )}
        </header>

        <MessageFeed
          messages={feedMessages}
          meId={me?.id}
          resetKey={channelId}
          loading={!thread || thread.status === "loading" || thread.status === "idle"}
          error={thread?.status === "error" ? thread.error : null}
          hasMore={Boolean(thread && thread.page > 0 && thread.page < thread.totalPages)}
          loadingMore={Boolean(thread?.loadingMore)}
          emptyTitle={`Welcome to #${channel.name}`}
          emptyDescription="This is the start of the channel. Say hello 👋"
          onLoadOlder={loadOlder}
          onRetry={() => dispatch(fetchMessages({ channelId }))}
          onEdit={async (messageId, content) => {
            try {
              await dispatch(editMessage({ messageId, content })).unwrap();
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
              await dispatch(deleteMessage({ messageId, channelId })).unwrap();
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

        <TypingIndicator chatKey={`channel:${channelId}`} />

        <Composer
          key={channelId}
          placeholder={`Message #${channel.name}`}
          attachments={{ workspaceId, channelId }}
          onTypingStart={() => emitTyping("typing:start")}
          onTypingStop={() => emitTyping("typing:stop")}
          onSend={async (content, attachmentIds) => {
            await dispatch(sendMessage({ channelId, content, attachmentIds })).unwrap();
          }}
        />
      </section>

      {searchOpen && (
        <div className="absolute inset-0 z-20 sm:static sm:inset-auto">
          <SearchPanel channelId={channelId} onClose={() => setSearchFor(null)} />
        </div>
      )}

      {canOpenSettings && settingsOpen && (
        <ChannelSettingsModal channel={channel} open onClose={() => setSettingsOpen(false)} />
      )}
    </div>
  );
}
