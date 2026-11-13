"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Hash, Search, Trash2, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useWorkspace } from "@/hooks/useWorkspace";
import { cn, formatRelative } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  deleteNotification,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/store/slices/notificationSlice";
import type { AppNotification } from "@/types";

type Filter = "all" | "unread" | "invites" | "mentions" | "system";

const INVITE_TYPES: AppNotification["type"][] = ["workspace_invite", "team_invite", "channel_invite"];

const ICONS: Partial<Record<AppNotification["type"], React.ReactNode>> = {
  workspace_invite: <UserPlus className="h-4 w-4" />,
  team_invite: <Users className="h-4 w-4" />,
  channel_invite: <Hash className="h-4 w-4" />,
};

const matches = (notification: AppNotification, filter: Filter) => {
  switch (filter) {
    case "unread":
      return !notification.isRead;
    case "invites":
      return INVITE_TYPES.includes(notification.type);
    case "mentions":
      return notification.type === "mention";
    case "system":
      return notification.type === "system";
    default:
      return true;
  }
};

export default function NotificationsPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { workspaceId } = useWorkspace();
  const { items, status } = useAppSelector((state) => state.notifications);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const counts = useMemo(
    () => ({
      all: items.length,
      unread: items.filter((item) => !item.isRead).length,
      invites: items.filter((item) => INVITE_TYPES.includes(item.type)).length,
      mentions: items.filter((item) => item.type === "mention").length,
      system: items.filter((item) => item.type === "system").length,
    }),
    [items],
  );

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();

    return items.filter(
      (item) =>
        matches(item, filter) &&
        (!term || `${item.title} ${item.message}`.toLowerCase().includes(term)),
    );
  }, [items, filter, query]);

  // Best-effort deep link for each kind of activity.
  const hrefFor = (notification: AppNotification): string | null => {
    const channelId =
      typeof notification.channel === "string" ? notification.channel : notification.channel?.id;

    switch (notification.type) {
      case "workspace_invite":
        return notification.resourceId ? `/w/${notification.resourceId}` : null;
      case "team_invite":
        return notification.resourceId ? `/w/${workspaceId}/teams/${notification.resourceId}` : null;
      case "channel_invite":
        return channelId ? `/w/${workspaceId}/c/${channelId}` : null;
      default:
        return null;
    }
  };

  const open = (notification: AppNotification) => {
    if (!notification.isRead) dispatch(markNotificationRead(notification.id));

    const href = hrefFor(notification);
    if (href) router.push(href);
  };

  const chips: { value: Filter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "unread", label: "Unread" },
    { value: "invites", label: "Invites" },
    { value: "mentions", label: "Mentions" },
    { value: "system", label: "System" },
  ];

  const stats = [
    { label: "Total", value: counts.all, tone: "text-violet-700" },
    { label: "Unread", value: counts.unread, tone: "text-rose-600" },
    { label: "Invites", value: counts.invites, tone: "text-blue-600" },
    { label: "Mentions", value: counts.mentions, tone: "text-fuchsia-600" },
    { label: "System", value: counts.system, tone: "text-emerald-600" },
  ];

  return (
    <div className="scroll-slim h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl space-y-6 px-5 py-8 lg:px-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-violet-700 lg:text-4xl">Notifications</h1>
            <p className="mt-1 text-slate-600">Stay updated with your team activities</p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search notifications…"
              className="h-11 w-full rounded-full border border-slate-300/80 bg-white/70 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              aria-label="Search notifications"
            />
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <button
              key={chip.value}
              type="button"
              onClick={() => setFilter(chip.value)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                filter === chip.value
                  ? "border-violet-300 bg-violet-100 text-violet-700"
                  : "border-slate-300/80 bg-white/60 text-slate-600 hover:bg-white",
              )}
            >
              {chip.label} ({counts[chip.value]})
            </button>
          ))}
          {counts.unread > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto"
              onClick={() => dispatch(markAllNotificationsRead())}
            >
              <CheckCheck className="h-4 w-4" /> Mark all read
            </Button>
          )}
        </div>

        <section className="rounded-3xl bg-white/80 shadow-sm ring-1 ring-slate-200/60">
          {status === "loading" || status === "idle" ? (
            <div className="flex justify-center py-16">
              <Spinner className="h-6 w-6" />
            </div>
          ) : visible.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-16 text-center">
              <Bell className="h-10 w-10 text-slate-300" />
              <p className="mt-3 text-slate-500">
                {items.length === 0 ? "No notifications yet." : "Nothing matches your filter."}
              </p>
              {items.length === 0 && (
                <p className="mt-1 max-w-sm text-sm text-slate-400">
                  Invites to workspaces, teams and private channels show up here.
                </p>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {visible.map((notification) => (
                <li
                  key={notification.id}
                  className={cn("group flex items-start gap-3 px-5 py-4", !notification.isRead && "bg-violet-50/60")}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                      notification.isRead ? "bg-slate-100 text-slate-500" : "bg-violet-100 text-violet-600",
                    )}
                  >
                    {ICONS[notification.type] ?? <Bell className="h-4 w-4" />}
                  </span>

                  <button type="button" onClick={() => open(notification)} className="min-w-0 flex-1 text-left">
                    <p className="text-sm font-bold text-slate-900">{notification.title}</p>
                    <p className="mt-0.5 text-sm text-slate-600">{notification.message}</p>
                    <p className="mt-1 text-xs text-slate-400">{formatRelative(notification.createdAt)}</p>
                  </button>

                  {!notification.isRead && <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-violet-500" />}

                  <button
                    type="button"
                    onClick={() => dispatch(deleteNotification(notification.id))}
                    className="rounded-md p-1.5 text-slate-400 opacity-0 hover:bg-slate-100 hover:text-rose-600 focus:opacity-100 group-hover:opacity-100 pointer-coarse:opacity-100"
                    aria-label="Delete notification"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-2xl bg-white/80 p-5 shadow-sm ring-1 ring-slate-200/60">
              <p className="text-sm font-medium text-slate-600">{stat.label}</p>
              <p className={cn("mt-2 text-3xl font-bold", stat.tone)}>{stat.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
