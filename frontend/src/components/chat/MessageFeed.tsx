"use client";

import { Fragment, useState } from "react";
import { MessagesSquare } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { useAutoScroll } from "@/hooks/useAutoScroll";
import { formatDateLabel } from "@/lib/utils";
import { useAppSelector } from "@/store/hooks";
import { MessageItem, type FeedMessage } from "./MessageItem";

interface MessageFeedProps {
  messages: FeedMessage[];
  meId: string | undefined;
  resetKey: string;
  loading: boolean;
  error?: string | null;
  hasMore: boolean;
  loadingMore: boolean;
  emptyTitle: string;
  emptyDescription: string;
  onLoadOlder: () => void;
  onRetry?: () => void;
  onEdit?: (id: string, content: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

const GROUP_WINDOW_MS = 5 * 60 * 1000;

export function MessageFeed({
  messages,
  meId,
  resetKey,
  loading,
  error,
  hasMore,
  loadingMore,
  emptyTitle,
  emptyDescription,
  onLoadOlder,
  onRetry,
  onEdit,
  onDelete,
}: MessageFeedProps) {
  const online = useAppSelector((state) => state.presence.online);
  const { containerRef, onScroll } = useAutoScroll(messages.length, messages[0]?.id, resetKey);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleScroll = () => {
    onScroll();
    const el = containerRef.current;
    if (el && el.scrollTop < 60 && hasMore && !loadingMore) onLoadOlder();
  };

  const confirmDelete = async () => {
    if (!pendingDelete || !onDelete) return;
    setDeleting(true);

    try {
      await onDelete(pendingDelete);
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  };

  if (loading && messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  if (error && messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm text-rose-600">{error}</p>
        {onRetry && (
          <Button variant="secondary" size="sm" onClick={onRetry}>
            Try again
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="scroll-slim min-h-0 flex-1 overflow-y-auto py-4"
    >
      {hasMore && (
        <div className="flex justify-center pb-3">
          <Button variant="ghost" size="sm" loading={loadingMore} onClick={onLoadOlder}>
            Load older messages
          </Button>
        </div>
      )}

      {messages.length === 0 && (
        <EmptyState
          icon={<MessagesSquare className="h-6 w-6" />}
          title={emptyTitle}
          description={emptyDescription}
        />
      )}

      {messages.map((message, index) => {
        const previous = messages[index - 1];
        const newDay =
          !previous ||
          new Date(previous.createdAt).toDateString() !== new Date(message.createdAt).toDateString();
        const grouped =
          !newDay &&
          previous.sender.id === message.sender.id &&
          new Date(message.createdAt).getTime() - new Date(previous.createdAt).getTime() <
            GROUP_WINDOW_MS;

        return (
          <Fragment key={message.id}>
            {newDay && (
              <div className="my-3 flex items-center gap-3 px-5">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="rounded-full border border-slate-200 bg-white px-3 py-0.5 text-xs font-medium text-slate-500">
                  {formatDateLabel(message.createdAt)}
                </span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>
            )}
            <MessageItem
              message={message}
              grouped={grouped}
              isOwn={message.sender.id === meId}
              online={Boolean(online[message.sender.id])}
              onEdit={onEdit}
              onDelete={onDelete ? (id) => setPendingDelete(id) : undefined}
            />
          </Fragment>
        );
      })}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete message?"
        description="This permanently removes the message for everyone. This can't be undone."
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  );
}
