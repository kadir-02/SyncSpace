"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { FullScreenSpinner } from "@/components/ui/Spinner";
import { readLastWorkspace } from "@/lib/storage";
import { useAppSelector } from "@/store/hooks";

// Picks where to land: last used workspace, first workspace, or onboarding.
export default function HomePage() {
  const router = useRouter();
  const { items, status } = useAppSelector((state) => state.workspaces);

  useEffect(() => {
    if (status !== "ready") return;

    if (items.length === 0) {
      router.replace("/onboarding");
      return;
    }

    const last = readLastWorkspace();
    const target = items.find((workspace) => workspace.id === last) ?? items[0];

    router.replace(`/w/${target.id}`);
  }, [status, items, router]);

  return <FullScreenSpinner label="Opening your workspace…" />;
}
