import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-5 w-5 animate-spin text-slate-400", className)} />;
}

export function FullScreenSpinner({ label }: { label?: string }) {
  return (
    <div className="flex h-full min-h-[50vh] flex-col items-center justify-center gap-3">
      <Spinner className="h-6 w-6" />
      {label && <p className="text-sm text-slate-500">{label}</p>}
    </div>
  );
}
