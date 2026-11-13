import type { ReactNode } from "react";

const URL_PATTERN = /(https?:\/\/[^\s<]+[^\s<.,;:!?)\]}'"])/g;

/** Turns bare URLs in plain text into links, leaving everything else as text (no HTML injection). */
export function linkify(text: string): ReactNode[] {
  return text.split(URL_PATTERN).map((part, index) =>
    index % 2 === 1 ? (
      <a
        key={index}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="text-violet-600 underline decoration-violet-300 hover:decoration-violet-600"
      >
        {part}
      </a>
    ) : (
      part
    ),
  );
}
