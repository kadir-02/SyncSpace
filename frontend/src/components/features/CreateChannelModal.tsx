"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Hash, Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import { useAppDispatch } from "@/store/hooks";
import { createChannel } from "@/store/slices/channelSlice";
import type { ChannelType } from "@/types";

export function CreateChannelModal({
  open,
  workspaceId,
  teamId,
  teamName,
  onClose,
}: {
  open: boolean;
  workspaceId: string;
  teamId: string;
  teamName: string;
  onClose: () => void;
}) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<ChannelType>("public");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const close = () => {
    setName("");
    setDescription("");
    setType("public");
    setError(null);
    onClose();
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const channel = await dispatch(
        createChannel({
          teamId,
          name: name.trim().toLowerCase().replace(/\s+/g, "-"),
          description: description.trim() || undefined,
          type,
        }),
      ).unwrap();

      close();
      router.push(`/w/${workspaceId}/c/${channel.id}`);
    } catch (message) {
      setError(typeof message === "string" ? message : "Could not create channel");
    } finally {
      setLoading(false);
    }
  };

  const options: { value: ChannelType; label: string; hint: string; icon: React.ReactNode }[] = [
    { value: "public", label: "Public", hint: "Everyone on the team", icon: <Hash className="h-4 w-4" /> },
    { value: "private", label: "Private", hint: "Invited people only", icon: <Lock className="h-4 w-4" /> },
  ];

  return (
    <Modal
      open={open}
      onClose={close}
      title="Create a channel"
      description={`In the ${teamName} team`}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

        <Field label="Channel name">
          <Input
            required
            minLength={2}
            maxLength={80}
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="announcements"
          />
        </Field>

        <Field label="Description" hint="Optional">
          <Textarea
            rows={2}
            maxLength={500}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </Field>

        <div>
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Visibility</span>
          <div className="grid grid-cols-2 gap-2">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setType(option.value)}
                className={cn(
                  "flex items-start gap-2 rounded-lg border p-3 text-left transition-colors",
                  type === option.value
                    ? "border-violet-500 bg-violet-50"
                    : "border-slate-200 hover:bg-slate-50",
                )}
              >
                <span className="mt-0.5 text-slate-600">{option.icon}</span>
                <span>
                  <span className="block text-sm font-medium text-slate-900">{option.label}</span>
                  <span className="block text-xs text-slate-500">{option.hint}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Create channel
          </Button>
        </div>
      </form>
    </Modal>
  );
}
