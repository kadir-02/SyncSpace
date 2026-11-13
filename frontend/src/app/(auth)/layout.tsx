import { Logo } from "@/components/ui/Logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-brand-dark relative flex min-h-full flex-col items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-violet-600/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-fuchsia-600/15 blur-3xl" />

      <div className="relative mb-8">
        <Logo size={52} />
      </div>

      <div className="relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl shadow-black/30 sm:p-8">
        {children}
      </div>

      <p className="relative mt-6 text-xs text-slate-400">Organised team chat. Private by design.</p>
    </div>
  );
}
