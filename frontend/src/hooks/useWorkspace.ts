"use client";

import { useParams } from "next/navigation";
import { useAppSelector } from "@/store/hooks";
import { EMPTY } from "@/store/selectors";

/** Everything a page needs to know about the workspace in the URL. */
export function useWorkspace() {
  const { workspaceId } = useParams<{ workspaceId: string }>();

  const workspace = useAppSelector((state) =>
    state.workspaces.items.find((item) => item.id === workspaceId),
  );
  const members = useAppSelector((state) => state.workspaces.members[workspaceId]) ?? EMPTY;
  const teams = useAppSelector((state) => state.teams.byWorkspace[workspaceId]) ?? EMPTY;
  const me = useAppSelector((state) => state.auth.user);

  const role = workspace?.role;

  return {
    workspaceId,
    workspace,
    members,
    teams,
    me,
    role,
    isOwner: role === "owner",
    isAdmin: role === "owner" || role === "admin",
  };
}
