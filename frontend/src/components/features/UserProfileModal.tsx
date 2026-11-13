"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageSquare, Pencil } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { startConversation } from "@/store/slices/dmSlice";
import { profileOpened, toastAdded } from "@/store/slices/uiSlice";

/** Profile card for any workspace member, opened by clicking a name or avatar. */
export function UserProfileModal() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { workspaceId, members, me } = useWorkspace();
  const userId = useAppSelector((state) => state.ui.profileUserId);
  const online = useAppSelector((state) => state.presence.online);
  const [starting, setStarting] = useState(false);

  if (!userId) return null;

  const isMe = userId === me?.id;
  const member = members.find((item) => item.userId === userId);

  const profile = isMe
    ? { name: me!.name, email: me!.email, avatar: me!.avatar }
    : member
      ? { name: member.name, email: member.email, avatar: member.avatar }
      : null;

  const close = () => dispatch(profileOpened(null));

  const message = async () => {
    setStarting(true);

    try {
      const conversation = await dispatch(startConversation(userId)).unwrap();
      close();
      router.push(`/w/${workspaceId}/dm/${conversation.id}`);
    } catch (error) {
      dispatch(
        toastAdded({
          kind: "error",
          title: typeof error === "string" ? error : "Could not start conversation",
        }),
      );
    } finally {
      setStarting(false);
    }
  };

  return (
    <Modal open onClose={close} title="Profile" size="sm">
      {!profile ? (
        <p className="py-6 text-center text-sm text-slate-500">
          This person is no longer in the workspace.
        </p>
      ) : (
        <div className="flex flex-col items-center text-center">
          <Avatar
            id={userId}
            name={profile.name}
            src={profile.avatar}
            size="xl"
            online={isMe ? true : Boolean(online[userId])}
          />
          <h3 className="mt-4 text-lg font-semibold text-slate-900">
            {profile.name} {isMe && <span className="text-sm font-normal text-slate-400">(you)</span>}
          </h3>
          <a href={`mailto:${profile.email}`} className="text-sm text-violet-600 hover:underline">
            {profile.email}
          </a>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            {member && (
              <Badge
                tone={
                  member.workspaceRole === "owner"
                    ? "amber"
                    : member.workspaceRole === "admin"
                      ? "indigo"
                      : "slate"
                }
              >
                {member.workspaceRole}
              </Badge>
            )}
            <Badge tone={isMe || online[userId] ? "emerald" : "slate"}>
              {isMe || online[userId] ? "Active now" : "Offline"}
            </Badge>
          </div>

          {member?.joinedAt && (
            <p className="mt-3 text-xs text-slate-400">
              Joined {new Date(member.joinedAt).toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" })}
            </p>
          )}

          <div className="mt-6 w-full">
            {isMe ? (
              <Link href={`/w/${workspaceId}/profile`} onClick={close}>
                <Button className="w-full">
                  <Pencil className="h-4 w-4" /> Edit profile
                </Button>
              </Link>
            ) : (
              <Button className="w-full" loading={starting} onClick={message}>
                <MessageSquare className="h-4 w-4" /> Send message
              </Button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
