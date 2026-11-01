"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { UserMinus, UserPlus } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { useWorkspace } from "@/hooks/useWorkspace";
import { idOf } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  addChannelMember,
  deleteChannel,
  fetchChannelMembers,
  removeChannelMember,
  updateChannel,
} from "@/store/slices/channelSlice";
import { fetchTeamMembers } from "@/store/slices/teamSlice";
import { toastAdded } from "@/store/slices/uiSlice";
import type { Channel, ChannelType } from "@/types";

export function ChannelSettingsModal({
  channel,
  open,
  onClose,
}: {
  channel: Channel;
  open: boolean;
  onClose: () => void;
}) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { workspaceId, isAdmin, me } = useWorkspace();
  const isPrivate = channel.type === "private";
  const isCreator = idOf(channel.createdBy) === me?.id;
  const canManageMembers = isPrivate && (isAdmin || isCreator);

  const channelMembers = useAppSelector((state) => state.channels.members[channel.id]);
  const teamMembers = useAppSelector((state) => state.teams.members[channel.team]);

  const [name, setName] = useState(channel.name);
  const [description, setDescription] = useState(channel.description ?? "");
  const [type, setType] = useState<ChannelType>(channel.type);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addId, setAddId] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Load rosters when the dialog opens.
  useEffect(() => {
    if (!open || !isPrivate) return;

    dispatch(fetchChannelMembers(channel.id));
    dispatch(fetchTeamMembers(channel.team));
  }, [open, isPrivate, channel.id, channel.team, dispatch]);

  const addable = useMemo(() => {
    const inChannel = new Set((channelMembers ?? []).map((member) => member.user.id));
    return (teamMembers ?? []).filter((member) => !inChannel.has(member.userId));
  }, [channelMembers, teamMembers]);

  const notify = (title: string, kind: "success" | "error" = "success") =>
    dispatch(toastAdded({ kind, title }));

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await dispatch(
        updateChannel({
          channelId: channel.id,
          teamId: channel.team,
          name: name.trim().toLowerCase().replace(/\s+/g, "-"),
          description: description.trim(),
          type,
        }),
      ).unwrap();
      notify("Channel updated");
      onClose();
    } catch (message) {
      setError(typeof message === "string" ? message : "Could not update channel");
    } finally {
      setSaving(false);
    }
  };

  const add = async () => {
    if (!addId) return;
    setBusyId(addId);

    try {
      await dispatch(addChannelMember({ channelId: channel.id, userId: addId })).unwrap();
      setAddId("");
    } catch (message) {
      notify(typeof message === "string" ? message : "Could not add member", "error");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (userId: string) => {
    setBusyId(userId);

    try {
      await dispatch(removeChannelMember({ channelId: channel.id, userId })).unwrap();
    } catch (message) {
      notify(typeof message === "string" ? message : "Could not remove member", "error");
    } finally {
      setBusyId(null);
    }
  };

  const destroy = async () => {
    setDeleting(true);

    try {
      await dispatch(deleteChannel({ channelId: channel.id })).unwrap();
      onClose();
      router.replace(`/w/${workspaceId}`);
    } catch (message) {
      notify(typeof message === "string" ? message : "Could not delete channel", "error");
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <>
      <Modal open={open} onClose={onClose} title={`#${channel.name}`} description="Channel settings" size="lg">
        <div className="space-y-6">
          {isAdmin ? (
            <form onSubmit={save} className="space-y-4">
              {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
              <Field label="Name">
                <Input required minLength={2} maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field label="Description">
                <Textarea rows={2} maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} />
              </Field>
              <Field
                label="Visibility"
                hint={
                  type !== channel.type
                    ? type === "private"
                      ? "Everyone currently on the team keeps access; you can then remove people."
                      : "Anyone on the team will be able to see and join this channel."
                    : undefined
                }
              >
                <Select value={type} onChange={(e) => setType(e.target.value as ChannelType)}>
                  <option value="public">Public — everyone on the team</option>
                  <option value="private">Private — invited people only</option>
                </Select>
              </Field>
              <div className="flex justify-end">
                <Button type="submit" loading={saving}>
                  Save changes
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-1 text-sm">
              <p className="text-slate-500">Visibility</p>
              <p className="capitalize text-slate-900">{channel.type}</p>
              {channel.description && <p className="pt-2 text-slate-700">{channel.description}</p>}
              <p className="pt-2 text-xs text-slate-400">Only workspace admins can edit channel details.</p>
            </div>
          )}

          {isPrivate && (
            <section>
              <h3 className="mb-2 text-sm font-semibold text-slate-900">
                Members {channelMembers && <span className="font-normal text-slate-400">({channelMembers.length})</span>}
              </h3>

              {canManageMembers && (
                <div className="mb-3 flex gap-2">
                  <Select value={addId} onChange={(e) => setAddId(e.target.value)} aria-label="Add a team member">
                    <option value="">Add a team member…</option>
                    {addable.map((member) => (
                      <option key={member.userId} value={member.userId}>
                        {member.name} ({member.email})
                      </option>
                    ))}
                  </Select>
                  <Button onClick={add} disabled={!addId} loading={busyId === addId && Boolean(addId)}>
                    <UserPlus className="h-4 w-4" /> Add
                  </Button>
                </div>
              )}

              {!channelMembers ? (
                <div className="flex justify-center py-4">
                  <Spinner />
                </div>
              ) : (
                <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                  {channelMembers.map((member) => {
                    const isOwner = member.user.id === idOf(channel.createdBy);

                    return (
                      <li key={member.id} className="flex items-center gap-3 px-3 py-2">
                        <Avatar id={member.user.id} name={member.user.name} src={member.user.avatar} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-900">{member.user.name}</p>
                          <p className="truncate text-xs text-slate-500">{member.user.email}</p>
                        </div>
                        {isOwner && <Badge tone="indigo">Creator</Badge>}
                        {canManageMembers && !isOwner && (
                          <Button
                            variant="ghost"
                            size="sm"
                            loading={busyId === member.user.id}
                            onClick={() => remove(member.user.id)}
                            aria-label={`Remove ${member.user.name}`}
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          )}

          {isAdmin && (
            <section className="rounded-lg border border-rose-200 bg-rose-50/50 p-4">
              <h3 className="text-sm font-semibold text-rose-700">Delete channel</h3>
              <p className="mt-1 text-sm text-slate-600">
                Permanently removes the channel, its messages and uploaded files.
              </p>
              <Button variant="danger" size="sm" className="mt-3" onClick={() => setConfirmDelete(true)}>
                Delete channel
              </Button>
            </section>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        title={`Delete #${channel.name}?`}
        description="All messages and files in this channel will be permanently deleted for everyone."
        loading={deleting}
        onConfirm={destroy}
        onClose={() => setConfirmDelete(false)}
      />
    </>
  );
}
