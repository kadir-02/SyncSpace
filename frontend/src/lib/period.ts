export type PeriodKind = "today" | "week" | "custom";

export interface PeriodRange {
  from: Date;
  to: Date;
  label: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

// "YYYY-MM-DD" (from <input type="date">) -> local midnight / end of that day.
const parseLocalDate = (value: string, endOfDay: boolean) => {
  const [year, month, day] = value.split("-").map(Number);
  return endOfDay
    ? new Date(year, month - 1, day, 23, 59, 59, 999)
    : new Date(year, month - 1, day, 0, 0, 0, 0);
};

export const toDateInputValue = (date: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

/**
 * Boundaries are computed in the user's own timezone, so "Today" means their
 * today. The server only receives exact instants.
 */
export function computeRange(
  kind: PeriodKind,
  custom: { from: string; to: string },
  now = new Date(),
): PeriodRange | null {
  if (kind === "today") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return { from: start, to: now, label: "Today" };
  }

  if (kind === "week") {
    return { from: new Date(now.getTime() - 7 * DAY_MS), to: now, label: "Last 7 days" };
  }

  if (!custom.from || !custom.to) return null;

  const from = parseLocalDate(custom.from, false);
  const end = parseLocalDate(custom.to, true);
  const to = end > now ? now : end;

  return {
    from,
    to,
    label:
      custom.from === custom.to
        ? from.toLocaleDateString()
        : `${from.toLocaleDateString()} – ${end.toLocaleDateString()}`,
  };
}

export function validateRange(range: PeriodRange | null, maxDays: number): string | null {
  if (!range) return "Pick a start and end date";
  if (range.from >= range.to) return "The start must be before the end";
  if (range.to.getTime() - range.from.getTime() > maxDays * DAY_MS) {
    return `Choose a period of ${maxDays} days or less`;
  }
  return null;
}
