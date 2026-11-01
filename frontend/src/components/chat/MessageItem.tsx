"use client";

import { useState } from "react";
import { FileText, Pencil, Trash2 } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";
import { linkify } from "@/lib/linkify";
import { formatBytes, formatTime, isImage } from "@/lib/utils";
import type { Attachment } from "@/types";
import type { ResolvedUser } from "@/hooks/useUserResolver";

export interface FeedMessage {
  id: string;
  createdAt: string;
  sender: ResolvedUser;
  content: string;
  edited?: boolean;
  attachments?: Attachment[];
}

interface MessageItemProps {
  message: FeedMessage;
  grouped: boolean;
  isOwn: boolean;
  online?: boolean;
  onEdit?: (id: string, content: string) => Promise<void>;
  onDelete?: (id: string) => void;
}

function AttachmentView({ attachment }: { attachment: Attachment }) {
  if (isImage(attachment.mimeType)) {
    return (
      <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="block w-fit">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={attachment.url}
          alt={attachment.originalName}
          className="max-h-60 max-w-full rounded-lg border border-slate-200 object-cover sm:max-w-sm"
          loading="lazy"
        />
      </a>
    );
  }

  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex w-fit max-w-full items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 hover:bg-slate-50"
    >
      <FileText className="h-5 w-5 shrink-0 text-indigo-500" />
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-slate-800">
          {attachment.originalName}
        </span>
        <span className="block text-xs text-slate-500">{formatBytes(attachment.size)}</span>
      </span>
    </a>
  );
}

export function MessageItem({ message, grouped, isOwn, online, onEdit, onDelete }: MessageItemProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);
  const [saving, setSaving] = useState(false);

  const startEdit = () => {
    setDraft(message.content);
    setEditing(true);
  };

  const save = async () => {
    const next = draft.trim();

    if (!onEdit || !next || next === message.content) {
      setEditing(false);
      return;
    }

    setSaving(true);

    try {
      await onEdit(message.id, next);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const canEdit = isOwn && Boolean(onEdit) && message.content.length > 0;

  return (
    <div className="group relative flex gap-3 px-5 py-0.5 hover:bg-slate-50">
      <div className="w-9 shrink-0 pt-0.5">
        {grouped ? (
          <span className="hidden pt-1 text-[10px] text-slate-400 group-hover:block">
            {formatTime(message.createdAt)}
          </span>
        ) : (
          <Avatar
            id={message.sender.id}
            name={message.sender.name}
            src={message.sender.avatar}
            size="md"
            online={online}
          />
        )}
      </div>

      <div className="min-w-0 flex-1 pb-1">
        {!grouped && (
          <div className="flex items-baseline gap-2 pt-0.5">
            <span className="text-sm font-semibold text-slate-900">{message.sender.name}</span>
            <time className="text-xs text-slate-400" dateTime={message.createdAt}>
              {formatTime(message.createdAt)}
            </time>
          </div>
        )}

        {editing ? (
          <div className="mt-1 space-y-2">
            <Textarea
              autoFocus
              rows={Math.min(6, Math.max(2, draft.split("\n").length))}
              value={draft}
              maxLength={5000}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") setEditing(false);
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  save();
                }
              }}
            />
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={save} loading={saving}>
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <span className="text-xs text-slate-400">Enter to save · Esc to cancel</span>
            </div>
          </div>
        ) : (
          <>
            {message.content && (
              <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-slate-800">
                {linkify(message.content)}
                {message.edited && <span className="ml-1.5 text-xs text-slate-400">(edited)</span>}
              </p>
            )}
            {message.attachments && message.attachments.length > 0 && (
              <div className="mt-1.5 flex flex-col gap-2">
                {message.attachments.map((attachment) => (
                  <AttachmentView key={attachment.id} attachment={attachment} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {isOwn && !editing && (onDelete || canEdit) && (
        <div className="absolute -top-3 right-5 hidden items-center rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm group-hover:flex group-focus-within:flex">
          {canEdit && (
            <button
              type="button"
              onClick={startEdit}
              className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              aria-label="Edit message"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(message.id)}
              className="rounded-md p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
              aria-label="Delete message"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
