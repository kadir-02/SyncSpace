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

    // The roster is the live source of truth: a sender embedded in an old
    // message still carries the name/avatar from when it was sent.
    return (sender: UserLite | string | undefined | null): ResolvedUser => {
      const id = typeof sender === "string" ? sender : sender?.id;

      if (!id) return { id: "", name: "Unknown user" };

      if (id === me?.id) return { id, name: me.name, avatar: me.avatar };

      const member = byId.get(id);
      if (member) return member;

      if (sender && typeof sender === "object") {
        return { id, name: sender.name, avatar: sender.avatar };
      }

      return { id, name: "Unknown user" };
    };
  }, [members, me]);
}
