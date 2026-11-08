"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, MessageSquare, Pencil, Search, Trash2, UserPlus } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { startConversation } from "@/store/slices/dmSlice";
import { profileOpened, toastAdded } from "@/store/slices/uiSlice";
import {
  addWorkspaceMember,
  deleteWorkspace,
  leaveWorkspace,
  removeWorkspaceMember,
  renameWorkspace,
  setWorkspaceAi,
  transferOwnership,
  updateWorkspaceMemberRole,
} from "@/store/slices/workspaceSlice";
import type { WorkspaceMember } from "@/types";

interface SearchUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  alreadyMember?: boolean;
}

function AddMemberModal({
  open,
  workspaceId,
  onClose,
}: {
  open: boolean;
  workspaceId: string;
  onClose: () => void;
}) {
  const dispatch = useAppDispatch();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [role, setRole] = useState<"member" | "admin">("member");
  const [addingId, setAddingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Debounced lookup by name or email.
  useEffect(() => {
    const term = query.trim();

    if (term.length < 3) return;

    const timer = setTimeout(async () => {
      setSearching(true);

      try {
        const users = await api<SearchUser[]>("/users/search", {
          query: { q: term, workspaceId },
        });
        setResults(users);
        setError(null);
      } catch (message) {
        setError(message instanceof Error ? message.message : "Search failed");
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query, workspaceId]);

  // Results from an earlier, longer query must not linger once the box is cleared.
  const visibleResults = query.trim().length >= 3 ? results : [];

  const close = () => {
    setQuery("");
    setResults([]);
    setError(null);
    onClose();
  };

  const add = async (user: SearchUser) => {
    setAddingId(user.id);

    try {
      await dispatch(addWorkspaceMember({ workspaceId, userId: user.id, role })).unwrap();
      setResults((current) =>
        current.map((item) => (item.id === user.id ? { ...item, alreadyMember: true } : item)),
      );
      dispatch(toastAdded({ kind: "success", title: `${user.name} added to the workspace` }));
    } catch (message) {
      dispatch(
        toastAdded({ kind: "error", title: typeof message === "string" ? message : "Could not add member" }),
      );
    } finally {
      setAddingId(null);
    }
  };

  return (
    <Modal open={open} onClose={close} title="Add people" description="Search by name or email (3+ characters).">
      <div className="space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              autoFocus
              className="pl-9"
              placeholder="name@company.com"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="w-32">
            <Select value={role} onChange={(e) => setRole(e.target.value as "member" | "admin")} aria-label="Role">
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </Select>
          </div>
        </div>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        {searching && (
          <div className="flex justify-center py-3">
            <Spinner />
          </div>
        )}

        {!searching && visibleResults.length === 0 && query.trim().length >= 3 && !error && (
          <p className="py-4 text-center text-sm text-slate-500">
            No registered users match. They need to create a SyncSpace account first.
          </p>
        )}

        <ul className="-mx-2 max-h-72 overflow-y-auto">
          {visibleResults.map((user) => (
            <li key={user.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-50">
              <Avatar id={user.id} name={user.name} src={user.avatar} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">{user.name}</p>
                <p className="truncate text-xs text-slate-500">{user.email}</p>
              </div>
              {user.alreadyMember ? (
                <Badge tone="emerald">In workspace</Badge>
              ) : (
                <Button size="sm" loading={addingId === user.id} onClick={() => add(user)}>
                  Add
                </Button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  );
}

export default function MembersPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { workspaceId, workspace, members, me, isOwner, isAdmin } = useWorkspace();
  const online = useAppSelector((state) => state.presence.online);
  const status = useAppSelector((state) => state.workspaces.membersStatus[workspaceId]);

  const [addOpen, setAddOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<
    | { kind: "remove"; member: WorkspaceMember }
    | { kind: "transfer"; member: WorkspaceMember }
    | { kind: "leave" }
    | { kind: "delete" }
    | null
  >(null);
  const [deleteText, setDeleteText] = useState("");

  const toast = (title: string, kind: "success" | "error" = "success") =>
    dispatch(toastAdded({ kind, title }));

  const run = async (key: string, action: () => Promise<unknown>, success?: string) => {
    setBusy(key);

    try {
      await action();
      if (success) toast(success);
      return true;
    } catch (message) {
      toast(typeof message === "string" ? message : "Something went wrong", "error");
      return false;
    } finally {
      setBusy(null);
    }
  };

  const message = async (userId: string) => {
    await run(`dm-${userId}`, async () => {
      const conversation = await dispatch(startConversation(userId)).unwrap();
      router.push(`/w/${workspaceId}/dm/${conversation.id}`);
    });
  };

  const aiStatus = useAppSelector((state) => state.ai.status);

  const toggleAi = (enabled: boolean) =>
    run(
      "ai",
      () => dispatch(setWorkspaceAi({ workspaceId, aiEnabled: enabled })).unwrap(),
      enabled ? "AI features enabled" : "AI features turned off",
    );

  const saveRename = async (event: React.FormEvent) => {
    event.preventDefault();

    const ok = await run(
      "rename",
      () => dispatch(renameWorkspace({ workspaceId, name: newName.trim() })).unwrap(),
      "Workspace renamed",
    );

    if (ok) setRenameOpen(false);
  };

  const canRemove = (member: WorkspaceMember) => {
    if (!isAdmin || member.userId === me?.id || member.workspaceRole === "owner") return false;
    return isOwner || member.workspaceRole === "member";
  };

  const closeConfirm = () => {
    setConfirm(null);
    setDeleteText("");
  };

  const confirmAction = async () => {
    if (!confirm) return;

    if (confirm.kind === "remove") {
      const { member } = confirm;
      await run(
        "confirm",
        () => dispatch(removeWorkspaceMember({ workspaceId, userId: member.userId })).unwrap(),
        `${member.name} removed`,
      );
    } else if (confirm.kind === "transfer") {
      const { member } = confirm;
      await run(
        "confirm",
        () => dispatch(transferOwnership({ workspaceId, userId: member.userId })).unwrap(),
        `${member.name} is now the owner`,
      );
    } else if (confirm.kind === "leave") {
      const ok = await run("confirm", () => dispatch(leaveWorkspace(workspaceId)).unwrap());
      if (ok) {
        router.replace("/");
        return;
      }
    } else if (confirm.kind === "delete") {
      const ok = await run("confirm", () => dispatch(deleteWorkspace(workspaceId)).unwrap());
      if (ok) {
        router.replace("/");
        return;
      }
    }

    closeConfirm();
  };

  const confirmCopy = {
    remove: {
      title: "Remove from workspace?",
      description:
        "They lose access to every team and channel in this workspace immediately. Their past messages stay.",
      label: "Remove",
    },
    transfer: {
      title: "Transfer ownership?",
      description: "You become an admin and they become the owner. Only the owner can undo this.",
      label: "Transfer",
    },
    leave: {
      title: "Leave this workspace?",
      description: "You'll lose access to all of its teams, channels and files.",
      label: "Leave",
    },
    delete: {
      title: "Delete workspace?",
      description:
        "This permanently deletes every team, channel, message and file in the workspace for everyone.",
      label: "Delete workspace",
    },
  } as const;

  return (
    <div className="scroll-slim h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl space-y-8 px-5 py-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">People</h1>
            <p className="mt-1 text-sm text-slate-500">
              {members.length} member{members.length === 1 ? "" : "s"} in {workspace?.name}
            </p>
          </div>
          {isAdmin && (
            <Button onClick={() => setAddOpen(true)}>
              <UserPlus className="h-4 w-4" /> Add people
            </Button>
          )}
        </header>

        {status === "loading" && members.length === 0 ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {members.map((member) => {
              const isMe = member.userId === me?.id;

              return (
                <li key={member.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => dispatch(profileOpened(member.userId))}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    aria-label={`View ${member.name}'s profile`}
                  >
                    <Avatar
                      id={member.userId}
                      name={member.name}
                      src={member.avatar}
                      size="md"
                      online={Boolean(online[member.userId])}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-900">
                        {member.name} {isMe && <span className="text-slate-400">(you)</span>}
                      </span>
                      <span className="block truncate text-xs text-slate-500">{member.email}</span>
                    </span>
                  </button>

                  {isOwner && !isMe && member.workspaceRole !== "owner" ? (
                    <div className="w-28">
                      <Select
                        value={member.workspaceRole}
                        disabled={busy === `role-${member.userId}`}
                        onChange={(e) =>
                          run(
                            `role-${member.userId}`,
                            () =>
                              dispatch(
                                updateWorkspaceMemberRole({
                                  workspaceId,
                                  userId: member.userId,
                                  role: e.target.value as "admin" | "member",
                                }),
                              ).unwrap(),
                            "Role updated",
                          )
                        }
                        aria-label={`Role for ${member.name}`}
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                      </Select>
                    </div>
                  ) : (
                    <Badge tone={member.workspaceRole === "owner" ? "amber" : member.workspaceRole === "admin" ? "indigo" : "slate"}>
                      {member.workspaceRole}
                    </Badge>
                  )}

                  <div className="flex items-center gap-1">
                    {!isMe && (
                      <Button
                        variant="ghost"
                        size="sm"
                        loading={busy === `dm-${member.userId}`}
                        onClick={() => message(member.userId)}
                        aria-label={`Message ${member.name}`}
                        title="Send message"
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    )}
                    {isOwner && !isMe && (
                      <Button variant="ghost" size="sm" onClick={() => setConfirm({ kind: "transfer", member })}>
                        Make owner
                      </Button>
                    )}
                    {canRemove(member) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirm({ kind: "remove", member })}
                        aria-label={`Remove ${member.name}`}
                      >
                        <Trash2 className="h-4 w-4 text-rose-500" />
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <section className="space-y-3 rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-900">Workspace</h2>
          {isAdmin && (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-slate-600">
                Name: <span className="font-medium text-slate-900">{workspace?.name}</span>
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setNewName(workspace?.name ?? "");
                  setRenameOpen(true);
                }}
              >
                <Pencil className="h-4 w-4" /> Rename
              </Button>
            </div>
          )}
          {isAdmin && (
            <div className="flex items-start justify-between gap-4 border-t border-slate-100 pt-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900">AI features</p>
                <p className="mt-0.5 text-sm text-slate-600">
                  Lets members summarize channels. The selected messages are sent to the server&apos;s AI
                  provider, so only turn this on if your team is comfortable with that.
                </p>
                {aiStatus && !aiStatus.configured && (
                  <p className="mt-1 text-xs text-amber-700">
                    No AI provider is configured on the server yet (set AI_API_KEY in the backend).
                  </p>
                )}
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={Boolean(workspace?.aiEnabled)}
                aria-label="AI features"
                disabled={busy === "ai"}
                onClick={() => toggleAi(!workspace?.aiEnabled)}
                className={cn(
                  "relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-60",
                  workspace?.aiEnabled ? "bg-indigo-600" : "bg-slate-300",
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
                    workspace?.aiEnabled ? "left-[22px]" : "left-0.5",
                  )}
                />
              </button>
            </div>
          )}
          {!isOwner && (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-slate-600">Leave this workspace and lose access to its content.</p>
              <Button variant="secondary" size="sm" onClick={() => setConfirm({ kind: "leave" })}>
                <LogOut className="h-4 w-4" /> Leave
              </Button>
            </div>
          )}
          {isOwner && (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-slate-600">
                Permanently delete this workspace and everything in it.
              </p>
              <Button variant="danger" size="sm" onClick={() => setConfirm({ kind: "delete" })}>
                Delete workspace
              </Button>
            </div>
          )}
        </section>
      </div>

      <Modal
        open={renameOpen}
        onClose={() => setRenameOpen(false)}
        title="Rename workspace"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRenameOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="rename-workspace"
              loading={busy === "rename"}
              disabled={newName.trim().length < 2 || newName.trim() === workspace?.name}
            >
              Save
            </Button>
          </>
        }
      >
        <form id="rename-workspace" onSubmit={saveRename}>
          <Field label="Workspace name">
            <Input
              autoFocus
              required
              minLength={2}
              maxLength={100}
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
            />
          </Field>
        </form>
      </Modal>

      <AddMemberModal open={addOpen} workspaceId={workspaceId} onClose={() => setAddOpen(false)} />

      {confirm && (
        <Modal
          open
          onClose={closeConfirm}
          title={confirmCopy[confirm.kind].title}
          size="sm"
          footer={
            <>
              <Button variant="secondary" onClick={closeConfirm}>
                Cancel
              </Button>
              <Button
                variant={confirm.kind === "transfer" ? "primary" : "danger"}
                loading={busy === "confirm"}
                disabled={confirm.kind === "delete" && deleteText !== workspace?.name}
                onClick={confirmAction}
              >
                {confirmCopy[confirm.kind].label}
              </Button>
            </>
          }
        >
          <p className="text-sm text-slate-600">{confirmCopy[confirm.kind].description}</p>
          {confirm.kind === "delete" && (
            <div className="mt-4">
              <Field label={`Type “${workspace?.name}” to confirm`}>
                <Input value={deleteText} onChange={(e) => setDeleteText(e.target.value)} />
              </Field>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
