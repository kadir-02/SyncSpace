"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Focus, Menu, WifiOff, X } from "lucide-react";
import { CommandPalette } from "@/components/features/CommandPalette";
import { QuickActions } from "@/components/features/QuickActions";
import { ShortcutsModal } from "@/components/features/ShortcutsModal";
import { UserProfileModal } from "@/components/features/UserProfileModal";
import { Sidebar } from "@/components/layout/Sidebar";
import { FullScreenSpinner } from "@/components/ui/Spinner";
import { saveLastWorkspace } from "@/lib/storage";
import { useGlobalShortcuts } from "@/hooks/useGlobalShortcuts";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { focusModeToggled, sidebarToggled } from "@/store/slices/uiSlice";
import { fetchWorkspaces, setCurrentWorkspace } from "@/store/slices/workspaceSlice";
import { loadWorkspaceData } from "@/store/workspaceThunks";

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const { workspaceId, workspace } = useWorkspace();
  const status = useAppSelector((state) => state.workspaces.status);
  const sidebarOpen = useAppSelector((state) => state.ui.sidebarOpen);
  const socketConnected = useAppSelector((state) => state.ui.socketConnected);
  const focusMode = useAppSelector((state) => state.ui.focusMode);
  const paletteOpen = useAppSelector((state) => state.ui.paletteOpen);

  useGlobalShortcuts();

  useEffect(() => {
    if (status === "idle") dispatch(fetchWorkspaces());
  }, [status, dispatch]);

  // Unknown workspace, or one we were removed from: go back to the picker.
  useEffect(() => {
    if (status === "ready" && !workspace) router.replace("/app");
  }, [status, workspace, router]);

  useEffect(() => {
    if (!workspace) return;

    dispatch(setCurrentWorkspace(workspaceId));
    saveLastWorkspace(workspaceId);
    dispatch(loadWorkspaceData(workspaceId));
  }, [workspaceId, Boolean(workspace), dispatch]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close the mobile drawer after navigating.
  useEffect(() => {
    dispatch(sidebarToggled(false));
  }, [pathname, dispatch]);

  const isChat = pathname.includes("/c/") || pathname.includes("/dm/");

  if (!workspace) return <FullScreenSpinner label="Loading workspace…" />;

  return (
    <div className="flex h-dvh overflow-hidden bg-(--app-bg)">
      {/* Desktop sidebar (hidden in focus mode) */}
      {!focusMode && (
        <div className="hidden lg:block">
          <Sidebar />
        </div>
      )}

      {/* Mobile drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="fade-in absolute inset-0 bg-slate-900/50"
            onClick={() => dispatch(sidebarToggled(false))}
          />
          <div className="absolute inset-y-0 left-0 shadow-2xl">
            <Sidebar />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b border-slate-300/60 bg-white/60 px-3 py-2 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => dispatch(sidebarToggled(true))}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="truncate text-sm font-bold text-violet-900">{workspace.name}</span>
        </div>

        {!socketConnected && (
          <div className="flex items-center justify-center gap-2 bg-amber-50 px-3 py-1.5 text-xs text-amber-800">
            <WifiOff className="h-3.5 w-3.5" /> Reconnecting… live updates are paused.
          </div>
        )}

        {focusMode && (
          <div className="absolute right-4 top-4 z-30 hidden lg:block">
            <button
              type="button"
              onClick={() => dispatch(focusModeToggled(false))}
              className="flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-medium text-white shadow-lg hover:bg-slate-800"
            >
              <Focus className="h-3.5 w-3.5 text-violet-300" /> Focus mode on
              <X className="h-3.5 w-3.5 text-slate-400" />
            </button>
          </div>
        )}

        {/* Chats sit on a white card; other pages draw their own cards on the grey background. */}
        <main className="relative min-h-0 flex-1 lg:p-3">
          <div
            className={
              isChat
                ? "h-full overflow-hidden bg-white shadow-sm lg:rounded-3xl"
                : "h-full overflow-hidden"
            }
          >
            {children}
          </div>
        </main>
      </div>

      <UserProfileModal />
      <QuickActions />
      <ShortcutsModal />
      {paletteOpen && <CommandPalette />}
    </div>
  );
}
