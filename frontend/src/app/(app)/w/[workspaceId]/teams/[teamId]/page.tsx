"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Hash, Lock, Plus, Trash2, UserPlus, Users } from "lucide-react";
import { CreateChannelModal } from "@/components/features/CreateChannelModal";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { FullScreenSpinner, Spinner } from "@/components/ui/Spinner";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { EMPTY } from "@/store/selectors";
import {
  addTeamMember,
  deleteTeam,
  fetchTeamMembers,
  removeTeamMember,
  updateTeam,
  updateTeamMemberRole,
} from "@/store/slices/teamSlice";
import { toastAdded } from "@/store/slices/uiSlice";
import type { TeamRole } from "@/types";

export default function TeamPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { workspaceId, teams, members: workspaceMembers, me, isAdmin } = useWorkspace();

  const team = teams.find((item) => item.id === teamId);
  const teamsStatus = useAppSelector((state) => state.teams.status[workspaceId]);
  const members = useAppSelector((state) => state.teams.members[teamId]);
  const membersStatus = useAppSelector((state) => state.teams.membersStatus[teamId]);
  const channels = useAppSelector((state) => state.channels.byTeam[teamId]) ?? EMPTY;

  const isLead = team?.myRole === "lead";
  const canManage = isAdmin || isLead;

  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [channelModal, setChannelModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [addUserId, setAddUserId] = useState("");
  const [addRole, setAddRole] = useState<TeamRole>("member");
  const [busy, setBusy] = useState<string | null>(null);

  // Workspace admins can see any roster; everyone else needs to be on the team.
  useEffect(() => {
    if (team && (team.isMember || isAdmin)) dispatch(fetchTeamMembers(teamId));
  }, [team?.id, team?.isMember, isAdmin, teamId, dispatch]); // eslint-disable-line react-hooks/exhaustive-deps

  const addable = useMemo(() => {
    const inTeam = new Set((members ?? []).map((member) => member.userId));
    return workspaceMembers.filter((member) => !inTeam.has(member.userId));
  }, [members, workspaceMembers]);

  const toast = (title: string, kind: "success" | "error" = "success") =>
    dispatch(toastAdded({ kind, title }));

  const run = async (key: string, action: () => Promise<unknown>, success?: string) => {
    setBusy(key);

    try {
      await action();
      if (success) toast(success);
    } catch (message) {
      toast(typeof message === "string" ? message : "Something went wrong", "error");
    } finally {
      setBusy(null);
    }
  };

  if (!team) {
    if (teamsStatus !== "ready") return <FullScreenSpinner />;

    return (
      <EmptyState
        icon={<Users className="h-6 w-6" />}
        title="Team not found"
        description="It may have been deleted."
        action={
          <Link href={`/w/${workspaceId}`}>
            <Button variant="secondary">Back to workspace</Button>
          </Link>
        }
      />
    );
  }

  const openEdit = () => {
    setName(team.name);
    setDescription(team.description ?? "");
    setEditOpen(true);
  };

  const saveTeam = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);

    try {
      await dispatch(
        updateTeam({ workspaceId, teamId, name: name.trim(), description: description.trim() }),
      ).unwrap();
      setEditOpen(false);
      toast("Team updated");
    } catch (message) {
      toast(typeof message === "string" ? message : "Could not update team", "error");
    } finally {
      setSaving(false);
    }
  };

  const destroy = async () => {
    setDeleting(true);

    try {
      await dispatch(deleteTeam({ workspaceId, teamId })).unwrap();
      router.replace(`/w/${workspaceId}`);
    } catch (message) {
      toast(typeof message === "string" ? message : "Could not delete team", "error");
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div className="scroll-slim h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl space-y-8 px-5 py-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-2xl font-semibold text-slate-900">{team.name}</h1>
              {team.myRole && <Badge tone="indigo">{team.myRole}</Badge>}
            </div>
            <p className="mt-1 text-sm text-slate-500">{team.description || "No description yet."}</p>
          </div>
          <div className="flex gap-2">
            {canManage && (
              <Button variant="secondary" size="sm" onClick={openEdit}>
                Edit
              </Button>
            )}
            {isAdmin && (
              <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            )}
          </div>
        </header>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Channels</h2>
            {isAdmin && team.isMember && (
              <Button size="sm" variant="secondary" onClick={() => setChannelModal(true)}>
                <Plus className="h-4 w-4" /> New channel
              </Button>
            )}
          </div>

          {!team.isMember ? (
            <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
              You&apos;re not a member of this team, so its channels are hidden.
              {isAdmin && " Add yourself below to see and create channels."}
            </p>
          ) : channels.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
              No channels yet.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
              {channels.map((channel) => (
                <li key={channel.id}>
                  <Link
                    href={`/w/${workspaceId}/c/${channel.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50"
                  >
                    {channel.type === "private" ? (
                      <Lock className="h-4 w-4 text-slate-400" />
                    ) : (
                      <Hash className="h-4 w-4 text-slate-400" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-900">{channel.name}</span>
                      {channel.description && (
                        <span className="block truncate text-xs text-slate-500">{channel.description}</span>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-slate-900">
            Members {members && <span className="font-normal text-slate-400">({members.length})</span>}
          </h2>

          {canManage && (
            <div className="mb-3 flex flex-wrap gap-2">
              <div className="min-w-48 flex-1">
                <Select value={addUserId} onChange={(e) => setAddUserId(e.target.value)} aria-label="Person to add">
                  <option value="">Add a person…</option>
                  {addable.map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {member.name} ({member.email})
                    </option>
                  ))}
                </Select>
              </div>
              <div className="w-32">
                <Select value={addRole} onChange={(e) => setAddRole(e.target.value as TeamRole)} aria-label="Role">
                  <option value="member">Member</option>
                  <option value="lead">Lead</option>
                </Select>
              </div>
              <Button
                disabled={!addUserId}
                loading={busy === "add"}
                onClick={() =>
                  run(
                    "add",
                    async () => {
                      await dispatch(
                        addTeamMember({ teamId, workspaceId, userId: addUserId, role: addRole }),
                      ).unwrap();
                      setAddUserId("");
                    },
                    "Member added",
                  )
                }
              >
                <UserPlus className="h-4 w-4" /> Add
              </Button>
            </div>
          )}

          {!members ? (
            membersStatus === "error" ? (
              <p className="text-sm text-slate-500">Only team members and workspace admins can see the roster.</p>
            ) : (
              <div className="flex justify-center py-6">
                <Spinner />
              </div>
            )
          ) : (
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
              {members.map((member) => {
                const isMe = member.userId === me?.id;

                return (
                  <li key={member.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <Avatar id={member.userId} name={member.name} src={member.avatar} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {member.name} {isMe && <span className="text-slate-400">(you)</span>}
                      </p>
                      <p className="truncate text-xs text-slate-500">{member.email}</p>
                    </div>

                    {canManage && !isMe ? (
                      <>
                        <div className="w-28">
                          <Select
                            value={member.teamRole}
                            disabled={busy === `role-${member.userId}`}
                            onChange={(e) =>
                              run(
                                `role-${member.userId}`,
                                () =>
                                  dispatch(
                                    updateTeamMemberRole({
                                      teamId,
                                      userId: member.userId,
                                      role: e.target.value as TeamRole,
                                    }),
                                  ).unwrap(),
                                "Role updated",
                              )
                            }
                            aria-label={`Role for ${member.name}`}
                          >
                            <option value="member">Member</option>
                            <option value="lead">Lead</option>
                          </Select>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          loading={busy === `rm-${member.userId}`}
                          onClick={() =>
                            run(
                              `rm-${member.userId}`,
                              () => dispatch(removeTeamMember({ teamId, userId: member.userId })).unwrap(),
                              "Member removed",
                            )
                          }
                        >
                          Remove
                        </Button>
                      </>
                    ) : (
                      <Badge tone={member.teamRole === "lead" ? "indigo" : "slate"}>{member.teamRole}</Badge>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit team"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="edit-team" loading={saving}>
              Save
            </Button>
          </>
        }
      >
        <form id="edit-team" onSubmit={saveTeam} className="space-y-4">
          <Field label="Name">
            <Input required minLength={2} maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Description">
            <Textarea rows={3} maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
        </form>
      </Modal>

      <CreateChannelModal
        open={channelModal}
        workspaceId={workspaceId}
        teamId={teamId}
        teamName={team.name}
        onClose={() => setChannelModal(false)}
      />

      <ConfirmDialog
        open={confirmDelete}
        title={`Delete ${team.name}?`}
        description="This deletes the team, all of its channels, their messages and uploaded files for everyone."
        loading={deleting}
        onConfirm={destroy}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  );
}
