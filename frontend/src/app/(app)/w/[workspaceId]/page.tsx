"use client";

import Link from "next/link";
import {
  Bell,
  Hash,
  Lock,
  MessageCircle,
  Sparkles,
  Users,
  UsersRound,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { CountBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FullScreenSpinner } from "@/components/ui/Spinner";
import { useWorkspace } from "@/hooks/useWorkspace";
import { otherParticipant } from "@/lib/conversation";
import { useAppSelector } from "@/store/hooks";
import { selectUnreadActivityCount } from "@/store/selectors";

function Stat({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: number | string;
  tone: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-600">{label}</p>
        <span className="text-slate-400">{icon}</span>
      </div>
      <p className={`mt-2 text-3xl font-bold ${tone}`}>{value}</p>
    </div>
  );
}

function Card({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-900">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export default function DashboardPage() {
  const { workspaceId, workspace, teams, members, me, isAdmin } = useWorkspace();
  const teamsStatus = useAppSelector((state) => state.teams.status[workspaceId]);
  const channelsByTeam = useAppSelector((state) => state.channels.byTeam);
  const unread = useAppSelector((state) => state.unread);
  const online = useAppSelector((state) => state.presence.online);
  const conversations = useAppSelector((state) => state.dm.conversations);
  const activityUnread = useAppSelector(selectUnreadActivityCount);

  if (teamsStatus !== "ready") return <FullScreenSpinner />;

  const base = `/w/${workspaceId}`;
  const channels = teams
    .filter((team) => team.isMember)
    .flatMap((team) =>
      (channelsByTeam[team.id] ?? []).map((channel) => ({ ...channel, teamName: team.name })),
    );

  const channelUnread = channels.reduce((sum, channel) => sum + (unread.channels[channel.id] ?? 0), 0);
  const dmUnread = Object.values(unread.dms).reduce((sum, ids) => sum + ids.length, 0);
  const onlineCount = members.filter((member) => online[member.userId] || member.userId === me?.id).length;

  const busyChannels = channels
    .filter((channel) => (unread.channels[channel.id] ?? 0) > 0)
    .sort((a, b) => (unread.channels[b.id] ?? 0) - (unread.channels[a.id] ?? 0))
    .slice(0, 5);

  const recentDms = conversations.slice(0, 5);
  const firstName = me?.name.split(" ")[0] ?? "there";

  return (
    <div className="scroll-slim h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl space-y-6 px-5 py-8 lg:px-8">
        <header>
          <h1 className="text-3xl font-bold text-violet-700 lg:text-4xl">Dashboard</h1>
          <p className="mt-1 text-slate-600">
            Welcome back, {firstName}. Here&apos;s what&apos;s happening in{" "}
            <span className="font-medium text-slate-800">{workspace?.name}</span>.
          </p>
        </header>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <Stat label="Unread" value={channelUnread + dmUnread} tone="text-rose-600" icon={<MessageCircle className="h-4 w-4" />} />
          <Stat label="Channels" value={channels.length} tone="text-violet-700" icon={<Hash className="h-4 w-4" />} />
          <Stat label="Teams" value={teams.length} tone="text-blue-600" icon={<UsersRound className="h-4 w-4" />} />
          <Stat label="People online" value={`${onlineCount}/${members.length}`} tone="text-emerald-600" icon={<Users className="h-4 w-4" />} />
          <Stat label="Notifications" value={activityUnread} tone="text-fuchsia-600" icon={<Bell className="h-4 w-4" />} />
        </div>

        {teams.length === 0 ? (
          <Card title="Get started">
            <p className="text-sm text-slate-600">
              {isAdmin
                ? "Create a team from the sidebar, add a channel inside it, then invite people from the People page."
                : "No teams exist yet. An admin will add you once they're set up."}
            </p>
            <Link href={`${base}/members`} className="mt-4 inline-block">
              <Button variant="secondary">View people</Button>
            </Link>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Jump back in">
              {busyChannels.length > 0 ? (
                <ul className="space-y-1">
                  {busyChannels.map((channel) => (
                    <li key={channel.id}>
                      <Link
                        href={`${base}/c/${channel.id}`}
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-violet-50"
                      >
                        <span className="text-slate-400">
                          {channel.type === "private" ? <Lock className="h-4 w-4" /> : <Hash className="h-4 w-4" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-slate-900">{channel.name}</span>
                          <span className="block truncate text-xs text-slate-500">{channel.teamName}</span>
                        </span>
                        <CountBadge count={unread.channels[channel.id] ?? 0} />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : channels.length > 0 ? (
                <div className="py-6 text-center">
                  <p className="text-sm font-medium text-slate-700">You&apos;re all caught up 🎉</p>
                  <Link href={`${base}/c/${channels[0].id}`} className="mt-3 inline-block">
                    <Button variant="secondary" size="sm">
                      Open #{channels[0].name}
                    </Button>
                  </Link>
                </div>
              ) : (
                <p className="py-6 text-center text-sm text-slate-500">
                  You&apos;re not in any channels yet. Ask a team lead or admin to add you to a team.
                </p>
              )}
            </Card>

            <Card title="Recent messages">
              {recentDms.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">
                  No conversations yet. Start one from the sidebar or the People page.
                </p>
              ) : (
                <ul className="space-y-1">
                  {recentDms.map((conversation) => {
                    const other = otherParticipant(conversation, me?.id);
                    const count = unread.dms[conversation.id]?.length ?? 0;

                    return (
                      <li key={conversation.id}>
                        <Link
                          href={`${base}/dm/${conversation.id}`}
                          className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-violet-50"
                        >
                          <Avatar
                            id={other?.id}
                            name={other?.name}
                            src={other?.avatar}
                            size="sm"
                            online={other ? Boolean(online[other.id]) : undefined}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-slate-900">{other?.name}</span>
                            <span className="block truncate text-xs text-slate-500">
                              {conversation.lastMessage?.content || "Say hello"}
                            </span>
                          </span>
                          <CountBadge count={count} />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>

            <Card title="Teams">
              <ul className="space-y-1">
                {teams.map((team) => (
                  <li key={team.id}>
                    <Link
                      href={`${base}/teams/${team.id}`}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-violet-50"
                    >
                      <span className="bg-brand-gradient flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-white">
                        {team.name.slice(0, 2).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900">{team.name}</span>
                      <span className="text-xs text-slate-500">{team.isMember ? team.myRole : "not a member"}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>

            <Card title="Work faster">
              <ul className="space-y-3 text-sm text-slate-600">
                <li className="flex items-start gap-3">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
                  <span>
                    Open any channel and press <kbd className="rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 text-xs">Ctrl+Shift+A</kbd>{" "}
                    for an AI summary of what you missed.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Hash className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
                  <span>
                    <kbd className="rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 text-xs">Ctrl+K</kbd> jumps to any channel, person or page.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Bell className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
                  <span>
                    <kbd className="rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 text-xs">Ctrl+Shift+F</kbd> turns on focus mode.
                  </span>
                </li>
              </ul>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
