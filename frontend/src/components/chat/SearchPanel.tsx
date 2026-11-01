"use client";

import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Input } from "@/components/ui/Field";
import { Spinner } from "@/components/ui/Spinner";
import { useUserResolver } from "@/hooks/useUserResolver";
import { formatRelative } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { searchCleared, searchMessages } from "@/store/slices/messageSlice";

export function SearchPanel({ channelId, onClose }: { channelId: string; onClose: () => void }) {
  const dispatch = useAppDispatch();
  const resolve = useUserResolver();
  const search = useAppSelector((state) => state.messages.search);
  const [query, setQuery] = useState("");

  // Debounce so we don't query on every keystroke.
  useEffect(() => {
    const term = query.trim();

    if (!term) {
      dispatch(searchCleared());
      return;
    }

    const timer = setTimeout(() => dispatch(searchMessages({ channelId, query: term })), 300);
    return () => clearTimeout(timer);
  }, [query, channelId, dispatch]);

  useEffect(() => () => void dispatch(searchCleared()), [dispatch]);

  const hasQuery = query.trim().length > 0;

  return (
    <aside className="flex h-full w-full flex-col border-l border-slate-200 bg-white sm:w-80">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">Search this channel</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label="Close search"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            autoFocus
            className="pl-9"
            placeholder="Search messages"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </div>

      <div className="scroll-slim min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        {search.status === "loading" && (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        )}

        {search.status === "error" && (
          <p className="py-6 text-center text-sm text-rose-600">{search.error}</p>
        )}

        {hasQuery && search.status === "ready" && search.results.length === 0 && (
          <p className="py-6 text-center text-sm text-slate-500">No messages match “{query.trim()}”.</p>
        )}

        {!hasQuery && (
          <p className="py-6 text-center text-sm text-slate-400">Type to search message text.</p>
        )}

        {hasQuery && search.status === "ready" && search.results.length > 0 && (
          <>
            <p className="px-1 pb-2 text-xs text-slate-500">
              {search.total} result{search.total === 1 ? "" : "s"}
            </p>
            <ul className="space-y-2">
              {search.results.map((message) => {
                const sender = resolve(message.sender);

                return (
                  <li key={message.id} className="rounded-lg border border-slate-200 p-3">
                    <div className="mb-1 flex items-center gap-2">
                      <Avatar id={sender.id} name={sender.name} src={sender.avatar} size="xs" />
                      <span className="truncate text-xs font-semibold text-slate-800">{sender.name}</span>
                      <span className="ml-auto shrink-0 text-[11px] text-slate-400">
                        {formatRelative(message.createdAt)}
                      </span>
                    </div>
                    <p className="line-clamp-4 whitespace-pre-wrap break-words text-sm text-slate-700">
                      {message.content}
                    </p>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </aside>
  );
}
