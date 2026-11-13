"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Paperclip, SendHorizonal, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn, formatBytes, UPLOAD_ACCEPT, validateUpload } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { pendingAttachmentRemoved, pendingKeyFor, uploadFile } from "@/store/slices/fileSlice";
import { toastAdded } from "@/store/slices/uiSlice";
import type { UploadedFile } from "@/types";

interface ComposerProps {
  placeholder: string;
  onSend: (content: string, attachmentIds: string[]) => Promise<void>;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
  // Enables the attachment button (channels and direct messages).
  attachments?: { workspaceId: string; channelId?: string; conversationId?: string };
}

const TYPING_IDLE_MS = 2500;
const TYPING_REPEAT_MS = 3000;
const NO_FILES: UploadedFile[] = [];

export function Composer({
  placeholder,
  onSend,
  onTypingStart,
  onTypingStop,
  attachments,
}: ComposerProps) {
  const dispatch = useAppDispatch();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSent = useRef(0);

  const pendingKey = attachments ? pendingKeyFor(attachments) : undefined;
  const pending = useAppSelector((state) =>
    pendingKey ? (state.files.pending[pendingKey] ?? NO_FILES) : NO_FILES,
  );
  const uploading = useAppSelector((state) =>
    pendingKey ? Boolean(state.files.uploading[pendingKey]) : false,
  );

  const stopTyping = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = null;

    if (lastTypingSent.current) {
      lastTypingSent.current = 0;
      onTypingStop?.();
    }
  }, [onTypingStop]);

  // Make sure we never leave a stale "typing…" behind when leaving the chat.
  useEffect(() => () => stopTyping(), [stopTyping]);

  const resize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(event.target.value);
    requestAnimationFrame(resize);

    if (!event.target.value.trim()) {
      stopTyping();
      return;
    }

    const now = Date.now();
    if (now - lastTypingSent.current > TYPING_REPEAT_MS) {
      lastTypingSent.current = now;
      onTypingStart?.();
    }

    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(stopTyping, TYPING_IDLE_MS);
  };

  const canSend = (text.trim().length > 0 || pending.length > 0) && !sending && !uploading;

  const submit = async () => {
    if (!canSend) return;

    const content = text.trim();
    setSending(true);
    stopTyping();

    try {
      await onSend(content, pending.map((file) => file.id));
      setText("");
      requestAnimationFrame(resize);
    } catch (message) {
      dispatch(
        toastAdded({
          kind: "error",
          title: typeof message === "string" ? message : "Message failed to send",
        }),
      );
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  };

  const onFilePicked = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !attachments) return;

    const problem = validateUpload(file);

    if (problem) {
      dispatch(toastAdded({ kind: "error", title: file.name, description: problem }));
      return;
    }

    try {
      await dispatch(
        uploadFile({
          workspaceId: attachments.workspaceId,
          channelId: attachments.channelId,
          conversationId: attachments.conversationId,
          file,
        }),
      ).unwrap();
    } catch (message) {
      dispatch(
        toastAdded({
          kind: "error",
          title: "Upload failed",
          description: typeof message === "string" ? message : undefined,
        }),
      );
    }
  };

  return (
    <div className="pb-4 pl-5 pr-20">
      <div
        className={cn(
          "rounded-xl border border-slate-300 bg-white shadow-sm transition-colors",
          "focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-500/20",
        )}
      >
        {(pending.length > 0 || uploading) && (
          <ul className="flex flex-wrap gap-2 border-b border-slate-100 p-2">
            {pending.map((file) => (
              <li
                key={file.id}
                className="flex max-w-full items-center gap-2 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs"
              >
                <Paperclip className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                <span className="truncate font-medium text-slate-700">{file.originalName}</span>
                <span className="shrink-0 text-slate-400">{formatBytes(file.size)}</span>
                <button
                  type="button"
                  onClick={() =>
                    pendingKey &&
                    dispatch(pendingAttachmentRemoved({ key: pendingKey, fileId: file.id }))
                  }
                  className="text-slate-400 hover:text-slate-700"
                  aria-label={`Remove ${file.originalName}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
            {uploading && (
              <li className="flex items-center gap-2 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs text-slate-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…
              </li>
            )}
          </ul>
        )}

        <div className="flex items-end gap-1 p-2">
          {attachments && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept={UPLOAD_ACCEPT}
                className="hidden"
                onChange={onFilePicked}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || pending.length >= 5}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
                aria-label="Attach a file"
                title={pending.length >= 5 ? "Up to 5 attachments" : "Attach a file"}
              >
                <Paperclip className="h-5 w-5" />
              </button>
            </>
          )}

          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            maxLength={5000}
            placeholder={placeholder}
            onChange={handleChange}
            onKeyDown={onKeyDown}
            onBlur={stopTyping}
            className="max-h-40 min-h-9 flex-1 resize-none bg-transparent px-2 py-2 text-[15px] text-slate-900 placeholder:text-slate-400 focus:outline-none"
            aria-label="Message"
          />

          <Button onClick={submit} disabled={!canSend} loading={sending} className="h-9 px-3" aria-label="Send">
            {!sending && <SendHorizonal className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      <p className="mt-1.5 px-1 text-[11px] text-slate-400">
        <kbd className="font-sans">Enter</kbd> to send · <kbd className="font-sans">Shift + Enter</kbd> for a new line
      </p>
    </div>
  );
}
