"use client";

import { Modal } from "@/components/ui/Modal";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { shortcutsToggled } from "@/store/slices/uiSlice";

const SHORTCUTS: { keys: string; action: string }[] = [
  { keys: "Ctrl + K", action: "Smart search: jump to any channel, person or page" },
  { keys: "Ctrl + Shift + F", action: "Toggle focus mode (hide the sidebar and quiet pop-ups)" },
  { keys: "Ctrl + Shift + A", action: "AI assistant: summarize the channel you're viewing" },
  { keys: "Ctrl + /", action: "Show this list" },
  { keys: "Enter", action: "Send message" },
  { keys: "Shift + Enter", action: "New line in a message" },
  { keys: "Esc", action: "Close the open panel or dialog" },
];

export function ShortcutsModal() {
  const dispatch = useAppDispatch();
  const open = useAppSelector((state) => state.ui.shortcutsOpen);

  return (
    <Modal
      open={open}
      onClose={() => dispatch(shortcutsToggled(false))}
      title="Keyboard shortcuts"
      description="On Mac, use Cmd instead of Ctrl."
    >
      <ul className="divide-y divide-slate-100">
        {SHORTCUTS.map((shortcut) => (
          <li key={shortcut.keys} className="flex items-center justify-between gap-4 py-3">
            <span className="text-sm text-slate-700">{shortcut.action}</span>
            <kbd className="shrink-0 rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
              {shortcut.keys}
            </kbd>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
