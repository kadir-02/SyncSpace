"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessagesSquare, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { FullScreenSpinner } from "@/components/ui/Spinner";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAppSelector } from "@/store/hooks";

// Lands on the first available channel, or explains what to do next.
export default function WorkspaceHomePage() {
  const router = useRouter();
  const { workspaceId, workspace, teams, isAdmin } = useWorkspace();
  const teamsStatus = useAppSelector((state) => state.teams.status[workspaceId]);
  const channelsByTeam = useAppSelector((state) => state.channels.byTeam);

  const memberTeams = teams.filter((team) => team.isMember);
  const channelsReady = memberTeams.every((team) => channelsByTeam[team.id] !== undefined);
  const firstChannel = memberTeams
    .flatMap((team) => channelsByTeam[team.id] ?? [])
    .find(Boolean);

  useEffect(() => {
    if (firstChannel) router.replace(`/w/${workspaceId}/c/${firstChannel.id}`);
  }, [firstChannel, workspaceId, router]);

  if (teamsStatus !== "ready" || !channelsReady || firstChannel) {
    return <FullScreenSpinner />;
  }

  if (teams.length === 0) {
    return (
      <EmptyState
        icon={<Users className="h-6 w-6" />}
        title={`Welcome to ${workspace?.name}`}
        description={
          isAdmin
            ? "Create a team from the sidebar, then add channels and invite people."
            : "No teams exist yet. An admin will add you once they're set up."
        }
        action={
          <Link href={`/w/${workspaceId}/members`}>
            <Button variant="secondary">View people</Button>
          </Link>
        }
      />
    );
  }

  return (
    <EmptyState
      icon={<MessagesSquare className="h-6 w-6" />}
      title="No channels to show yet"
      description={
        memberTeams.length === 0
          ? "You're not on any team yet. Ask a team lead or workspace admin to add you."
          : "Your teams don't have channels yet. A workspace admin can create one from the sidebar."
      }
    />
  );
}
