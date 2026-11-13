"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { useAppSelector } from "@/store/hooks";
import { cn, initials } from "@/lib/utils";

export function WorkspaceSwitcher({ workspaceId }: { workspaceId: string }) {
  const workspaces = useAppSelector((state) => state.workspaces.items);
  const current = workspaces.find((item) => item.id === workspaceId);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };

    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-left transition-colors hover:bg-white/10"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="bg-brand-gradient flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white">
          {initials(current?.name)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-white">
            {current?.name ?? "Workspace"}
          </span>
          <span className="block text-xs capitalize text-slate-400">{current?.role ?? ""}</span>
        </span>
        <ChevronsUpDown className="h-4 w-4 text-slate-400" />
      </button>

      {open && (
        <div className="fade-in absolute left-0 right-0 top-full z-30 mt-1 rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
          <ul role="listbox">
            {workspaces.map((workspace) => (
              <li key={workspace.id}>
                <Link
                  href={`/w/${workspace.id}`}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-slate-700 hover:bg-slate-100",
                    workspace.id === workspaceId && "bg-slate-50",
                  )}
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-200 text-[10px] font-bold text-slate-600">
                    {initials(workspace.name)}
                  </span>
                  <span className="flex-1 truncate">{workspace.name}</span>
                  {workspace.id === workspaceId && <Check className="h-4 w-4 text-violet-600" />}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-1 border-t border-slate-100 pt-1">
            <Link
              href="/onboarding"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              <Plus className="h-4 w-4" /> Create workspace
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
