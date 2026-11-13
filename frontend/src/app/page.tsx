import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  Hash,
  LockKeyhole,
  MessageCircle,
  MessagesSquare,
  Sparkles,
  Users,
  Video,
  Workflow,
  Zap,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";

const features = [
  {
    icon: Users,
    title: "Workspaces that make sense",
    description:
      "Bring people, projects and conversations together in one organised home for your team.",
  },
  {
    icon: Hash,
    title: "Focused team channels",
    description:
      "Give every project and topic its own space, so the right conversations stay easy to find.",
  },
  {
    icon: MessageCircle,
    title: "Conversations that flow",
    description:
      "Keep quick questions and private discussions moving with direct messages and clear context.",
  },
  {
    icon: Sparkles,
    title: "Helpful AI summaries",
    description:
      "Catch up on channel activity faster with AI-powered summaries of the conversations that matter.",
  },
  {
    icon: LockKeyhole,
    title: "Private by design",
    description:
      "Keep your team's work in its own space, with authentication and workspace-level access.",
  },
  {
    icon: Zap,
    title: "Less switching, more doing",
    description:
      "Bring messages, people, files and team updates into one connected workflow.",
  },
];

function ProductPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[650px]">
      <div className="absolute -inset-5 rounded-[2rem] bg-violet-400/20 blur-3xl" />
      <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-[#11102d] text-left shadow-2xl shadow-violet-950/30 ring-1 ring-black/10">
        <div className="flex h-11 items-center gap-2 border-b border-white/10 bg-white/[0.04] px-4">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-300/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
          <span className="ml-3 text-[10px] font-medium tracking-wide text-violet-200/60">
            COHVRA WORKSPACE
          </span>
        </div>
        <div className="grid min-h-[330px] grid-cols-[145px_1fr] sm:grid-cols-[175px_1fr]">
          <aside className="border-r border-white/10 bg-black/10 p-3 sm:p-4">
            <div className="mb-5 flex items-center gap-2">
              <div className="grid h-7 w-7 place-items-center rounded-lg bg-violet-500 text-[10px] font-bold text-white">
                N
              </div>
              <div className="min-w-0">
                <p className="truncate text-[10px] font-semibold text-white">
                  Northstar Studio
                </p>
                <p className="text-[9px] text-violet-200/50">Workspace</p>
              </div>
            </div>
            <p className="mb-2 px-1 text-[8px] font-bold uppercase tracking-[0.16em] text-violet-200/40">
              Workspace
            </p>
            {[
              ["#", "general"],
              ["#", "design-team"],
              ["#", "product-launch"],
            ].map(([symbol, label], i) => (
              <div
                key={label}
                className={`mb-1 flex items-center gap-2 rounded-lg px-2 py-2 text-[10px] ${i === 1 ? "bg-violet-500/20 text-white" : "text-violet-100/55"}`}
              >
                <span>{symbol}</span>
                <span className="truncate">{label}</span>
              </div>
            ))}
            <p className="mb-2 mt-5 px-1 text-[8px] font-bold uppercase tracking-[0.16em] text-violet-200/40">
              Direct messages
            </p>
            {["Maya Chen", "Alex Morgan"].map((name, i) => (
              <div
                key={name}
                className="mb-2 flex items-center gap-2 px-1 text-[9px] text-violet-100/60"
              >
                <span
                  className={`grid h-5 w-5 place-items-center rounded-full ${i ? "bg-cyan-500/30" : "bg-pink-500/30"}`}
                >
                  {name[0]}
                </span>
                {name}
              </div>
            ))}
          </aside>
          <div className="p-4 sm:p-6">
            <div className="mb-5 flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <p className="text-[8px] text-violet-200/45">CHANNEL</p>
                <h3 className="mt-1 text-sm font-semibold text-white">
                  # design-team
                </h3>
              </div>
              <div className="flex -space-x-2">
                <span className="grid h-6 w-6 place-items-center rounded-full border-2 border-[#11102d] bg-pink-400 text-[8px] text-white">
                  M
                </span>
                <span className="grid h-6 w-6 place-items-center rounded-full border-2 border-[#11102d] bg-cyan-400 text-[8px] text-white">
                  A
                </span>
                <span className="grid h-6 w-6 place-items-center rounded-full border-2 border-[#11102d] bg-amber-400 text-[8px] text-white">
                  J
                </span>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex gap-2.5">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-pink-400/80 text-[9px] font-semibold text-white">
                  M
                </span>
                <div>
                  <p className="text-[10px] font-semibold text-white">
                    Maya Chen{" "}
                    <span className="ml-1 font-normal text-violet-200/40">
                      10:42 AM
                    </span>
                  </p>
                  <p className="mt-1 text-[10px] leading-5 text-violet-100/65">
                    The new homepage concepts are ready for a look. I’ve shared
                    the latest explorations below.
                  </p>
                  <div className="mt-2 rounded-xl border border-white/10 bg-white/[0.05] p-2.5">
                    <div className="mb-2 flex items-center gap-2 text-[9px] text-violet-100/70">
                      <span className="rounded bg-violet-500/20 p-1">
                        <Workflow size={12} />
                      </span>{" "}
                      Homepage concepts.fig
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      <div className="h-10 rounded-md bg-gradient-to-br from-violet-400/70 to-fuchsia-500/50" />
                      <div className="h-10 rounded-md bg-gradient-to-br from-cyan-400/60 to-blue-600/50" />
                      <div className="h-10 rounded-md bg-gradient-to-br from-amber-300/60 to-rose-500/50" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-2.5">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-cyan-400/80 text-[9px] font-semibold text-white">
                  A
                </span>
                <div>
                  <p className="text-[10px] font-semibold text-white">
                    Alex Morgan{" "}
                    <span className="ml-1 font-normal text-violet-200/40">
                      10:48 AM
                    </span>
                  </p>
                  <p className="mt-1 text-[10px] leading-5 text-violet-100/65">
                    These look great. The second direction feels right for
                    launch ✨
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-6 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-[9px] text-violet-200/35">
              <span className="text-base">＋</span> Message #design-team…
            </div>
          </div>
        </div>
      </div>
      <div className="absolute -bottom-5 -left-4 hidden items-center gap-2 rounded-xl border border-violet-100 bg-white px-3 py-2.5 text-xs font-medium text-slate-700 shadow-xl sm:flex">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
          <Check size={15} />
        </span>{" "}
        Everyone in sync
      </div>
      <div className="absolute -right-4 -top-5 hidden items-center gap-2 rounded-xl border border-violet-100 bg-white px-3 py-2.5 text-xs font-medium text-slate-700 shadow-xl sm:flex">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-violet-50 text-violet-600">
          <Sparkles size={15} />
        </span>{" "}
        AI channel summary
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <main className="overflow-hidden bg-white text-slate-900">
      <header className="relative z-10 border-b border-slate-100 bg-white/90 backdrop-blur">
        <nav
          className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8 lg:px-10"
          aria-label="Main navigation"
        >
          <Link href="/" aria-label="COHVRA home">
            <Logo size={38} tone="light" />
          </Link>
          <div className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <a href="#features" className="transition hover:text-violet-700">
              Features
            </a>
            <a
              href="#how-it-works"
              className="transition hover:text-violet-700"
            >
              How it works
            </a>
            <a href="#about" className="transition hover:text-violet-700">
              About
            </a>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 sm:inline-flex"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-700/20 transition hover:-translate-y-0.5 hover:bg-violet-800"
            >
              Get started <ArrowUpRight size={16} />
            </Link>
          </div>
        </nav>
      </header>

      <section className="relative isolate bg-[#100d2d]">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -left-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-violet-700/25 blur-[100px]" />
          <div className="absolute -right-24 top-20 h-[30rem] w-[30rem] rounded-full bg-fuchsia-600/15 blur-[110px]" />
          <div
            className="absolute inset-0 opacity-[0.12]"
            style={{
              backgroundImage:
                "radial-gradient(#c4b5fd 0.7px, transparent 0.7px)",
              backgroundSize: "24px 24px",
            }}
          />
        </div>
        <div className="mx-auto grid max-w-7xl items-center gap-16 px-5 pb-24 pt-20 sm:px-8 sm:pt-24 lg:grid-cols-[0.9fr_1.1fr] lg:px-10 lg:pb-32 lg:pt-28">
          <div className="max-w-xl">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-300/10 px-3 py-1.5 text-xs font-medium text-violet-200">
              <Sparkles size={13} /> A clearer way to work together
            </div>
            <h1 className="text-4xl font-bold leading-[1.12] tracking-tight text-white sm:text-5xl lg:text-[3.65rem]">
              Great teamwork starts with{" "}
              <span className="text-brand-gradient">better conversations.</span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-8 text-violet-100/65 sm:text-lg">
              Bring your people, projects and conversations together. COHVRA
              gives your team one organised place to communicate, collaborate
              and move work forward.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-500 px-6 py-3.5 text-sm font-semibold text-white shadow-xl shadow-violet-950/40 transition hover:-translate-y-0.5 hover:bg-violet-400"
              >
                Create your workspace <ArrowRight size={17} />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/[0.06] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                I already have an account
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-violet-200/55">
              <span className="inline-flex items-center gap-1.5">
                <Check size={13} className="text-emerald-300" /> Organised
                workspaces
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check size={13} className="text-emerald-300" /> Focused
                conversations
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check size={13} className="text-emerald-300" /> Built-in AI
                summaries
              </span>
            </div>
          </div>
          <ProductPreview />
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-300/30 to-transparent" />
      </section>

      <section
        id="features"
        className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10 lg:py-28"
      >
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-700">
            Everything in one place
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            A calmer way to collaborate
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-500">
            Less time searching for updates. More time doing meaningful work
            together.
          </p>
        </div>
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, description }) => (
            <article
              key={title}
              className="group rounded-2xl border border-slate-200/80 bg-white p-6 transition duration-200 hover:-translate-y-1 hover:border-violet-200 hover:shadow-xl hover:shadow-violet-900/[0.06]"
            >
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-violet-50 text-violet-700 transition group-hover:bg-violet-700 group-hover:text-white">
                <Icon size={20} />
              </div>
              <h3 className="mt-5 text-base font-semibold text-slate-900">
                {title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="bg-slate-50 py-20 sm:py-24">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 sm:px-8 lg:grid-cols-2 lg:px-10">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-700">
              Simple by design
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              From scattered chats to shared momentum.
            </h2>
            <p className="mt-5 max-w-xl leading-7 text-slate-500">
              Set up a workspace for your team, create channels around the work
              and bring the right people into every conversation. COHVRA keeps
              the context close to the work.
            </p>
            <Link
              href="/register"
              className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-violet-700 hover:text-violet-900"
            >
              Start collaborating <ChevronRight size={17} />
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-violet-700">
                <Users size={19} />
              </div>
              <p className="mt-5 text-lg font-bold text-slate-900">
                01. Create a space
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Start a workspace for your company, group or project.
              </p>
            </div>
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:mt-10">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-fuchsia-50 text-fuchsia-700">
                <MessagesSquare size={19} />
              </div>
              <p className="mt-5 text-lg font-bold text-slate-900">
                02. Bring people in
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Organise teams, channels and direct conversations.
              </p>
            </div>
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-50 text-cyan-700">
                <Video size={19} />
              </div>
              <p className="mt-5 text-lg font-bold text-slate-900">
                03. Share the context
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Keep discussions and shared files connected to the work.
              </p>
            </div>
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:mt-10">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
                <Sparkles size={19} />
              </div>
              <p className="mt-5 text-lg font-bold text-slate-900">
                04. Stay in sync
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Catch up with notifications and helpful AI summaries.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="px-5 py-20 sm:px-8 lg:px-10 lg:py-24">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl bg-gradient-to-br from-violet-800 via-violet-700 to-indigo-900 px-7 py-12 text-center shadow-2xl shadow-violet-900/15 sm:px-12 sm:py-16">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-200">
            Make room for great work
          </p>
          <h2 className="mx-auto mt-4 max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Your team&apos;s next great idea starts with a conversation.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-violet-100/75 sm:text-base">
            Create your COHVRA workspace and give every conversation a place to
            belong.
          </p>
          <Link
            href="/register"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-violet-800 shadow-lg transition hover:-translate-y-0.5 hover:bg-violet-50"
          >
            Get started for free <ArrowUpRight size={17} />
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-100 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
          <Link href="/" aria-label="COHVRA home">
            <Logo size={32} tone="light" />
          </Link>
          <p className="text-xs text-slate-400">
            Organised team chat. Private by design.
          </p>
          <div className="flex gap-5 text-xs font-medium text-slate-500">
            <Link href="/login" className="hover:text-violet-700">
              Sign in
            </Link>
            <Link href="/register" className="hover:text-violet-700">
              Create account
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
