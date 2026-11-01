"use client";

import { useCallback, useLayoutEffect, useRef } from "react";

/**
 * Keeps a chat pane pinned to the bottom for new messages (when the user is
 * already near the bottom) and preserves scroll position when older messages
 * are prepended.
 */
export function useAutoScroll(itemCount: number, firstItemId: string | undefined, resetKey: string) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const previous = useRef({ count: 0, firstId: undefined as string | undefined, height: 0, key: "" });

  const onScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  }, []);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const prev = previous.current;

    if (prev.key !== resetKey) {
      // Switched conversation: jump to the latest message.
      el.scrollTop = el.scrollHeight;
      stickToBottom.current = true;
    } else if (prev.firstId && firstItemId && prev.firstId !== firstItemId && itemCount > prev.count) {
      // Older messages were prepended: keep the viewport where it was.
      el.scrollTop += el.scrollHeight - prev.height;
    } else if (stickToBottom.current) {
      el.scrollTop = el.scrollHeight;
    }

    previous.current = { count: itemCount, firstId: firstItemId, height: el.scrollHeight, key: resetKey };
  }, [itemCount, firstItemId, resetKey]);

  const scrollToBottom = useCallback(() => {
    const el = containerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    stickToBottom.current = true;
  }, []);

  return { containerRef, onScroll, scrollToBottom };
}
