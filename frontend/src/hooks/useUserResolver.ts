"use client";

import { useMemo } from "react";
import { useWorkspace } from "./useWorkspace";
import type { UserLite } from "@/types";

export interface ResolvedUser {
  id: string;
  name: string;
  avatar?: string;
}

/**
 * Messages normally carry a populated sender; fall back to the workspace roster
 * when only an id is available.
 */
export function useUserResolver() {
  const { members, me } = useWorkspace();

  return useMemo(() => {
    const byId = new Map<string, ResolvedUser>();

    members.forEach((member) =>
      byId.set(member.userId, { id: member.userId, name: member.name, avatar: member.avatar }),
    );

    return (sender: UserLite | string | undefined | null): ResolvedUser => {
      if (sender && typeof sender === "object") {
        return { id: sender.id, name: sender.name, avatar: sender.avatar };
      }

      if (typeof sender === "string") {
        if (sender === me?.id) return { id: me.id, name: me.name, avatar: me.avatar };
        return byId.get(sender) ?? { id: sender, name: "Unknown user" };
      }

      return { id: "", name: "Unknown user" };
    };
  }, [members, me]);
}
