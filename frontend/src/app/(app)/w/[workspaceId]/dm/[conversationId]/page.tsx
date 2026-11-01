"use client";

import { useParams } from "next/navigation";
import { DmView } from "@/components/chat/DmView";

export default function DmPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  return <DmView conversationId={conversationId} />;
}
