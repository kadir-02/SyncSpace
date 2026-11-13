"use client";

import { useState } from "react";
import {
  CheckCircle2,
  ClipboardCopy,
  HelpCircle,
  ListChecks,
  MessageSquareText,
  ShieldAlert,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useWorkspace } from "@/hooks/useWorkspace";
import {
  computeRange,
  toDateInputValue,
  validateRange,
  type PeriodKind,
} from "@/lib/period";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { summarizeChannel } from "@/store/slices/aiSlice";
import { toastAdded } from "@/store/slices/uiSlice";
import { setWorkspaceAi } from "@/store/slices/workspaceSlice";
import type { ChannelSummary } from "@/types";

const PERIODS: { value: PeriodKind; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "Last 7 days" },
  { value: "custom", label: "Custom" },
];

const lines = (items: string[]) => (items.length ? items.map((item) => `- ${item}`) : ["- None found"]);

// Plain-text version for the Copy button.
const toText = (summary: ChannelSummary, title: string) =>
  [
    title,
    "",
    summary.overview,
    "",
    "Important discussions",
    ...lines(summary.discussions.map((d) => `${d.topic}: ${d.summary}`)),
    "",
    "Decisions made",
    ...lines(summary.decisions.map((d) => d.decision + (d.madeBy ? ` (${d.madeBy})` : ""))),
    "",
    "Pending questions",
    ...lines(summary.pendingQuestions.map((q) => q.question + (q.askedBy ? ` (${q.askedBy})` : ""))),
    "",
    "Key action items",
    ...lines(
      summary.actionItems.map(
        (a) => a.task + (a.owner ? ` — ${a.owner}` : "") + (a.due ? `, due ${a.due}` : ""),
      ),
    ),
  ].join("\n");

function Section({
  icon,
  title,
  tone,
  empty,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  tone: string;
  empty: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
        <span className={cn("flex h-6 w-6 items-center justify-center rounded-md", tone)}>{icon}</span>
        {title}
      </h3>
      {empty ? <p className="text-sm text-slate-400">None found</p> : children}
    </section>
  );
}

export function ChannelSummaryPanel({
  channelId,
  channelName,
  onClose,
}: {
  channelId: string;
  channelName: string;
  onClose: () => void;
}) {
  const dispatch = useAppDispatch();
  const { workspaceId, workspace, isAdmin } = useWorkspace();
  const status = useAppSelector((state) => state.ai.status);
  const entry = useAppSelector((state) => state.ai.summaries[channelId]);

  const today = toDateInputValue(new Date());
  const [kind, setKind] = useState<PeriodKind>("today");
  const [custom, setCustom] = useState({ from: today, to: today });
  const [formError, setFormError] = useState<string | null>(null);
  const [enabling, setEnabling] = useState(false);

  const maxDays = status?.maxRangeDays ?? 30;

  const generate = () => {
    const range = computeRange(kind, custom);
    const problem = validateRange(range, maxDays);

    setFormError(problem);
    if (problem || !range) return;

    dispatch(
      summarizeChannel({
        channelId,
        from: range.from.toISOString(),
        to: range.to.toISOString(),
        label: range.label,
      }),
    );
  };

  const enableAi = async () => {
    setEnabling(true);

    try {
      await dispatch(setWorkspaceAi({ workspaceId, aiEnabled: true })).unwrap();
      dispatch(toastAdded({ kind: "success", title: "AI features enabled for this workspace" }));
    } catch (message) {
      dispatch(
        toastAdded({ kind: "error", title: typeof message === "string" ? message : "Could not enable AI" }),
      );
    } finally {
      setEnabling(false);
    }
  };

  const copy = async (summary: ChannelSummary) => {
    try {
      await navigator.clipboard.writeText(toText(summary, `AI summary of #${channelName} — ${entry?.label ?? ""}`));
      dispatch(toastAdded({ kind: "success", title: "Summary copied" }));
    } catch {
      dispatch(toastAdded({ kind: "error", title: "Could not copy to the clipboard" }));
    }
  };

  const loading = entry?.status === "loading";
  const result = entry?.result;

  let gate: React.ReactNode = null;

  if (status && !status.configured) {
    gate = (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-medium">AI isn&apos;t set up on this server yet.</p>
        <p className="mt-1">
          {isAdmin
            ? "Add AI_PROVIDER and AI_API_KEY to the backend .env (a free Groq key works), then restart it."
            : "Ask whoever runs the server to configure an AI provider."}
        </p>
      </div>
    );
  } else if (workspace && !workspace.aiEnabled) {
    gate = (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        <p className="flex items-center gap-2 font-medium text-slate-900">
          <ShieldAlert className="h-4 w-4" /> AI is off for this workspace
        </p>
        <p className="mt-1">
          Summaries send the selected channel messages to a third-party AI provider, so an admin has to turn
          this on first.
        </p>
        {isAdmin ? (
          <Button className="mt-3" size="sm" loading={enabling} onClick={enableAi}>
            Enable AI features
          </Button>
        ) : (
          <p className="mt-2 text-slate-500">Ask a workspace admin to enable it.</p>
        )}
      </div>
    );
  }

  return (
    <aside className="flex h-full w-full flex-col border-l border-slate-200 bg-slate-50 sm:w-96">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Sparkles className="h-4 w-4 text-violet-600" /> AI channel summary
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label="Close summary"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="scroll-slim min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        <p className="text-sm text-slate-500">
          Summarize <span className="font-medium text-slate-700">#{channelName}</span> for a period of your
          choice.
        </p>

        {gate ?? (
          <>
            <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
              <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1" role="tablist">
                {PERIODS.map((period) => (
                  <button
                    key={period.value}
                    type="button"
                    role="tab"
                    aria-selected={kind === period.value}
                    onClick={() => {
                      setKind(period.value);
                      setFormError(null);
                    }}
                    className={cn(
                      "rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                      kind === period.value
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-800",
                    )}
                  >
                    {period.label}
                  </button>
                ))}
              </div>

              {kind === "custom" && (
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs text-slate-500">
                    From
                    <input
                      type="date"
                      max={today}
                      value={custom.from}
                      onChange={(event) => setCustom((c) => ({ ...c, from: event.target.value }))}
                      className="mt-1 h-9 w-full rounded-lg border border-slate-300 px-2 text-sm text-slate-900"
                    />
                  </label>
                  <label className="text-xs text-slate-500">
                    To
                    <input
                      type="date"
                      max={today}
                      value={custom.to}
                      onChange={(event) => setCustom((c) => ({ ...c, to: event.target.value }))}
                      className="mt-1 h-9 w-full rounded-lg border border-slate-300 px-2 text-sm text-slate-900"
                    />
                  </label>
                  <p className="col-span-2 text-[11px] text-slate-400">Up to {maxDays} days at a time.</p>
                </div>
              )}

              {formError && <p className="text-xs text-rose-600">{formError}</p>}

              <Button className="w-full" onClick={generate} loading={loading}>
                <Sparkles className="h-4 w-4" /> {result ? "Generate again" : "Generate summary"}
              </Button>
            </div>

            {loading && !result && (
              <div className="flex flex-col items-center gap-2 py-8 text-sm text-slate-500">
                <Spinner className="h-6 w-6" />
                Reading the conversation…
              </div>
            )}

            {entry?.status === "error" && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700" role="alert">
                {entry.error}
              </div>
            )}

            {result && (
              <div className={cn("space-y-3", loading && "opacity-50")}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    {entry?.label}
                  </p>
                  <Button variant="ghost" size="sm" onClick={() => copy(result.summary)}>
                    <ClipboardCopy className="h-4 w-4" /> Copy
                  </Button>
                </div>

                {result.summary.overview && (
                  <p className="rounded-xl bg-violet-50 p-3 text-sm leading-relaxed text-violet-950">
                    {result.summary.overview}
                  </p>
                )}

                <Section
                  icon={<MessageSquareText className="h-3.5 w-3.5" />}
                  title="Important discussions"
                  tone="bg-violet-100 text-violet-600"
                  empty={result.summary.discussions.length === 0}
                >
                  <ul className="space-y-3">
                    {result.summary.discussions.map((item, index) => (
                      <li key={index}>
                        <p className="text-sm font-medium text-slate-900">{item.topic}</p>
                        <p className="text-sm text-slate-600">{item.summary}</p>
                        {item.participants.length > 0 && (
                          <p className="mt-0.5 text-xs text-slate-400">{item.participants.join(", ")}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                </Section>

                <Section
                  icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                  title="Decisions made"
                  tone="bg-emerald-100 text-emerald-600"
                  empty={result.summary.decisions.length === 0}
                >
                  <ul className="space-y-2">
                    {result.summary.decisions.map((item, index) => (
                      <li key={index} className="text-sm text-slate-700">
                        {item.decision}
                        {item.madeBy && <span className="text-slate-400"> — {item.madeBy}</span>}
                      </li>
                    ))}
                  </ul>
                </Section>

                <Section
                  icon={<HelpCircle className="h-3.5 w-3.5" />}
                  title="Pending questions"
                  tone="bg-amber-100 text-amber-600"
                  empty={result.summary.pendingQuestions.length === 0}
                >
                  <ul className="space-y-2">
                    {result.summary.pendingQuestions.map((item, index) => (
                      <li key={index} className="text-sm text-slate-700">
                        {item.question}
                        {item.askedBy && <span className="text-slate-400"> — {item.askedBy}</span>}
                      </li>
                    ))}
                  </ul>
                </Section>

                <Section
                  icon={<ListChecks className="h-3.5 w-3.5" />}
                  title="Key action items"
                  tone="bg-rose-100 text-rose-600"
                  empty={result.summary.actionItems.length === 0}
                >
                  <ul className="space-y-2">
                    {result.summary.actionItems.map((item, index) => (
                      <li key={index} className="text-sm text-slate-700">
                        {item.task}
                        {(item.owner || item.due) && (
                          <span className="block text-xs text-slate-400">
                            {[item.owner, item.due && `due ${item.due}`].filter(Boolean).join(" · ")}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </Section>

                <p className="px-1 text-[11px] leading-relaxed text-slate-400">
                  Summarised {result.meta.includedMessages} of {result.meta.totalMessages} messages
                  {result.meta.includedMessages < result.meta.totalMessages &&
                    " (the most recent ones — try a shorter period to cover everything)"}
                  {result.meta.cached && " · saved result"}. AI can make mistakes; check important details.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
