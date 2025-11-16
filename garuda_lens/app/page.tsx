// app/page.tsx
import React from "react";
import Link from "next/link";
import { Map, Sparkles, Brain, ArrowRight, Satellite } from "lucide-react";

const highlights = [
  {
    icon: <Map className="h-5 w-5 text-sky-600" />,
    title: "Live satellite change maps",
    text: "Compare before/after satellite imagery and see change masks right on the map.",
  },
  {
    icon: <Brain className="h-5 w-5 text-sky-600" />,
    title: "U‑Net deep learning model",
    text: "Pixel-level land use & land cover change detection using a trained U‑Net.",
  },
  {
    icon: <Sparkles className="h-5 w-5 text-sky-600" />,
    title: "Gemini-powered insights",
    text: "Ask questions in natural language and get clear explanations, not raw pixels.",
  },
];

const steps = [
  {
    label: "1",
    title: "Select or ask",
    text: "Choose an area on the map or type a query like 'Urban growth in Dubai, 2018–2024'.",
  },
  {
    label: "2",
    title: "AI parses your intent",
    text: "Gemini turns your query into structured parameters for the backend.",
  },
  {
    label: "3",
    title: "Model detects change",
    text: "FastAPI fetches Sentinel data, runs U‑Net, and generates change masks & stats.",
  },
  {
    label: "4",
    title: "Visualize & read",
    text: "View overlays, charts, and a short AI-generated summary of what changed.",
  },
];

const useCases = [
  "Urban growth & sprawl monitoring",
  "Deforestation & environmental change",
  "Agricultural land conversion",
  "Water body shrinkage/expansion",
  "Post‑disaster damage mapping",
];

const stack = [
  "Next.js + TypeScript",
  "FastAPI (Python)",
  "U‑Net (TensorFlow/Keras)",
  "Sentinel Hub API",
  "Google Gemini API",
  "Docker & docker-compose",
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900" suppressHydrationWarning={true}>
      {/* Background accents */}
      <div className="pointer-events-none fixed inset-x-0 top-[-6rem] z-0 flex justify-center blur-3xl">
        <div className="h-56 w-[40rem] bg-gradient-to-tr from-sky-200 via-sky-100 to-indigo-100 opacity-70" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-slate-200/70 bg-white/70 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-600 text-xs font-semibold text-white shadow-sm">
              DA
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold tracking-tight">Drishya AI</p>
              <p className="text-[11px] text-slate-500">
                Satellite Change Intelligence
              </p>
            </div>
          </div>
          <nav className="hidden items-center gap-5 text-xs font-medium text-slate-600 md:flex">
            <a href="#highlights" className="hover:text-slate-900">
              Product
            </a>
            <a href="#how" className="hover:text-slate-900">
              How it works
            </a>
            <a href="#use-cases" className="hover:text-slate-900">
              Use cases
            </a>
            <a href="#project" className="hover:text-slate-900">
              Project
            </a>
          </nav>
          <Link
            href="/dashboard"
            className="hidden items-center rounded-full bg-slate-900 px-4 py-1.5 text-xs font-semibold text-slate-50 shadow-sm transition hover:bg-slate-800 md:inline-flex"
          >
            Launch Dashboard
            <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 border-b border-slate-200/70 bg-gradient-to-b from-transparent via-slate-50 to-slate-100/70">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 pb-12 pt-10 sm:px-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-14 lg:px-8 lg:pb-16 lg:pt-16">
          {/* Left */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-[11px] text-slate-600 shadow-sm">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-600/10 text-sky-700">
                <Satellite className="h-3 w-3" />
              </span>
              AI-powered satellite change detection · Capstone project
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl lg:text-[2.7rem]">
                See how our planet changes,
                <span className="block bg-gradient-to-r from-sky-600 via-sky-700 to-indigo-700 bg-clip-text text-transparent">
                  just by asking a question.
                </span>
              </h1>
              <p className="max-w-xl text-sm text-slate-600 sm:text-base">
                Drishya AI is a web platform that turns Sentinel satellite
                imagery into real-time, AI‑explained change maps for cities,
                forests, farms, water bodies, and more.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link href="/dashboard">
                <button className="inline-flex items-center rounded-full bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700">
                  Launch Dashboard
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </button>
              </Link>
              <button className="inline-flex items-center rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100">
                View architecture
              </button>
            </div>

            <div className="pt-2 text-xs text-slate-500">
              Built for: urban planners · environmental teams · policymakers ·
              disaster response units
            </div>
          </div>

          {/* Right – mock UI card */}
          <div className="flex items-center lg:justify-end">
            <div className="relative w-full max-w-md rounded-3xl border border-slate-200/80 bg-white/80 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.12)] backdrop-blur-sm">
              {/* Map header */}
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-600">
                    Change detection preview
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Example: Urban expansion, Delhi 2015–2023
                  </p>
                </div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-medium text-emerald-700">
                  AI summary
                </span>
              </div>

              {/* Map mock */}
              <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                <div className="h-48 bg-gradient-to-br from-slate-200 via-sky-100 to-emerald-100 relative">
                  <div
                    className="w-full h-full rounded-2xl border border-slate-200 bg-cover bg-center"
                    style={{
                      backgroundImage: `url('https://t4.ftcdn.net/jpg/02/65/42/55/360_F_265425516_wtAw64cGdOVvrdl64b5bsyBqcD0rkw1W.jpg')`,
                    }}
                  ></div>
                  {/* Overlay text */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="rounded-xl border border-white/60 bg-white/80 px-4 py-3 text-center shadow-sm">
                      <p className="text-xs font-semibold text-slate-800">
                        Map + change overlay
                      </p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Leaflet map · U‑Net mask · Sentinel imagery
                      </p>
                    </div>
                  </div>
                </div>
                <div className="grid border-t border-slate-200 bg-white/80 text-[11px]">
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-slate-500">Changed area</span>
                    <span className="text-sm font-semibold text-slate-900">
                      12.4%
                    </span>
                  </div>
                  <div className="border-t border-slate-200 px-3 py-2 text-[11px] text-slate-600">
                    Delhi saw a 12.4% expansion in urban areas, mainly replacing agricultural land in the northwest.
                  </div>
                </div>
              </div>

              {/* Prompt bar */}
              <div className="mt-3 flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] text-slate-500">
                <Sparkles className="mr-2 h-3.5 w-3.5 text-sky-500" />
                Ask: "Show deforestation near Amazon basin from 2017 to 2024"
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section
        id="highlights"
        className="relative z-10 border-b border-slate-200/70 bg-white"
      >
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-600">
                What Drishya AI does
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">
                From raw satellite pixels to readable, map‑first insights.
              </h2>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {highlights.map((item) => (
              <div
                key={item.title}
                className="flex h-full flex-col rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 shadow-sm"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-50">
                  {item.icon}
                </div>
                <h3 className="mt-3 text-sm font-semibold text-slate-900">
                  {item.title}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-600 sm:text-[13px]">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section
        id="how"
        className="relative z-10 bg-gradient-to-b from-slate-50 to-slate-100/70"
      >
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-600">
                How it works
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">
                A simple 4‑step flow, powered by modern AI.
              </h2>
            </div>
            <div
              id="stack"
              className="hidden rounded-full border border-slate-300 bg-white px-3 py-1.5 text-[11px] text-slate-600 sm:inline-flex"
            >
              Frontend: Next.js · Backend: FastAPI · AI: Gemini + U‑Net
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-4">
            {steps.map((step) => (
              <div
                key={step.label}
                className="relative flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-sky-600 text-[11px] font-semibold text-white">
                    {step.label}
                  </span>
                  <span className="h-0.5 w-10 rounded-full bg-sky-500/70" />
                </div>
                <h3 className="text-[13px] font-semibold text-slate-900">
                  {step.title}
                </h3>
                <p className="mt-2 text-[11px] leading-relaxed text-slate-600">
                  {step.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use cases + Stack */}
      <section
        id="use-cases"
        className="relative z-10 border-t border-slate-200/70 bg-white"
      >
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start">
            {/* Use cases */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-600">
                Use cases
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">
                One interface for multiple geospatial questions.
              </h2>
              <p className="mt-3 text-sm text-slate-600">
                Drishya AI is designed for any scenario where understanding
                "what changed, where, and when" is critical.
              </p>
              <ul className="mt-4 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
                {useCases.map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[13px]"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Stack */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">
                Under the hood
              </h3>
              <p className="mt-1 text-[11px] text-slate-600">
                Modern, containerized stack for end-to-end geospatial AI.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {stack.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] text-slate-700"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Project & Team */}
      <section
        id="project"
        className="relative z-10 border-t border-slate-200/70 bg-slate-50"
      >
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.1fr)]">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-600">
                Project
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">
                Drishya AI · AI‑powered Satellite Intelligence Platform
              </h2>
              <p className="mt-3 text-sm text-slate-600">
                An academic capstone project showcasing how live satellite
                imagery, deep learning, and large language models can be
                combined into a single, intuitive web experience for monitoring
                our changing planet.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900">
                  Guided by
                </h3>
                <p className="mt-1 text-sm text-slate-700">
                  Ms. Mankirat Kaur
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900">
                  Project team
                </h3>
                <ul className="mt-1 space-y-1 text-[13px] text-slate-700">
                  <li>Prabhdeep Singh (02213202722)</li>
                  <li>Aryan Bains (06513202722)</li>
                  <li>Japeen Kaur Sehgal (09213202722)</li>
                  <li>Simardeep Kaur Bhatia (02313202722)</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <button className="inline-flex items-center rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-slate-50 shadow-sm hover:bg-slate-800">
              Open project report
            </button>
            <button className="inline-flex items-center rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100">
              View code repository
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-4 text-[11px] text-slate-500 sm:flex-row sm:px-6 lg:px-8">
          <span>© {new Date().getFullYear()} Drishya AI · Academic Project</span>
          <span>Next.js · TypeScript · FastAPI · U‑Net · Sentinel Hub · Gemini</span>
        </div>
      </footer>
    </main>
  );
}
