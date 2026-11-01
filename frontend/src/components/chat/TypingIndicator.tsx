"use client";

import { useAppSelector } from "@/store/hooks";

export function TypingIndicator({ chatKey }: { chatKey: string }) {
  const entries = useAppSelector((state) => state.presence.typing[chatKey]);
  const names = entries ? Object.values(entries).map((entry) => entry.name) : [];

  let label = "";
  if (names.length === 1) label = `${names[0]} is typing`;
  else if (names.length === 2) label = `${names[0]} and ${names[1]} are typing`;
  else if (names.length > 2) label = "Several people are typing";

  return (
    <div className="h-5 px-5 text-xs text-slate-500" aria-live="polite">
      {label && (
        <span className="inline-flex items-center gap-1.5">
          <span className="flex gap-0.5">
            {[0, 150, 300].map((delay) => (
              <span
                key={delay}
                className="h-1 w-1 animate-bounce rounded-full bg-slate-400"
                style={{ animationDelay: `${delay}ms` }}
              />
            ))}
          </span>
          {label}…
        </span>
      )}
    </div>
  );
}
