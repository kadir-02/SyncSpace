import type { Conversation, UserLite } from "@/types";

export const otherParticipant = (
  conversation: Conversation,
  meId: string | undefined,
): UserLite | undefined =>
  conversation.participants.find((participant) => participant.id !== meId) ??
  conversation.participants[0];
