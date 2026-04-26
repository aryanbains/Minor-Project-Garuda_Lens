import Link from "next/link";
import {
  ArrowRight,
  FileDown,
  Globe2,
  Layers3,
  Leaf,
  Shield,
  Sparkles,
  Users2,
} from "lucide-react";

const capabilities = [
  {
    icon: <Shield className="h-5 w-5 text-[#153b36]" />,
    title: "Protected analyst access",
    text: "Authentication now gates the change-detection APIs, not just the UI, so live Sentinel workflows are no longer public.",
  },
  {
    icon: <FileDown className="h-5 w-5 text-[#153b36]" />,
    title: "Reports and history",
    text: "Every run persists its result payload, timeline assets, and a branded PDF report for later retrieval.",
  },
  {
    icon: <Leaf className="h-5 w-5 text-[#153b36]" />,
    title: "NDVI and change categories",
    text: "RGB overlays, NDVI health views, and land-change categories are packaged into a single analysis flow.",
  },
];

const workflow = [
  {
    label: "01",
    title: "Authenticate into the workspace",
    text: "Sign in or register before opening any Sentinel-backed analysis route.",
  },
  {
    label: "02",
    title: "Choose a preset or custom region",
    text: "Run analyses across Indian metros, global landmarks, or your own coordinates and place names.",
  },
  {
    label: "03",
    title: "Inspect overlays and metrics",
    text: "Review area changed, football-field equivalents, category mix, and NDVI-based vegetation signals.",
  },
  {
    label: "04",
    title: "Replay or export",
    text: "Open the saved run again from history, download the PDF, or let the admin panel manage live/demo mode.",
  },
];

const presets = [
  "Delhi",
  "Mumbai",
  "Pune",
  "Bangalore",
  "Dubai Marina",
  "Singapore Port",
  "Amazon Deforestation Front",
];

const stack = [
  "Next.js 15 + React 19",
  "FastAPI + SQLAlchemy persistence",
  "Sentinel Hub + NDVI analysis",
  "U-Net change detection with heuristic fallback",
  "Server-side PDF generation",
  "Cookie-based JWT session flow",
];

export default function HomePage() {
  return (
    <main
      className="min-h-screen bg-[linear-gradient(180deg,#f7f1e3_0%,#f7f4ed_44%,#eaf3f4_100%)] text-slate-900"
      suppressHydrationWarning={true}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_top,#c7e5db_0%,rgba(199,229,219,0)_68%)]" />

      <header className="relative z-10 border-b border-white/60 bg-white/65 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#153b36] text-sm font-semibold text-[#f3d8a8]">
              GL
            </div>
            <div>
              <p className="text-base font-semibold tracking-tight">Garuda Lens</p>
              <p className="text-xs text-slate-500">
                Satellite change intelligence workspace
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a href="#workflow" className="hidden text-sm text-slate-600 md:inline-flex">
              Workflow
            </a>
            <a href="#coverage" className="hidden text-sm text-slate-600 md:inline-flex">
              Coverage
            </a>
            <Link
              href="/dashboard"
              className="inline-flex items-center rounded-full bg-[#153b36] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1b4c45]"
            >
              Open Dashboard
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <section className="relative z-10 border-b border-white/60">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 pb-14 pt-10 sm:px-6 lg:grid-cols-[minmax(0,1.1fr)_460px] lg:px-8 lg:pb-18 lg:pt-18">
          <div className="space-y-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-[#7a5a3a] shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />
              End-to-end feature build complete
            </div>

            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-[3.6rem] lg:leading-[1.02]">
                Protected satellite analysis with presets, NDVI overlays, saved history, and admin control.
              </h1>
              <p className="max-w-2xl text-base leading-8 text-slate-600">
                Garuda Lens is now a secured web workspace, not a public demo. Analysts can sign in,
                run multi-region change detection, inspect classified overlays and timelines, export PDF reports,
                and let admins switch between live and credit-safe demo mode.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/dashboard"
                className="inline-flex items-center rounded-full bg-[#153b36] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1b4c45]"
              >
                Launch analyst dashboard
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
              <a
                href="#capabilities"
                className="inline-flex items-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Explore features
              </a>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  label: "Auth",
                  value: "JWT + refresh cookies",
                },
                {
                  label: "Reports",
                  value: "Server-generated PDFs",
                },
                {
                  label: "Admin",
                  value: "User controls + demo mode",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-white/80 bg-white/78 px-4 py-4 shadow-sm"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {item.label}
                  </p>
                  <p className="mt-2 text-sm font-medium text-slate-900">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center">
            <div className="w-full rounded-[2rem] border border-white/70 bg-white/78 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Control room snapshot
                  </p>
                  <p className="text-xs text-slate-500">
                    Presets, overlays, history, and admin settings in one place
                  </p>
                </div>
                <span className="rounded-full bg-[#eef5f4] px-2.5 py-1 text-[11px] font-semibold text-[#2c6e62]">
                  Demo-safe ready
                </span>
              </div>

              <div className="mt-5 space-y-4">
                <div className="rounded-[1.5rem] bg-[#153b36] p-4 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">Run analysis</p>
                      <p className="text-xs text-white/72">
                        Preset selector, custom coordinates, RGB or NDVI mode
                      </p>
                    </div>
                    <Layers3 className="h-5 w-5 text-[#f3d8a8]" />
                  </div>
                  <div className="mt-4 grid gap-2 text-xs text-white/78 sm:grid-cols-2">
                    <div className="rounded-xl bg-white/8 px-3 py-2">Delhi · City-wide · 5 years</div>
                    <div className="rounded-xl bg-white/8 px-3 py-2">NDVI overlay · Report ready</div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[1.5rem] border border-slate-200 bg-[#f7f3ea] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      History panel
                    </p>
                    <p className="mt-2 text-sm text-slate-700">
                      Reopen past runs, delete stale items, or download the PDF again.
                    </p>
                  </div>
                  <div className="rounded-[1.5rem] border border-slate-200 bg-[#eef5f4] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2c6e62]">
                      Admin panel
                    </p>
                    <p className="mt-2 text-sm text-[#153b36]">
                      Toggle demo mode, reset passwords, promote users, and monitor usage.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="capabilities" className="relative z-10 border-b border-white/60 bg-white/55">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="mb-8 max-w-2xl space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7a5a3a]">
              Capabilities
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              The repo now behaves like a product workspace instead of a one-shot demo.
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {capabilities.map((item) => (
              <div
                key={item.title}
                className="rounded-[1.75rem] border border-white/80 bg-white/80 p-5 shadow-[0_16px_45px_rgba(15,23,42,0.05)]"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#eef5f4]">
                  {item.icon}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-950">{item.title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="workflow" className="relative z-10 border-b border-white/60">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="mb-8 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7a5a3a]">
                Workflow
              </p>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                Four steps from sign-in to export.
              </h2>
            </div>
            <div className="rounded-full bg-white/75 px-4 py-2 text-sm text-slate-600 shadow-sm">
              Cookie auth, persisted history, and admin-safe demo mode included
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-4">
            {workflow.map((item) => (
              <div
                key={item.label}
                className="rounded-[1.75rem] border border-white/80 bg-white/80 p-5 shadow-sm"
              >
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7a5a3a]">
                  {item.label}
                </div>
                <h3 className="mt-3 text-lg font-semibold text-slate-950">{item.title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="coverage" className="relative z-10 border-b border-white/60 bg-white/55">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:px-8 lg:py-16">
          <div className="space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7a5a3a]">
              Coverage
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Indian metros and global landmarks are available out of the box.
            </h2>
            <p className="text-sm leading-8 text-slate-600">
              Presets now cover the required Indian cities plus a few globally useful case-study regions.
              Analysts can still switch to custom mode and geocode by place name or supply coordinates directly.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {presets.map((preset) => (
              <div
                key={preset}
                className="rounded-[1.5rem] border border-slate-200 bg-white px-4 py-4 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#eef5f4] text-[#153b36]">
                    <Globe2 className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-950">{preset}</p>
                    <p className="text-xs text-slate-500">Preset-ready region</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 border-b border-white/60">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:px-8 lg:py-16">
          <div className="space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7a5a3a]">
              Architecture
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              The stack now reflects the actual repo and runtime constraints.
            </h2>
            <p className="text-sm leading-8 text-slate-600">
              The frontend is a Next.js control room, the backend is FastAPI with SQLAlchemy persistence,
              and the Python environment now tolerates missing TensorFlow by falling back to heuristic change masks for demo-safe execution.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {stack.map((item, index) => (
              <div
                key={item}
                className="rounded-[1.5rem] border border-white/80 bg-white/80 px-4 py-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#153b36] text-sm font-semibold text-[#f3d8a8]">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-950">{item}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-12 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8 lg:py-16">
          <div className="max-w-2xl space-y-3">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Open the dashboard and exercise the full workflow.
            </h2>
            <p className="text-sm leading-8 text-slate-600">
              Authentication, reports, presets, timeline playback, history, NDVI overlays, area estimates, classification, and the admin panel are all surfaced from one entrypoint.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center rounded-full bg-[#153b36] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1b4c45]"
            >
              Open dashboard
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-3 text-sm text-slate-600 shadow-sm">
              <Users2 className="h-4 w-4 text-[#2c6e62]" />
              Seeded admin: admin@garudalens.demo
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}