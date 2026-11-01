"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { useAppDispatch } from "@/store/hooks";
import { createTeam } from "@/store/slices/teamSlice";
import { loadWorkspaceData } from "@/store/workspaceThunks";

export function CreateTeamModal({
  open,
  workspaceId,
  onClose,
}: {
  open: boolean;
  workspaceId: string;
  onClose: () => void;
}) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const close = () => {
    setName("");
    setDescription("");
    setError(null);
    onClose();
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { teamId } = await dispatch(
        createTeam({
          workspaceId,
          name: name.trim(),
          description: description.trim() || undefined,
        }),
      ).unwrap();

      // Pull the creator's channel list for the new team.
      dispatch(loadWorkspaceData(workspaceId));
      close();
      router.push(`/w/${workspaceId}/teams/${teamId}`);
    } catch (message) {
      setError(typeof message === "string" ? message : "Could not create team");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Create a team"
      description="Teams group people and the channels they work in."
    >
      <form id="create-team" onSubmit={onSubmit} className="space-y-4">
        {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
        <Field label="Team name">
          <Input
            required
            minLength={2}
            maxLength={100}
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Engineering"
          />
        </Field>
        <Field label="Description" hint="Optional">
          <Textarea
            rows={3}
            maxLength={500}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </Field>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Create team
          </Button>
        </div>
      </form>
    </Modal>
  );
}
