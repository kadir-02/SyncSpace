"use client";

import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Hash, Trash2, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { useWorkspace } from "@/hooks/useWorkspace";
import { cn, formatRelative } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  deleteNotification,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/store/slices/notificationSlice";
import { selectUnreadActivityCount } from "@/store/selectors";
import type { AppNotification } from "@/types";

const ICONS: Partial<Record<AppNotification["type"], React.ReactNode>> = {
  workspace_invite: <UserPlus className="h-4 w-4" />,
  team_invite: <Users className="h-4 w-4" />,
  channel_invite: <Hash className="h-4 w-4" />,
};

export default function NotificationsPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { workspaceId } = useWorkspace();
  const { items, status } = useAppSelector((state) => state.notifications);
  const unread = useAppSelector(selectUnreadActivityCount);

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

  return (
    <div className="scroll-slim h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl space-y-6 px-5 py-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Activity</h1>
            <p className="mt-1 text-sm text-slate-500">
              {unread > 0 ? `${unread} unread` : "You're all caught up"}
            </p>
          </div>
          {unread > 0 && (
            <Button variant="secondary" size="sm" onClick={() => dispatch(markAllNotificationsRead())}>
              <CheckCheck className="h-4 w-4" /> Mark all read
            </Button>
          )}
        </header>

        {status === "loading" || status === "idle" ? (
          <div className="flex justify-center py-10">
            <Spinner className="h-6 w-6" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Bell className="h-6 w-6" />}
            title="Nothing here yet"
            description="Invites to workspaces, teams and private channels show up here."
          />
        ) : (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {items.map((notification) => (
              <li
                key={notification.id}
                className={cn("group flex items-start gap-3 px-4 py-3", !notification.isRead && "bg-indigo-50/50")}
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                    notification.isRead ? "bg-slate-100 text-slate-500" : "bg-indigo-100 text-indigo-600",
                  )}
                >
                  {ICONS[notification.type] ?? <Bell className="h-4 w-4" />}
                </span>

                <button type="button" onClick={() => open(notification)} className="min-w-0 flex-1 text-left">
                  <p className="text-sm font-medium text-slate-900">{notification.title}</p>
                  <p className="mt-0.5 text-sm text-slate-600">{notification.message}</p>
                  <p className="mt-1 text-xs text-slate-400">{formatRelative(notification.createdAt)}</p>
                </button>

                {!notification.isRead && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-indigo-500" />}

                <button
                  type="button"
                  onClick={() => dispatch(deleteNotification(notification.id))}
                  className="rounded-md p-1.5 text-slate-400 opacity-0 hover:bg-slate-100 hover:text-rose-600 focus:opacity-100 group-hover:opacity-100"
                  aria-label="Delete notification"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
