import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-2">
      {/* LEFT: AUTHENTICATION */}
      <section className="flex min-h-screen flex-col justify-center px-6 py-6 sm:px-12 lg:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-12">
            <Image
              src="/transparent_logo.png"
              alt="SyncSpace"
              width={180}
              height={100}
              priority
              className="h-auto w-40 object-contain object-left"
            />
          </div>

          <div>{children}</div>

          <p className="mt-8 text-center text-xs text-slate-400">
            © {new Date().getFullYear()} SyncSpace. Built for teams that work
            better together.
          </p>
        </div>
      </section>

      {/* RIGHT: BRAND EXPERIENCE */}
      <section className="relative hidden min-h-screen overflow-hidden bg-[#101828] lg:flex lg:items-center lg:justify-center">
        {/* Background effects */}
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-indigo-600/20 blur-[100px]" />
        <div className="absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-cyan-500/10 blur-[100px]" />

        <div className="relative z-10 mx-auto w-full max-w-xl px-12 py-4 xl:px-16">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-sm text-slate-300">
              A better way to work together
            </span>
          </div>

          <h1 className="text-2xl font-bold leading-tight tracking-tight text-white xl:text-5xl">
            Your team.
            <br />
            Your conversations.
            <br />
            <span className="bg-linear-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              All in sync.
            </span>
          </h1>

          <p className="hidden mt-6 max-w-md text-base leading-7 text-slate-400">
            Bring your teams, channels, and conversations together in one
            organized, privacy-first workspace.
          </p>

          {/* Product visual */}
          <div className="mt-12 rounded-2xl border border-white/10 bg-white/4 p-5 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300">
                  #
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    engineering
                  </p>
                  <p className="text-xs text-slate-500">
                    Product development team
                  </p>
                </div>
              </div>

              <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs text-emerald-400">
                ● Live
              </span>
            </div>

            <div className="space-y-5 py-5">
              <div className="flex gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-500 text-xs font-bold text-white">
                  AM
                </div>
                <div>
                  <p className="text-sm font-medium text-white">
                    Alex Morgan
                    <span className="ml-2 text-xs font-normal text-slate-500">
                      10:42 AM
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    The new dashboard design is ready for review!
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-600 text-xs font-bold text-white">
                  SC
                </div>
                <div>
                  <p className="text-sm font-medium text-white">
                    Sarah Chen
                    <span className="ml-2 text-xs font-normal text-slate-500">
                      10:45 AM
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    Looks great! Everything is coming together.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-sm text-slate-500">Message #engineering...</p>
            </div>
          </div>

          {/* Features */}
          <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-xs text-slate-400">
            <span>✦ Privacy-first</span>
            <span>✦ Real-time messaging</span>
            <span>✦ Your own workspace</span>
          </div>
        </div>
      </section>
    </main>
  );
}
