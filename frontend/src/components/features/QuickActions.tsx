"use client";

import { Focus, Search, Sparkles, Command, X, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  focusModeToggled,
  paletteToggled,
  quickActionsToggled,
  shortcutsToggled,
  sidePanelChanged,
  toastAdded,
} from "@/store/slices/uiSlice";

/** Floating ⚡ button with a panel of power-user actions. */
export function QuickActions() {
  const dispatch = useAppDispatch();
  const open = useAppSelector((state) => state.ui.quickActionsOpen);
  const focusMode = useAppSelector((state) => state.ui.focusMode);
  const activeChat = useAppSelector((state) => state.ui.activeChat);

  const askAssistant = () => {
    if (activeChat?.type === "channel") {
      dispatch(sidePanelChanged({ type: "summary", channelId: activeChat.id }));
    } else {
      dispatch(quickActionsToggled(false));
      dispatch(
        toastAdded({
          kind: "info",
          title: "Open a channel first",
          description: "The AI assistant summarizes the channel you're viewing.",
        }),
      );
    }
  };

  const actions = [
    {
      icon: <Search className="h-5 w-5" />,
      title: "Smart Search",
      hint: "Ctrl+K",
      onClick: () => dispatch(paletteToggled(true)),
    },
    {
      icon: <Focus className="h-5 w-5" />,
      title: focusMode ? "Exit Focus Mode" : "Focus Mode",
      hint: "Ctrl+Shift+F",
      onClick: () => dispatch(focusModeToggled()),
    },
    {
      icon: <Command className="h-5 w-5" />,
      title: "Shortcuts",
      hint: "Ctrl+/",
      onClick: () => dispatch(shortcutsToggled(true)),
    },
    {
      icon: <Sparkles className="h-5 w-5" />,
      title: "AI Assistant",
      hint: "Ctrl+Shift+A",
      onClick: askAssistant,
    },
  ];

  return (
    <>
      {open && (
        <div
          className="pop-in fixed bottom-24 right-4 z-40 w-[calc(100vw-2rem)] max-w-xs rounded-3xl border border-white/10 bg-slate-900 p-4 shadow-2xl sm:right-6"
          role="dialog"
          aria-label="Quick actions"
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">Quick Actions</h2>
            <div className="flex items-center gap-2">
              <kbd className="rounded-md border border-white/15 px-2 py-0.5 text-[11px] text-slate-400">Esc</kbd>
              <button
                type="button"
                onClick={() => dispatch(quickActionsToggled(false))}
                className="rounded-md p-1 text-slate-400 hover:bg-white/10 hover:text-white"
                aria-label="Close quick actions"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <ul className="space-y-2.5">
            {actions.map((action) => (
              <li key={action.title}>
                <button
                  type="button"
                  onClick={action.onClick}
                  className="flex w-full items-center gap-4 rounded-2xl bg-slate-700/50 px-4 py-3.5 text-left transition-colors hover:bg-slate-700"
                >
                  <span className="text-slate-300">{action.icon}</span>
                  <span>
                    <span className="block text-sm font-bold text-white">{action.title}</span>
                    <span className="block text-xs text-slate-400">{action.hint}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="button"
        onClick={() => dispatch(quickActionsToggled())}
        className={cn(
          "bg-brand-gradient fixed bottom-6 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg shadow-violet-900/30",
          "transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-300",
        )}
        aria-label="Quick actions"
        aria-expanded={open}
      >
        {open ? <X className="h-6 w-6" /> : <Zap className="h-6 w-6" />}
      </button>
    </>
  );
}
