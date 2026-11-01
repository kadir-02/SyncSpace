"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, Bell, CheckCircle2, X } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { toastDismissed, type Toast } from "@/store/slices/uiSlice";
import { cn } from "@/lib/utils";

const ICONS = {
  info: <Bell className="h-4 w-4 text-indigo-500" />,
  success: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
  error: <AlertCircle className="h-4 w-4 text-rose-500" />,
};

function ToastItem({ toast }: { toast: Toast }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const timer = setTimeout(
      () => dispatch(toastDismissed(toast.id)),
      toast.kind === "error" ? 7000 : 4500,
    );
    return () => clearTimeout(timer);
  }, [dispatch, toast.id, toast.kind]);

  const body = (
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-medium text-slate-900">{toast.title}</p>
      {toast.description && (
        <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{toast.description}</p>
      )}
    </div>
  );

  return (
    <div
      className={cn(
        "toast-in pointer-events-auto flex w-80 max-w-[calc(100vw-2rem)] items-start gap-3 rounded-xl border bg-white p-3 shadow-lg",
        toast.kind === "error" ? "border-rose-200" : "border-slate-200",
      )}
      role="status"
    >
      <span className="mt-0.5">{ICONS[toast.kind]}</span>
      {toast.href ? (
        <Link href={toast.href} className="min-w-0 flex-1">
          {body}
        </Link>
      ) : (
        body
      )}
      <button
        type="button"
        onClick={() => dispatch(toastDismissed(toast.id))}
        className="text-slate-400 hover:text-slate-600"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function Toaster() {
  const toasts = useAppSelector((state) => state.ui.toasts);

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
