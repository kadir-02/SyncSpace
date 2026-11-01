"use client";

import { useParams } from "next/navigation";
import { ChannelView } from "@/components/chat/ChannelView";

export default function ChannelPage() {
  const { channelId } = useParams<{ channelId: string }>();
  return <ChannelView channelId={channelId} />;
}
