"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type InputHTMLAttributes } from "react";

import { garudaApi } from "@/lib/garuda-api";

type AuthMode = "login" | "register";
type SessionState = "loading" | "ready" | "redirecting";
type BannerTone = "error" | "success" | "info";

interface BannerState {
  tone: BannerTone;
  text: string;
}

function bannerCls(tone: BannerTone) {
  if (tone === "error") return "border-rose-200 bg-rose-50/90 text-rose-700";
  if (tone === "success") return "border-emerald-200 bg-emerald-50/90 text-emerald-700";
  return "border-sky-200 bg-sky-50/90 text-sky-700";
}

function Input(props: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block space-y-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
        {props.label}
      </span>
      <input
        {...props}
        className={`h-12 w-full rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#1e5a50] focus:bg-white focus:ring-4 focus:ring-[#1e5a50]/10 ${props.className ?? ""}`}
      />
    </label>
  );
}

export default function AuthExperience() {
  const router = useRouter();
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [sessionState, setSessionState] = useState<SessionState>("loading");
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [banner, setBanner] = useState<BannerState | null>(null);
  const [authForm, setAuthForm] = useState({
    fullName: "",
    email: "",
    password: "",
  });

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        const user = await garudaApi.getCurrentUser();
        if (cancelled) return;

        if (user) {
          setSessionState("redirecting");
          router.replace("/dashboard");
          return;
        }

        setSessionState("ready");
      } catch {
        if (!cancelled) {
          setSessionState("ready");
        }
      }
    }

    void boot();

    return () => {
      cancelled = true;
      if (bannerTimerRef.current) {
        clearTimeout(bannerTimerRef.current);
      }
    };
  }, [router]);

  function showBanner(nextBanner: BannerState) {
    setBanner(nextBanner);
    if (bannerTimerRef.current) {
      clearTimeout(bannerTimerRef.current);
    }
    bannerTimerRef.current = setTimeout(() => setBanner(null), 6000);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthSubmitting(true);
    setBanner(null);

    try {
      const response =
        authMode === "login"
          ? await garudaApi.login({
              email: authForm.email.trim(),
              password: authForm.password,
            })
          : await garudaApi.register({
              full_name: authForm.fullName.trim(),
              email: authForm.email.trim(),
              password: authForm.password,
            });

      showBanner({ tone: "success", text: response.message });
      setSessionState("redirecting");
      router.replace("/dashboard");
    } catch (error) {
      showBanner({
        tone: "error",
        text: error instanceof Error ? error.message : "Authentication failed.",
      });
    } finally {
      setAuthSubmitting(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f4efe6] px-4 py-8 text-slate-900 sm:px-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,#bcd4cc_0%,rgba(188,212,204,0)_34%),radial-gradient(circle_at_bottom_right,#e4cfa4_0%,rgba(228,207,164,0)_28%),linear-gradient(145deg,#f6f2e8_0%,#ebf1ef_48%,#dce7e3_100%)]" />
      <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(21,59,54,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(21,59,54,0.08)_1px,transparent_1px)] [background-size:72px_72px]" />
      <div className="absolute left-[8%] top-[14%] h-44 w-44 rounded-full bg-[#d5e7de]/60 blur-3xl" />
      <div className="absolute bottom-[10%] right-[10%] h-56 w-56 rounded-full bg-[#ead7ad]/55 blur-3xl" />

      <div className="relative z-10 w-full max-w-[440px] overflow-hidden rounded-[2rem] border border-white/90 bg-white/88 shadow-[0_32px_90px_rgba(15,23,42,0.16)] backdrop-blur-xl">
        <div className="border-b border-slate-100 px-6 pb-5 pt-6 sm:px-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7b5d39]">
                Drishya AI
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                {authMode === "login" ? "Sign in" : "Sign up"}
              </h1>
            </div>
            {sessionState !== "ready" ? (
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#eef5f4] text-[#1e5a50]">
                <LoaderCircle className="h-4 w-4 animate-spin" />
              </div>
            ) : null}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100/80 p-1.5">
            {[
              { value: "login", label: "Sign in" },
              { value: "register", label: "Sign up" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setAuthMode(option.value as AuthMode)}
                className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  authMode === option.value
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6 sm:px-7">
          {banner ? (
            <div className={`rounded-2xl border px-4 py-3 text-sm ${bannerCls(banner.tone)}`}>
              {banner.text}
            </div>
          ) : null}

          {authMode === "register" ? (
            <Input
              label="Full name"
              value={authForm.fullName}
              onChange={(event) =>
                setAuthForm((current) => ({
                  ...current,
                  fullName: event.target.value,
                }))
              }
              placeholder="Field analyst"
              required
              minLength={2}
            />
          ) : null}

          <Input
            label="Email"
            type="email"
            value={authForm.email}
            onChange={(event) =>
              setAuthForm((current) => ({
                ...current,
                email: event.target.value,
              }))
            }
            placeholder="analyst@drishyaai.demo"
            required
          />

          <Input
            label="Password"
            type="password"
            value={authForm.password}
            onChange={(event) =>
              setAuthForm((current) => ({
                ...current,
                password: event.target.value,
              }))
            }
            placeholder="Min 8 characters"
            required
            minLength={8}
          />

          <button
            type="submit"
            disabled={authSubmitting || sessionState !== "ready"}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#153b36] px-5 text-sm font-semibold text-white shadow-[0_18px_35px_rgba(21,59,54,0.22)] transition hover:bg-[#1b4c45] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {authSubmitting ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <>
                {authMode === "login" ? "Open dashboard" : "Create account"}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </main>
  );
}