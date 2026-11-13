"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CornerDownLeft,
  FileText,
  Hash,
  LayoutDashboard,
  Lock,
  MessageCircle,
  Search,
  User,
  Users,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { useWorkspace } from "@/hooks/useWorkspace";
import { otherParticipant } from "@/lib/conversation";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { paletteToggled, profileOpened } from "@/store/slices/uiSlice";

interface Item {
  id: string;
  group: "Pages" | "Channels" | "Teams" | "Direct messages" | "People";
  label: string;
  hint?: string;
  icon: React.ReactNode;
  run: () => void;
}

const GROUP_ORDER: Item["group"][] = ["Pages", "Channels", "Teams", "Direct messages", "People"];
const MAX_PER_GROUP = 6;

/** Ctrl+K: jump to any page, channel, team, conversation or person. */
export function CommandPalette() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { workspaceId, teams, members, me } = useWorkspace();
  const channelsByTeam = useAppSelector((state) => state.channels.byTeam);
  const conversations = useAppSelector((state) => state.dm.conversations);

  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  const go = (href: string) => {
    dispatch(paletteToggled(false));
    router.push(href);
  };

  const items = useMemo<Item[]>(() => {
    const base = `/w/${workspaceId}`;
    const all: Item[] = [
      { id: "p-dash", group: "Pages", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" />, run: () => go(base) },
      { id: "p-notif", group: "Pages", label: "Notifications", icon: <Bell className="h-4 w-4" />, run: () => go(`${base}/notifications`) },
      { id: "p-files", group: "Pages", label: "Files", icon: <FileText className="h-4 w-4" />, run: () => go(`${base}/files`) },
      { id: "p-people", group: "Pages", label: "People", icon: <Users className="h-4 w-4" />, run: () => go(`${base}/members`) },
      { id: "p-profile", group: "Pages", label: "Your profile", icon: <User className="h-4 w-4" />, run: () => go(`${base}/profile`) },
    ];

    for (const team of teams) {
      all.push({
        id: `t-${team.id}`,
        group: "Teams",
        label: team.name,
        icon: <Users className="h-4 w-4" />,
        run: () => go(`${base}/teams/${team.id}`),
      });

      for (const channel of channelsByTeam[team.id] ?? []) {
        all.push({
          id: `c-${channel.id}`,
          group: "Channels",
          label: channel.name,
          hint: team.name,
          icon: channel.type === "private" ? <Lock className="h-4 w-4" /> : <Hash className="h-4 w-4" />,
          run: () => go(`${base}/c/${channel.id}`),
        });
      }
    }

    for (const conversation of conversations) {
      const other = otherParticipant(conversation, me?.id);
      all.push({
        id: `d-${conversation.id}`,
        group: "Direct messages",
        label: other?.name ?? "Unknown",
        hint: other?.email,
        icon: <MessageCircle className="h-4 w-4" />,
        run: () => go(`${base}/dm/${conversation.id}`),
      });
    }

    for (const member of members) {
      if (member.userId === me?.id) continue;
      all.push({
        id: `u-${member.userId}`,
        group: "People",
        label: member.name,
        hint: member.email,
        icon: <Avatar id={member.userId} name={member.name} src={member.avatar} size="xs" />,
        run: () => {
          dispatch(paletteToggled(false));
          dispatch(profileOpened(member.userId));
        },
      });
    }

    const term = query.trim().toLowerCase();
    const matches = term
      ? all.filter((item) => `${item.label} ${item.hint ?? ""}`.toLowerCase().includes(term))
      : all;

    // Keep each group short, in a stable order.
    return GROUP_ORDER.flatMap((group) =>
      matches.filter((item) => item.group === group).slice(0, MAX_PER_GROUP),
    );
    // `go` only closes over stable values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, teams, channelsByTeam, conversations, members, me?.id, query]);

  const current = Math.min(active, Math.max(items.length - 1, 0));

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      dispatch(paletteToggled(false));
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      const next = (current + step + items.length) % Math.max(items.length, 1);
      setActive(next);
      listRef.current?.querySelector(`[data-index="${next}"]`)?.scrollIntoView({ block: "nearest" });
    } else if (event.key === "Enter") {
      event.preventDefault();
      items[current]?.run();
    }
  };

  return (
    <div
      className="fade-in fixed inset-0 z-50 flex items-start justify-center bg-slate-950/60 p-4 pt-[12vh] backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) dispatch(paletteToggled(false));
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Smart search"
    >
      <div className="pop-in w-full max-w-xl overflow-hidden rounded-3xl bg-slate-900 shadow-2xl ring-1 ring-white/10" onKeyDown={onKeyDown}>
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
          <Search className="h-5 w-5 text-slate-400" />
          <input
            autoFocus
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            placeholder="Search channels, people, pages…"
            className="flex-1 bg-transparent text-base text-white placeholder:text-slate-500 focus:outline-none"
            aria-label="Search"
          />
          <kbd className="rounded-md border border-white/15 px-2 py-0.5 text-[11px] text-slate-400">Esc</kbd>
        </div>

        <ul ref={listRef} className="scroll-slim-dark max-h-[50vh] overflow-y-auto p-2">
          {items.length === 0 && (
            <li className="px-4 py-10 text-center text-sm text-slate-400">Nothing matches “{query.trim()}”.</li>
          )}

          {items.map((item, index) => {
            const heading = index === 0 || items[index - 1].group !== item.group ? item.group : null;

            return (
              <li key={item.id}>
                {heading && (
                  <p className="px-3 pb-1 pt-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">{heading}</p>
                )}
                <button
                  type="button"
                  data-index={index}
                  onClick={item.run}
                  onMouseMove={() => setActive(index)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                    index === current ? "bg-violet-600/30 text-white" : "text-slate-300 hover:bg-white/5",
                  )}
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center text-slate-400">{item.icon}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.label}</span>
                  {item.hint && <span className="hidden truncate text-xs text-slate-500 sm:block">{item.hint}</span>}
                  {index === current && <CornerDownLeft className="h-3.5 w-3.5 text-slate-400" />}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-4 border-t border-white/10 px-5 py-2.5 text-[11px] text-slate-500">
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  );
}
