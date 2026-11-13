"use client";

import { useEffect } from "react";
import { useAppDispatch, useAppStore } from "@/store/hooks";
import {
  focusModeToggled,
  paletteToggled,
  quickActionsToggled,
  shortcutsToggled,
  sidePanelChanged,
  toastAdded,
} from "@/store/slices/uiSlice";

/** Keyboard shortcuts available anywhere inside a workspace. */
export function useGlobalShortcuts() {
  const dispatch = useAppDispatch();
  const store = useAppStore();

  useEffect(() => {
    const askAssistant = () => {
      const { activeChat } = store.getState().ui;

      if (activeChat?.type === "channel") {
        dispatch(sidePanelChanged({ type: "summary", channelId: activeChat.id }));
      } else {
        dispatch(
          toastAdded({ kind: "info", title: "Open a channel first", description: "The AI assistant summarizes the channel you're viewing." }),
        );
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const mod = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();

      if (mod && !event.shiftKey && key === "k") {
        event.preventDefault();
        dispatch(paletteToggled());
      } else if (mod && event.shiftKey && key === "f") {
        event.preventDefault();
        dispatch(focusModeToggled());
      } else if (mod && !event.shiftKey && key === "/") {
        event.preventDefault();
        dispatch(shortcutsToggled());
      } else if (mod && event.shiftKey && key === "a") {
        event.preventDefault();
        askAssistant();
      } else if (key === "escape") {
        const { quickActionsOpen } = store.getState().ui;
        if (quickActionsOpen) dispatch(quickActionsToggled(false));
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dispatch, store]);
}
