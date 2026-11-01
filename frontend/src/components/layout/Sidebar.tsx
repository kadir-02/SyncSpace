"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  ChevronDown,
  ChevronRight,
  FilePlus2,
  Files,
  Hash,
  Lock,
  LogOut,
  Plus,
  Users,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { CountBadge } from "@/components/ui/Badge";
import { CreateChannelModal } from "@/components/features/CreateChannelModal";
import { CreateTeamModal } from "@/components/features/CreateTeamModal";
import { NewDmModal } from "@/components/features/NewDmModal";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { useWorkspace } from "@/hooks/useWorkspace";
import { otherParticipant } from "@/lib/conversation";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { logout } from "@/store/slices/authSlice";
import { selectUnreadActivityCount } from "@/store/selectors";
import type { Team } from "@/types";

const navLink = (active: boolean) =>
  cn(
    "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors",
    active ? "bg-indigo-500/20 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white",
  );

function TeamSection({
  team,
  workspaceId,
  canCreateChannel,
  onCreateChannel,
}: {
  team: Team;
  workspaceId: string;
  canCreateChannel: boolean;
  onCreateChannel: (team: Team) => void;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const channels = useAppSelector((state) => state.channels.byTeam[team.id]);
  const unread = useAppSelector((state) => state.unread.channels);

  return (
    <div className="mb-2">
      <div className="group flex items-center gap-1 px-1">
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          className="rounded p-1 text-slate-400 hover:text-white"
          aria-label={collapsed ? "Expand team" : "Collapse team"}
        >
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
        <Link
          href={`/w/${workspaceId}/teams/${team.id}`}
          className={cn(
            "min-w-0 flex-1 truncate text-xs font-semibold uppercase tracking-wide hover:text-white",
            pathname.endsWith(`/teams/${team.id}`) ? "text-white" : "text-slate-400",
          )}
        >
          {team.name}
        </Link>
        {team.isMember && canCreateChannel && (
          <button
            type="button"
            onClick={() => onCreateChannel(team)}
            className="rounded p-1 text-slate-400 opacity-0 hover:text-white focus:opacity-100 group-hover:opacity-100"
            aria-label={`Create channel in ${team.name}`}
            title="Create channel"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {!collapsed && (
        <ul className="mt-0.5 space-y-0.5">
          {!team.isMember && (
            <li className="px-3 py-1 text-xs italic text-slate-500">
              Not a member — ask a lead to add you
            </li>
          )}
          {team.isMember && channels === undefined && (
            <li className="px-3 py-1 text-xs text-slate-500">Loading…</li>
          )}
          {team.isMember && channels?.length === 0 && (
            <li className="px-3 py-1 text-xs text-slate-500">No channels yet</li>
          )}
          {channels?.map((channel) => {
            const href = `/w/${workspaceId}/c/${channel.id}`;
            const active = pathname === href;
            const count = unread[channel.id] ?? 0;

            return (
              <li key={channel.id}>
                <Link href={href} className={navLink(active)}>
                  {channel.type === "private" ? (
                    <Lock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  ) : (
                    <Hash className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  )}
                  <span className={cn("min-w-0 flex-1 truncate", count > 0 && !active && "font-semibold text-white")}>
                    {channel.name}
                  </span>
                  {!active && <CountBadge count={count} />}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function Sidebar() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const { workspaceId, teams, me, isAdmin } = useWorkspace();
  const conversations = useAppSelector((state) => state.dm.conversations);
  const dmUnread = useAppSelector((state) => state.unread.dms);
  const online = useAppSelector((state) => state.presence.online);
  const activityCount = useAppSelector(selectUnreadActivityCount);

  const [teamModal, setTeamModal] = useState(false);
  const [dmModal, setDmModal] = useState(false);
  const [channelTeam, setChannelTeam] = useState<Team | null>(null);

  const base = `/w/${workspaceId}`;

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col bg-slate-900 text-slate-300">
      <div className="border-b border-slate-800 p-2">
        <WorkspaceSwitcher workspaceId={workspaceId} />
      </div>

      <nav className="space-y-0.5 p-2" aria-label="Workspace">
        <Link href={`${base}/notifications`} className={navLink(pathname === `${base}/notifications`)}>
          <Bell className="h-4 w-4" />
          <span className="flex-1">Activity</span>
          <CountBadge count={activityCount} />
        </Link>
        <Link href={`${base}/files`} className={navLink(pathname === `${base}/files`)}>
          <Files className="h-4 w-4" />
          <span className="flex-1">Files</span>
        </Link>
        <Link href={`${base}/members`} className={navLink(pathname === `${base}/members`)}>
          <Users className="h-4 w-4" />
          <span className="flex-1">People</span>
        </Link>
      </nav>

      <div className="scroll-slim-dark min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        <div className="mb-1 mt-2 flex items-center justify-between px-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Teams</span>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setTeamModal(true)}
              className="rounded p-1 text-slate-400 hover:text-white"
              aria-label="Create team"
              title="Create team"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {teams.length === 0 && (
          <p className="px-3 py-2 text-xs text-slate-500">
            {isAdmin ? "Create your first team to get started." : "No teams in this workspace yet."}
          </p>
        )}

        {teams.map((team) => (
          <TeamSection
            key={team.id}
            team={team}
            workspaceId={workspaceId}
            canCreateChannel={isAdmin}
            onCreateChannel={setChannelTeam}
          />
        ))}

        <div className="mb-1 mt-5 flex items-center justify-between px-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Direct messages
          </span>
          <button
            type="button"
            onClick={() => setDmModal(true)}
            className="rounded p-1 text-slate-400 hover:text-white"
            aria-label="New direct message"
            title="New message"
          >
            <FilePlus2 className="h-3.5 w-3.5" />
          </button>
        </div>

        <ul className="space-y-0.5">
          {conversations.length === 0 && (
            <li className="px-3 py-1 text-xs text-slate-500">No conversations yet</li>
          )}
          {conversations.map((conversation) => {
            const other = otherParticipant(conversation, me?.id);
            const href = `${base}/dm/${conversation.id}`;
            const active = pathname === href;
            const count = dmUnread[conversation.id]?.length ?? 0;

            return (
              <li key={conversation.id}>
                <Link href={href} className={navLink(active)}>
                  <Avatar
                    id={other?.id}
                    name={other?.name}
                    src={other?.avatar}
                    size="xs"
                    online={other ? Boolean(online[other.id]) : undefined}
                  />
                  <span className={cn("min-w-0 flex-1 truncate", count > 0 && !active && "font-semibold text-white")}>
                    {other?.name ?? "Unknown"}
                  </span>
                  {!active && <CountBadge count={count} />}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex items-center gap-3 border-t border-slate-800 p-3">
        <Link
          href={`${base}/profile`}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-1 -m-1 hover:bg-slate-800"
          title="Your profile"
        >
          <Avatar id={me?.id} name={me?.name} src={me?.avatar} size="md" online />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{me?.name}</p>
            <p className="truncate text-xs text-slate-400">View profile</p>
          </div>
        </Link>
        <button
          type="button"
          onClick={() => {
            dispatch(logout());
            router.replace("/login");
          }}
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>

      <CreateTeamModal open={teamModal} workspaceId={workspaceId} onClose={() => setTeamModal(false)} />
      <NewDmModal open={dmModal} onClose={() => setDmModal(false)} />
      {channelTeam && (
        <CreateChannelModal
          open
          workspaceId={workspaceId}
          teamId={channelTeam.id}
          teamName={channelTeam.name}
          onClose={() => setChannelTeam(null)}
        />
      )}
    </aside>
  );
}
