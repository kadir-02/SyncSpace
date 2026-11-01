"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Input } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { startConversation } from "@/store/slices/dmSlice";
import { toastAdded } from "@/store/slices/uiSlice";

export function NewDmModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { workspaceId, members, me } = useWorkspace();
  const online = useAppSelector((state) => state.presence.online);
  const [query, setQuery] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);

  const candidates = useMemo(() => {
    const term = query.trim().toLowerCase();

    return members.filter(
      (member) =>
        member.userId !== me?.id &&
        (!term || member.name.toLowerCase().includes(term) || member.email.toLowerCase().includes(term)),
    );
  }, [members, me?.id, query]);

  const open1to1 = async (userId: string) => {
    setPendingId(userId);

    try {
      const conversation = await dispatch(startConversation(userId)).unwrap();
      onClose();
      router.push(`/w/${workspaceId}/dm/${conversation.id}`);
    } catch (message) {
      dispatch(
        toastAdded({
          kind: "error",
          title: typeof message === "string" ? message : "Could not start conversation",
        }),
      );
    } finally {
      setPendingId(null);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="New message" description="Pick someone from this workspace.">
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          autoFocus
          className="pl-9"
          placeholder="Search people"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <ul className="-mx-2 max-h-72 overflow-y-auto">
        {candidates.length === 0 && (
          <li className="px-2 py-6 text-center text-sm text-slate-500">No one found.</li>
        )}
        {candidates.map((member) => (
          <li key={member.userId}>
            <button
              type="button"
              disabled={pendingId !== null}
              onClick={() => open1to1(member.userId)}
              className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-slate-50 disabled:opacity-60"
            >
              <Avatar
                id={member.userId}
                name={member.name}
                src={member.avatar}
                size="sm"
                online={Boolean(online[member.userId])}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-slate-900">{member.name}</span>
                <span className="block truncate text-xs text-slate-500">{member.email}</span>
              </span>
              {pendingId === member.userId && <Spinner className="h-4 w-4" />}
            </button>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
