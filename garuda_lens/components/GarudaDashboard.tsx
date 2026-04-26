"use client";

/**
 * GarudaDashboard  –  Production-grade redesign
 * -----------------------------------------------
 * Layout:
 *   • Full-viewport, two-column: 380 px sidebar | map area
 *   • Sidebar has three tabs: Analyse / History / Admin
 *   • Map is always visible; after a run, metric chips float above it
 *   • Auth gate: centred auth card over blurred map background
 */

import dynamic from "next/dynamic";
import Image from "next/image";
import {
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  Download,
  Eye,
  Layers3,
  Leaf,
  LoaderCircle,
  LogOut,
  MapPin,
  Radar,
  RefreshCw,
  Search,
  Settings2,
  Trash2,
  UserCog,
  Waves,
  X,
} from "lucide-react";

import {
  garudaApi,
  type AdminSummary,
  type AdminUser,
  type AnalysisResult,
  type GarudaUser,
  type HistoryItem,
  type LocationPreset,
} from "@/lib/garuda-api";

// Dynamic import — Leaflet needs browser APIs
const AnalysisMap = dynamic(() => import("@/components/AnalysisMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#f0ede6]">
      <LoaderCircle className="h-6 w-6 animate-spin text-[#2c6e62]" />
    </div>
  ),
});

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------
type AuthMode = "login" | "register";
type SessionState = "loading" | "unauthenticated" | "authenticated";
type SidebarTab = "analyse" | "history" | "admin";
type BannerTone = "success" | "error" | "info";
type ImageViewKey =
  | "overlay"
  | "ndvi_overlay"
  | "classification_overlay"
  | "before"
  | "after"
  | "mask";

interface BannerState {
  tone: BannerTone;
  text: string;
}

interface AnalysisFormState {
  usePreset: boolean;
  presetId: string;
  locationName: string;
  latitude: string;
  longitude: string;
  zoomLevel: string;
  resolution: string;
  mode: string;
  beforeDate: string;
  afterDate: string;
  timelineYears: number;
}

const ZOOM_OPTIONS = [
  "City-Wide (0.025°)",
  "Block-Level (0.01°)",
  "Zoomed-In (0.005°)",
];
const RESOLUTION_OPTIONS = ["Coarse (10m)", "Standard (5m)", "Fine (2.5m)"];
const TIMELINE_OPTIONS = [3, 4, 5, 6, 7, 8];

const EMPTY_FORM: AnalysisFormState = {
  usePreset: true,
  presetId: "",
  locationName: "",
  latitude: "",
  longitude: "",
  zoomLevel: ZOOM_OPTIONS[0],
  resolution: RESOLUTION_OPTIONS[1],
  mode: "rgb",
  beforeDate: "",
  afterDate: "",
  timelineYears: 5,
};

const IMAGE_TABS: Array<{
  key: ImageViewKey;
  label: string;
  desc: string;
}> = [
  {
    key: "overlay",
    label: "Change",
    desc: "Binary change mask blended over the latest RGB frame.",
  },
  {
    key: "ndvi_overlay",
    label: "NDVI",
    desc: "Vegetation health from B08/B04 bands.",
  },
  {
    key: "classification_overlay",
    label: "Category",
    desc: "Urban, vegetation, water and bare-land classes.",
  },
  { key: "before", label: "Before", desc: "Earlier baseline satellite capture." },
  { key: "after", label: "After", desc: "Latest capture used for comparison." },
  { key: "mask", label: "Mask", desc: "Raw changed-pixel binary mask." },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function fmtDate(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (isNaN(d.getTime())) return v;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

function fmtDateTime(v: string) {
  const d = new Date(v);
  if (isNaN(d.getTime())) return v;
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

function toPng(b64?: string | null) {
  if (!b64) return "";
  return b64.startsWith("data:") ? b64 : `data:image/png;base64,${b64}`;
}

function toGif(b64?: string | null) {
  if (!b64) return "";
  return b64.startsWith("data:") ? b64 : `data:image/gif;base64,${b64}`;
}

function severityColor(s: string) {
  switch (s.toLowerCase()) {
    case "extreme":
      return "bg-rose-100 text-rose-700";
    case "high":
      return "bg-amber-100 text-amber-700";
    case "moderate":
      return "bg-sky-100 text-sky-700";
    default:
      return "bg-emerald-100 text-emerald-700";
  }
}

function bannerCls(t: BannerTone) {
  if (t === "error") return "bg-rose-50 border-rose-200 text-rose-700";
  if (t === "success") return "bg-emerald-50 border-emerald-200 text-emerald-700";
  return "bg-sky-50 border-sky-200 text-sky-700";
}

function applyPreset(f: AnalysisFormState, p: LocationPreset): AnalysisFormState {
  return {
    ...f,
    presetId: p.id,
    locationName: p.label,
    zoomLevel: p.zoomLevel,
    resolution: p.resolution,
    timelineYears: p.timelineYears,
  };
}

function presetTags(p: LocationPreset) {
  if (p.tags && p.tags.length > 0) return p.tags;
  return [p.country, p.category ?? "preset", p.resolution].filter(Boolean) as string[];
}

function defaultImageView(r: AnalysisResult): ImageViewKey {
  if (r.analysis_mode === "ndvi" && r.images.ndvi_overlay) return "ndvi_overlay";
  return "overlay";
}

// ---------------------------------------------------------------------------
// Micro primitives
// ---------------------------------------------------------------------------
function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">
      {children}
    </label>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function StyledInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#2c6e62] focus:ring-2 focus:ring-[#2c6e62]/10 ${props.className ?? ""}`}
    />
  );
}

function StyledSelect(
  props: React.SelectHTMLAttributes<HTMLSelectElement> & {
    children: React.ReactNode;
  }
) {
  return (
    <div className="relative">
      <select
        {...props}
        className={`h-9 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-8 text-sm text-slate-900 outline-none transition focus:border-[#2c6e62] focus:ring-2 focus:ring-[#2c6e62]/10 ${props.className ?? ""}`}
      >
        {props.children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
    </div>
  );
}

function SegmentControl({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition ${
            value === o.value
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function StatChip({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-xl border border-white/70 bg-white/92 px-3.5 py-2.5 shadow-lg backdrop-blur-md">
      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-bold text-slate-900">{value}</p>
      <p className="mt-0.5 text-[10px] text-slate-500">{sub}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Result drawer
// ---------------------------------------------------------------------------
function ResultDrawer({
  result,
  analysisId,
  onClose,
  onDownloadPdf,
}: {
  result: AnalysisResult;
  analysisId: string;
  onClose: () => void;
  onDownloadPdf: (id: string) => void;
}) {
  const [tab, setTab] = useState<ImageViewKey>(defaultImageView(result));
  const [tall, setTall] = useState(false);

  const activeTab = IMAGE_TABS.find((t) => t.key === tab);

  return (
    <div
      className={`absolute inset-x-0 bottom-0 z-30 flex flex-col overflow-hidden rounded-t-2xl border-t border-slate-100 bg-white shadow-2xl transition-[height] duration-300 ease-in-out ${
        tall ? "h-[85vh]" : "h-[440px]"
      }`}
    >
      {/* Header */}
      <div className="flex shrink-0 items-center gap-3 border-b border-slate-100 px-4 py-2.5">
        <div className="mx-auto h-1 w-8 rounded-full bg-slate-200 cursor-pointer" onClick={() => setTall((v) => !v)} />
        <div className="flex flex-1 items-center gap-2 overflow-hidden">
          <h3 className="truncate text-sm font-semibold text-slate-900">
            {result.location.name}
          </h3>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${severityColor(
              result.statistics.severity
            )}`}
          >
            {result.statistics.severity}
          </span>
          <span className="hidden shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500 sm:inline">
            {fmtDate(result.dates.before)} → {fmtDate(result.dates.after)}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => onDownloadPdf(analysisId)}
            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5" />
            PDF
          </button>
          <button
            type="button"
            onClick={() => setTall((v) => !v)}
            className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 shadow-sm hover:bg-slate-50"
          >
            <Layers3 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 shadow-sm hover:bg-slate-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1.1fr)_300px] overflow-hidden">
        {/* Image viewer */}
        <div className="flex min-h-0 flex-col overflow-hidden border-r border-slate-100">
          {/* Tabs */}
          <div className="flex shrink-0 gap-1 overflow-x-auto px-3 py-2">
            {IMAGE_TABS.filter((t) => Boolean(result.images[t.key])).map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`shrink-0 rounded-md px-3 py-1 text-xs font-semibold transition ${
                  tab === t.key
                    ? "bg-[#153b36] text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Image */}
          <div className="relative min-h-0 flex-1 bg-slate-950">
            {result.images[tab] ? (
              <Image
                src={toPng(result.images[tab])}
                alt={`${result.location.name} ${tab}`}
                fill
                className="object-contain"
                unoptimized
              />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-slate-500">
                Image not available
              </div>
            )}
          </div>

          {/* Caption */}
          <p className="shrink-0 border-t border-slate-100 px-3 py-1.5 text-[10px] text-slate-500">
            {activeTab?.desc}
          </p>
        </div>

        {/* Stats panel */}
        <div className="flex min-h-0 flex-col divide-y divide-slate-100 overflow-y-auto">
          {/* Numbers */}
          <div className="px-4 py-3">
            <p className="mb-2.5 text-[9px] font-bold uppercase tracking-widest text-slate-400">
              Statistics
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                {
                  label: "Area",
                  value: `${result.statistics.changed_area_sq_km.toFixed(3)} km²`,
                  sub: `${result.statistics.football_fields} football fields`,
                },
                {
                  label: "Intensity",
                  value: `${result.statistics.change_percentage.toFixed(2)}%`,
                  sub: `${result.statistics.changed_pixels.toLocaleString()} px`,
                },
                {
                  label: "Resolution",
                  value: `${result.statistics.resolution_m}m`,
                  sub: result.zoom_level.split(" ")[0],
                },
                {
                  label: "Credits",
                  value: result.statistics.estimated_credit_cost.toFixed(2),
                  sub: result.demo_mode ? "Demo" : "Live",
                },
              ].map((s) => (
                <div key={s.label} className="rounded-lg bg-slate-50 p-2.5">
                  <p className="text-[9px] text-slate-400">{s.label}</p>
                  <p className="mt-0.5 text-xs font-bold text-slate-900">{s.value}</p>
                  <p className="mt-0.5 text-[9px] text-slate-500">{s.sub}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Classification bars */}
          <div className="px-4 py-3">
            <p className="mb-2.5 text-[9px] font-bold uppercase tracking-widest text-slate-400">
              Change category
            </p>
            <div className="space-y-2.5">
              {Object.values(result.classification)
                .sort((a, b) => b.count - a.count)
                .map((item) => (
                  <div key={item.label}>
                    <div className="mb-1 flex items-center justify-between text-[10px]">
                      <span className="font-semibold text-slate-700">{item.label}</span>
                      <span className="text-slate-400">{item.percentage.toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-100">
                      <div
                        className="h-1.5 rounded-full transition-all"
                        style={{
                          width: `${Math.max(item.percentage, 2)}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Warnings */}
          <div className="px-4 py-3">
            {result.warnings.length > 0 ? (
              <div className="space-y-2">
                {result.warnings.map((w) => (
                  <div
                    key={w}
                    className="flex gap-2 rounded-lg bg-amber-50 px-2.5 py-2 text-[10px] text-amber-700"
                  >
                    <AlertTriangle className="mt-px h-3 w-3 shrink-0" />
                    {w}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex gap-2 rounded-lg bg-emerald-50 px-2.5 py-2 text-[10px] text-emerald-700">
                <CheckCircle2 className="mt-px h-3 w-3 shrink-0" />
                No backend warnings.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Timeline modal
// ---------------------------------------------------------------------------
function TimelineModal({
  result,
  onClose,
}: {
  result: AnalysisResult;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Timeline · {result.location.name}
            </h2>
            <p className="text-[11px] text-slate-500">
              {result.timeline.years.join(" · ")} — animated change progression
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1.3fr)_220px] overflow-hidden">
          <div className="relative overflow-hidden bg-slate-950">
            {result.timeline.gif ? (
              <Image
                src={toGif(result.timeline.gif)}
                alt="timeline animation"
                fill
                className="object-contain"
                unoptimized
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                Animation unavailable
              </div>
            )}
          </div>

          <div className="overflow-y-auto border-l border-slate-100 px-3.5 py-4">
            <p className="mb-3 text-[9px] font-bold uppercase tracking-widest text-slate-400">
              Yearly frames
            </p>
            <div className="space-y-2.5">
              {result.timeline.frames.map((frame) => (
                <div
                  key={frame.year}
                  className="overflow-hidden rounded-xl border border-slate-200"
                >
                  <div className="relative h-24 bg-slate-900">
                    <Image
                      src={toPng(frame.image)}
                      alt={`${frame.year}`}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <p className="px-2.5 py-1.5 text-xs font-semibold text-slate-700">
                    {frame.year}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function GarudaDashboard() {
  // Session
  const [sessionState, setSessionState] = useState<SessionState>("loading");
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authForm, setAuthForm] = useState({
    fullName: "",
    email: "",
    password: "",
  });
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [user, setUser] = useState<GarudaUser | null>(null);

  // Presets & form
  const [presets, setPresets] = useState<LocationPreset[]>([]);
  const [form, setForm] = useState<AnalysisFormState>(EMPTY_FORM);
  const [analysisSubmitting, setAnalysisSubmitting] = useState(false);
  const [currentAnalysisId, setCurrentAnalysisId] = useState<string | null>(null);
  const [currentResult, setCurrentResult] = useState<AnalysisResult | null>(null);
  const [showResultDrawer, setShowResultDrawer] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);

  // Sidebar
  const [activeTab, setActiveTab] = useState<SidebarTab>("analyse");

  // History
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyFilter, setHistoryFilter] = useState("");
  const [historyActionId, setHistoryActionId] = useState<string | null>(null);

  // Admin
  const [adminSummary, setAdminSummary] = useState<AdminSummary | null>(null);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [adminActionId, setAdminActionId] = useState<string | null>(null);
  const [tempPw, setTempPw] = useState<{
    email: string;
    password: string;
  } | null>(null);

  // Banner
  const [banner, setBanner] = useState<BannerState | null>(null);
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const deferredHistoryFilter = useDeferredValue(historyFilter);

  const selectedPreset = presets.find((p) => p.id === form.presetId) ?? null;

  const filteredHistory = history.filter((item) => {
    const q = deferredHistoryFilter.trim().toLowerCase();
    if (!q) return true;
    return (
      item.location_name.toLowerCase().includes(q) ||
      item.severity.toLowerCase().includes(q) ||
      item.dominant_change.replaceAll("_", " ").toLowerCase().includes(q)
    );
  });

  function showBanner(b: BannerState) {
    setBanner(b);
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    bannerTimerRef.current = setTimeout(() => setBanner(null), 6000);
  }

  // ---------------------------------------------------------------------------
  // Data loaders
  // ---------------------------------------------------------------------------
  const loadPrivateData = useCallback(async (u: GarudaUser) => {
    const [items, summary, users] = await Promise.all([
      garudaApi.getHistory(),
      u.is_admin ? garudaApi.getAdminSummary() : Promise.resolve(null),
      u.is_admin ? garudaApi.getAdminUsers() : Promise.resolve([]),
    ]);
    setHistory(items);
    setAdminSummary(summary);
    setAdminUsers(users);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      try {
        const presetsPayload = await garudaApi.getPresets();
        if (cancelled) return;
        setPresets(presetsPayload.presets);
        if (presetsPayload.presets[0]) {
          setForm((f) =>
            f.presetId ? f : applyPreset(f, presetsPayload.presets[0])
          );
        }
        const u = await garudaApi.getCurrentUser();
        if (cancelled) return;
        if (u) {
          setUser(u);
          setSessionState("authenticated");
          await loadPrivateData(u);
        } else {
          setSessionState("unauthenticated");
        }
      } catch {
        if (!cancelled) setSessionState("unauthenticated");
      }
    }
    void boot();
    return () => {
      cancelled = true;
    };
  }, [loadPrivateData]);

  // ---------------------------------------------------------------------------
  // Auth
  // ---------------------------------------------------------------------------
  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setAuthSubmitting(true);
    setBanner(null);
    try {
      const res =
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
      setUser(res.user);
      setSessionState("authenticated");
      setAuthForm({ fullName: "", email: "", password: "" });
      showBanner({ tone: "success", text: res.message });
      await loadPrivateData(res.user);
    } catch (err) {
      showBanner({
        tone: "error",
        text: err instanceof Error ? err.message : "Auth failed.",
      });
    } finally {
      setAuthSubmitting(false);
    }
  }

  async function handleLogout() {
    try {
      await garudaApi.logout();
    } catch {
      /* ignore */
    }
    setUser(null);
    setCurrentAnalysisId(null);
    setCurrentResult(null);
    setShowResultDrawer(false);
    setHistory([]);
    setAdminSummary(null);
    setAdminUsers([]);
    setSessionState("unauthenticated");
    showBanner({ tone: "info", text: "Session closed." });
  }

  // ---------------------------------------------------------------------------
  // Preset handling
  // ---------------------------------------------------------------------------
  function handlePresetSelect(id: string) {
    const p = presets.find((x) => x.id === id);
    setForm((f) => (p ? applyPreset(f, p) : { ...f, presetId: id }));
  }

  function handleMapPresetClick(id: string) {
    handlePresetSelect(id);
    setActiveTab("analyse");
  }

  // ---------------------------------------------------------------------------
  // Analysis
  // ---------------------------------------------------------------------------
  async function runAnalysis() {
    const locName = form.usePreset
      ? selectedPreset?.label ?? form.locationName.trim()
      : form.locationName.trim();
    if (!locName) {
      showBanner({
        tone: "error",
        text: "Pick a preset or enter a location name.",
      });
      return;
    }
    const hasLat = form.latitude.trim() !== "";
    const hasLon = form.longitude.trim() !== "";
    if (!form.usePreset && hasLat !== hasLon) {
      showBanner({
        tone: "error",
        text: "Provide both latitude and longitude, or leave both empty.",
      });
      return;
    }
    setAnalysisSubmitting(true);
    setBanner(null);
    try {
      const res = await garudaApi.runAnalysis({
        location_name: locName,
        preset_id: form.usePreset ? form.presetId : undefined,
        coordinates:
          !form.usePreset && hasLat && hasLon
            ? { lat: Number(form.latitude), lon: Number(form.longitude) }
            : undefined,
        zoom_level: form.zoomLevel,
        resolution: form.resolution,
        mode: form.mode,
        before_date: form.beforeDate || undefined,
        after_date: form.afterDate || undefined,
        timeline_years: form.timelineYears,
      });
      startTransition(() => {
        setCurrentAnalysisId(res.analysis_id);
        setCurrentResult(res.result);
        setShowResultDrawer(true);
      });
      if (user) await loadPrivateData(user);
      showBanner({
        tone: "success",
        text: res.result.demo_mode
          ? "Analysis complete (demo mode). PDF & history ready."
          : "Analysis complete. Result persisted.",
      });
    } catch (err) {
      showBanner({
        tone: "error",
        text: err instanceof Error ? err.message : "Analysis failed.",
      });
    } finally {
      setAnalysisSubmitting(false);
    }
  }

  // ---------------------------------------------------------------------------
  // History
  // ---------------------------------------------------------------------------
  async function openHistoryItem(item: HistoryItem) {
    setHistoryActionId(item.id);
    setBanner(null);
    try {
      const detail = await garudaApi.getAnalysis(item.id);
      if (!detail.result) throw new Error("No result payload in saved analysis.");
      startTransition(() => {
        setCurrentAnalysisId(item.id);
        setCurrentResult(detail.result as AnalysisResult);
        setShowResultDrawer(true);
      });
    } catch (err) {
      showBanner({
        tone: "error",
        text: err instanceof Error ? err.message : "Failed to open.",
      });
    } finally {
      setHistoryActionId(null);
    }
  }

  async function deleteHistoryItem(item: HistoryItem) {
    if (!window.confirm(`Delete analysis for ${item.location_name}?`)) return;
    setHistoryActionId(item.id);
    try {
      await garudaApi.deleteAnalysis(item.id);
      if (currentAnalysisId === item.id) {
        setCurrentAnalysisId(null);
        setCurrentResult(null);
        setShowResultDrawer(false);
      }
      if (user) await loadPrivateData(user);
      showBanner({ tone: "success", text: "Deleted." });
    } catch (err) {
      showBanner({
        tone: "error",
        text: err instanceof Error ? err.message : "Delete failed.",
      });
    } finally {
      setHistoryActionId(null);
    }
  }

  // ---------------------------------------------------------------------------
  // PDF download
  // ---------------------------------------------------------------------------
  function downloadReport(id: string) {
    // Navigate directly — the backend sets Content-Disposition: attachment
    // with a human-readable filename, and the httpOnly cookie is sent
    // automatically.  This avoids the cross-origin blob issue where
    // Chromium ignores the `a.download` attribute.
    window.open(garudaApi.downloadReportUrl(id), "_blank");
  }

  // ---------------------------------------------------------------------------
  // Admin
  // ---------------------------------------------------------------------------
  async function toggleDemoMode(enabled: boolean) {
    if (!user?.is_admin) return;
    setAdminActionId("demo");
    try {
      await garudaApi.setDemoMode(enabled);
      if (user) await loadPrivateData(user);
      showBanner({
        tone: "success",
        text: enabled ? "Demo mode enabled." : "Live mode enabled.",
      });
    } catch (err) {
      showBanner({
        tone: "error",
        text: err instanceof Error ? err.message : "Failed.",
      });
    } finally {
      setAdminActionId(null);
    }
  }

  async function updateUser(
    au: AdminUser,
    patch: Partial<Pick<AdminUser, "is_active" | "is_admin">>,
    msg: string
  ) {
    if (!user?.is_admin) return;
    setAdminActionId(au.id);
    try {
      await garudaApi.updateAdminUser(au.id, patch);
      if (user) await loadPrivateData(user);
      showBanner({ tone: "success", text: msg });
    } catch (err) {
      showBanner({
        tone: "error",
        text: err instanceof Error ? err.message : "Update failed.",
      });
    } finally {
      setAdminActionId(null);
    }
  }

  async function resetPassword(au: AdminUser) {
    if (!user?.is_admin) return;
    setAdminActionId(`reset-${au.id}`);
    try {
      const res = await garudaApi.resetAdminUserPassword(au.id);
      setTempPw({ email: au.email, password: res.temporary_password });
      if (user) await loadPrivateData(user);
      showBanner({
        tone: "success",
        text: `Temp password generated for ${au.email}.`,
      });
    } catch (err) {
      showBanner({
        tone: "error",
        text: err instanceof Error ? err.message : "Reset failed.",
      });
    } finally {
      setAdminActionId(null);
    }
  }

  // ============================================================
  // Loading
  // ============================================================
  if (sessionState === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f5f1e8]">
        <div className="flex items-center gap-3 rounded-full border bg-white px-5 py-3 text-sm text-slate-600 shadow-sm">
          <LoaderCircle className="h-4 w-4 animate-spin text-[#2c6e62]" />
          Loading Garuda Lens…
        </div>
      </div>
    );
  }

  // ============================================================
  // Auth gate — map blurred in background
  // ============================================================
  if (sessionState === "unauthenticated" || !user) {
    return (
      <div className="relative h-screen overflow-hidden">
        {/* Map in background, greyed */}
        <div className="absolute inset-0 opacity-25 grayscale">
          <AnalysisMap
            presets={presets}
            selectedPresetId={presets[0]?.id ?? null}
            analysisResult={null}
          />
        </div>
        <div className="absolute inset-0 bg-[#153b36]/75 backdrop-blur-sm" />

        <div className="absolute inset-0 flex flex-col items-center justify-center px-4">
          {/* Brand */}
          <div className="mb-5 flex items-center gap-3 text-white">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f3d8a8] text-lg font-black text-[#153b36]">
              GL
            </div>
            <div>
              <p className="text-lg font-bold tracking-tight leading-none">
                Garuda Lens
              </p>
              <p className="mt-0.5 text-xs text-white/60">
                Satellite change intelligence
              </p>
            </div>
          </div>

          {/* Card */}
          <div className="w-full max-w-[360px] overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* Tab */}
            <div className="border-b border-slate-100 p-4">
              <SegmentControl
                options={[
                  { value: "login", label: "Sign in" },
                  { value: "register", label: "Sign up" },
                ]}
                value={authMode}
                onChange={(v) => setAuthMode(v as AuthMode)}
              />
            </div>

            <form onSubmit={handleAuth} className="space-y-4 p-5">
              {banner ? (
                <div
                  className={`rounded-lg border px-3 py-2 text-xs ${bannerCls(
                    banner.tone
                  )}`}
                >
                  {banner.text}
                </div>
              ) : null}

              {authMode === "register" ? (
                <Field label="Full name">
                  <StyledInput
                    value={authForm.fullName}
                    onChange={(e) =>
                      setAuthForm((f) => ({ ...f, fullName: e.target.value }))
                    }
                    placeholder="Field analyst"
                    required
                    minLength={2}
                  />
                </Field>
              ) : null}

              <Field label="Email">
                <StyledInput
                  type="email"
                  value={authForm.email}
                  onChange={(e) =>
                    setAuthForm((f) => ({ ...f, email: e.target.value }))
                  }
                  placeholder="analyst@garudalens.demo"
                  required
                />
              </Field>

              <Field label="Password">
                <StyledInput
                  type="password"
                  value={authForm.password}
                  onChange={(e) =>
                    setAuthForm((f) => ({ ...f, password: e.target.value }))
                  }
                  placeholder="Min 8 characters"
                  required
                  minLength={8}
                />
              </Field>

              <button
                type="submit"
                disabled={authSubmitting}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#153b36] text-sm font-bold text-white transition hover:bg-[#1b4c45] disabled:opacity-60"
              >
                {authSubmitting ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : authMode === "login" ? (
                  <>
                    Open dashboard{" "}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                ) : (
                  <>
                    Create account{" "}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </form>

            <div className="border-t border-slate-100 px-5 py-3">
              <p className="text-[10px] text-slate-400">
                Demo admin —{" "}
                <span className="font-mono">admin@garudalens.demo</span> /{" "}
                <span className="font-mono">Admin@12345</span>
              </p>
            </div>
          </div>

          {/* Preset chips */}
          {presets.length > 0 ? (
            <div className="mt-5 flex flex-wrap justify-center gap-1.5">
              {presets.slice(0, 9).map((p) => (
                <span
                  key={p.id}
                  className="rounded-full border border-white/25 bg-white/10 px-2.5 py-1 text-[10px] text-white/70"
                >
                  {p.label}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  // ============================================================
  // Authenticated dashboard
  // ============================================================
  const isDemo = adminSummary?.demo_mode ?? false;

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* ===== SIDEBAR ===== */}
      <aside className="flex w-[360px] shrink-0 flex-col border-r border-slate-200 bg-[#fafaf8]">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#153b36] text-sm font-black text-[#f3d8a8]">
              GL
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-900 leading-none">
                Garuda Lens
              </p>
              <div className="mt-0.5 flex items-center gap-1.5">
                <span
                  className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                    isDemo ? "bg-amber-400" : "bg-emerald-400"
                  }`}
                />
                <span className="truncate text-[10px] text-slate-500">
                  {isDemo ? "Demo" : "Live"} · {user.full_name}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            title="Sign out"
            onClick={handleLogout}
            className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex shrink-0 border-b border-slate-200">
          {(
            [
              {
                id: "analyse" as SidebarTab,
                icon: <Radar className="h-3.5 w-3.5" />,
                label: "Analyse",
              },
              {
                id: "history" as SidebarTab,
                icon: <Activity className="h-3.5 w-3.5" />,
                label: `History${history.length > 0 ? ` (${history.length})` : ""}`,
              },
              ...(user.is_admin
                ? [
                    {
                      id: "admin" as SidebarTab,
                      icon: <UserCog className="h-3.5 w-3.5" />,
                      label: "Admin",
                    },
                  ]
                : []),
            ] as Array<{
              id: SidebarTab;
              icon: React.ReactNode;
              label: string;
            }>
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 py-2.5 text-[11px] font-bold uppercase tracking-wide transition ${
                activeTab === tab.id
                  ? "border-[#153b36] text-[#153b36]"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Banner */}
        {banner ? (
          <div
            className={`shrink-0 border-b px-4 py-2 text-xs ${bannerCls(banner.tone)}`}
          >
            {banner.text}
          </div>
        ) : null}

        {/* Temp pw */}
        {tempPw ? (
          <div className="shrink-0 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
            <span className="font-semibold">Temp password · {tempPw.email}:</span>{" "}
            <span className="font-mono">{tempPw.password}</span>
          </div>
        ) : null}

        {/* Scrollable area */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {/* ---- ANALYSE ---- */}
          {activeTab === "analyse" ? (
            <div className="space-y-4 px-4 py-4">
              <SegmentControl
                options={[
                  { value: "preset", label: "Preset region" },
                  { value: "custom", label: "Custom input" },
                ]}
                value={form.usePreset ? "preset" : "custom"}
                onChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    usePreset: v === "preset",
                    ...(v === "preset" && presets[0] && !f.presetId
                      ? applyPreset(f, presets[0])
                      : {}),
                  }))
                }
              />

              {form.usePreset ? (
                <>
                  <Field label="Region">
                    <StyledSelect
                      value={form.presetId}
                      onChange={(e) => handlePresetSelect(e.target.value)}
                    >
                      {presets.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label} · {p.country}
                        </option>
                      ))}
                    </StyledSelect>
                  </Field>
                  {selectedPreset ? (
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <p className="text-xs font-semibold text-slate-800">
                        {selectedPreset.description}
                      </p>
                      <p className="mt-1 text-[10px] text-slate-400">
                        {selectedPreset.coordinates.lat.toFixed(4)},{" "}
                        {selectedPreset.coordinates.lon.toFixed(4)}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {presetTags(selectedPreset).map((t) => (
                          <span
                            key={t}
                            className="rounded-md bg-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-500"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </>
              ) : (
                <>
                  <Field label="Location name">
                    <StyledInput
                      value={form.locationName}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, locationName: e.target.value }))
                      }
                      placeholder="Ahmedabad, India"
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Latitude">
                      <StyledInput
                        value={form.latitude}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, latitude: e.target.value }))
                        }
                        placeholder="23.0225"
                      />
                    </Field>
                    <Field label="Longitude">
                      <StyledInput
                        value={form.longitude}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, longitude: e.target.value }))
                        }
                        placeholder="72.5714"
                      />
                    </Field>
                  </div>
                </>
              )}

              {/* Mode */}
              <div>
                <Label>Analysis mode</Label>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  {[
                    {
                      value: "rgb",
                      label: "RGB change",
                      icon: <Layers3 className="h-3.5 w-3.5" />,
                    },
                    {
                      value: "ndvi",
                      label: "NDVI",
                      icon: <Leaf className="h-3.5 w-3.5" />,
                    },
                  ].map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, mode: m.value }))}
                      className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-semibold transition ${
                        form.mode === m.value
                          ? "border-[#2c6e62] bg-[#eef5f4] text-[#153b36]"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {m.icon}
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Zoom + resolution */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Zoom">
                  <StyledSelect
                    value={form.zoomLevel}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, zoomLevel: e.target.value }))
                    }
                  >
                    {ZOOM_OPTIONS.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </StyledSelect>
                </Field>
                <Field label="Resolution">
                  <StyledSelect
                    value={form.resolution}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, resolution: e.target.value }))
                    }
                  >
                    {RESOLUTION_OPTIONS.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </StyledSelect>
                </Field>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Before date">
                  <StyledInput
                    type="date"
                    value={form.beforeDate}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, beforeDate: e.target.value }))
                    }
                  />
                </Field>
                <Field label="After date">
                  <StyledInput
                    type="date"
                    value={form.afterDate}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, afterDate: e.target.value }))
                    }
                  />
                </Field>
              </div>

              {/* Timeline years */}
              <Field label="Timeline years">
                <StyledSelect
                  value={form.timelineYears}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      timelineYears: Number(e.target.value),
                    }))
                  }
                >
                  {TIMELINE_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n} years
                    </option>
                  ))}
                </StyledSelect>
              </Field>

              {/* Run */}
              <button
                type="button"
                disabled={analysisSubmitting}
                onClick={runAnalysis}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#153b36] text-sm font-bold text-white transition hover:bg-[#1b4c45] disabled:opacity-60"
              >
                {analysisSubmitting ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Running…
                  </>
                ) : (
                  <>
                    <Radar className="h-4 w-4" />
                    Run analysis
                  </>
                )}
              </button>

              {/* Timeline shortcut */}
              {currentResult?.timeline.gif ? (
                <button
                  type="button"
                  onClick={() => setShowTimeline(true)}
                  className="flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  <Waves className="h-3.5 w-3.5 text-[#2c6e62]" />
                  View timeline animation
                </button>
              ) : null}

              {/* Show result again if hidden */}
              {currentResult && !showResultDrawer ? (
                <button
                  type="button"
                  onClick={() => setShowResultDrawer(true)}
                  className="flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-[#2c6e62]/30 bg-[#eef5f4] text-xs font-semibold text-[#153b36] transition hover:bg-[#e5f0ef]"
                >
                  <BarChart3 className="h-3.5 w-3.5" />
                  Open last result
                </button>
              ) : null}
            </div>
          ) : null}

          {/* ---- HISTORY ---- */}
          {activeTab === "history" ? (
            <div className="space-y-3 px-4 py-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  value={historyFilter}
                  onChange={(e) => setHistoryFilter(e.target.value)}
                  placeholder="Filter by location, severity…"
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-[#2c6e62] focus:ring-2 focus:ring-[#2c6e62]/10"
                />
              </div>

              {filteredHistory.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center">
                  <MapPin className="mx-auto mb-2 h-6 w-6 text-slate-300" />
                  <p className="text-xs text-slate-400">
                    No saved analyses yet.
                  </p>
                  <p className="mt-0.5 text-[10px] text-slate-400">
                    Run one from the Analyse tab.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredHistory.map((item) => (
                    <div
                      key={item.id}
                      className={`rounded-xl border bg-white px-3 py-3 transition ${
                        currentAnalysisId === item.id
                          ? "border-[#2c6e62] ring-1 ring-[#2c6e62]/20"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex gap-2.5">
                        <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                          {item.thumbnail ? (
                            <Image
                              src={toPng(item.thumbnail)}
                              alt=""
                              width={44}
                              height={44}
                              className="h-full w-full object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <MapPin className="h-4 w-4 text-slate-300" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-1">
                            <p className="truncate text-xs font-semibold text-slate-900">
                              {item.location_name}
                            </p>
                            <span
                              className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${severityColor(
                                item.severity
                              )}`}
                            >
                              {item.severity}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500">
                            {fmtDate(item.before_date)} → {fmtDate(item.after_date)}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {item.change_percentage.toFixed(1)}% · {fmtDateTime(item.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2.5 flex gap-1.5">
                        <button
                          type="button"
                          disabled={historyActionId === item.id}
                          onClick={() => openHistoryItem(item)}
                          className="flex items-center gap-1 rounded-lg bg-[#153b36] px-2.5 py-1.5 text-[10px] font-bold text-white hover:bg-[#1b4c45] disabled:opacity-60"
                        >
                          {historyActionId === item.id ? (
                            <LoaderCircle className="h-3 w-3 animate-spin" />
                          ) : (
                            <Eye className="h-3 w-3" />
                          )}
                          Open
                        </button>
                        {item.report_available ? (
                          <button
                            type="button"
                            onClick={() => downloadReport(item.id)}
                            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-slate-600 hover:bg-slate-50"
                          >
                            <Download className="h-3 w-3" />
                            PDF
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => deleteHistoryItem(item)}
                          className="flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1.5 text-[10px] font-bold text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {/* ---- ADMIN ---- */}
          {activeTab === "admin" && user.is_admin ? (
            <div className="space-y-4 px-4 py-4">
              {!adminSummary ? (
                <div className="flex items-center justify-center py-12">
                  <LoaderCircle className="h-5 w-5 animate-spin text-slate-400" />
                </div>
              ) : (
                <>
                  {/* Summary stats */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Users", value: adminSummary.totals.users },
                      {
                        label: "Analyses",
                        value: adminSummary.totals.analyses,
                      },
                      {
                        label: "Active",
                        value: adminSummary.totals.active_users,
                      },
                    ].map((s) => (
                      <div
                        key={s.label}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-center"
                      >
                        <p className="text-base font-bold text-slate-900">
                          {s.value}
                        </p>
                        <p className="text-[10px] text-slate-400">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Demo mode toggle */}
                  <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold text-slate-900">
                          Sentinel safety switch
                        </p>
                        <p className="mt-0.5 text-[10px] text-slate-500">
                          Demo mode prevents live Sentinel credit burn.
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={adminActionId === "demo"}
                        onClick={() => toggleDemoMode(!adminSummary.demo_mode)}
                        className={`flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-bold transition disabled:opacity-60 ${
                          adminSummary.demo_mode
                            ? "bg-[#153b36] text-white"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {adminActionId === "demo" ? (
                          <LoaderCircle className="h-3 w-3 animate-spin" />
                        ) : null}
                        {adminSummary.demo_mode ? "Demo ON" : "Live ON"}
                      </button>
                    </div>
                  </div>

                  {/* Top locations */}
                  {adminSummary.most_analyzed_locations.length > 0 ? (
                    <div>
                      <Label>Top locations</Label>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {adminSummary.most_analyzed_locations.map((l) => (
                          <span
                            key={l.location}
                            className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600"
                          >
                            {l.location} · {l.count}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {/* Temp pw */}
                  {tempPw ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                      <p className="font-semibold">
                        Temp password · {tempPw.email}
                      </p>
                      <p className="mt-1 font-mono">{tempPw.password}</p>
                    </div>
                  ) : null}

                  {/* Users */}
                  <div className="space-y-2">
                    <Label>Accounts ({adminUsers.length})</Label>
                    {adminUsers.map((au) => (
                      <div
                        key={au.id}
                        className="rounded-xl border border-slate-200 bg-white p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-xs font-semibold text-slate-900">
                              {au.full_name}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {au.email}
                            </p>
                            <p className="mt-0.5 text-[10px] text-slate-400">
                              {au.analysis_count} analyses
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {au.is_admin ? (
                              <span className="rounded-md bg-sky-100 px-1.5 py-0.5 text-[9px] font-bold text-sky-700">
                                Admin
                              </span>
                            ) : null}
                            {!au.is_active ? (
                              <span className="rounded-md bg-rose-100 px-1.5 py-0.5 text-[9px] font-bold text-rose-700">
                                Off
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <div className="mt-2.5 flex flex-wrap gap-1">
                          <button
                            type="button"
                            disabled={adminActionId === au.id}
                            onClick={() =>
                              updateUser(
                                au,
                                { is_active: !au.is_active },
                                `${au.email} ${
                                  au.is_active ? "disabled" : "enabled"
                                }.`
                              )
                            }
                            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                          >
                            {au.is_active ? "Disable" : "Enable"}
                          </button>
                          <button
                            type="button"
                            disabled={adminActionId === au.id}
                            onClick={() =>
                              updateUser(
                                au,
                                { is_admin: !au.is_admin },
                                `${au.email} ${
                                  au.is_admin
                                    ? "demoted"
                                    : "promoted to admin"
                                }.`
                              )
                            }
                            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                          >
                            {au.is_admin ? "Revoke admin" : "Make admin"}
                          </button>
                          <button
                            type="button"
                            disabled={adminActionId === `reset-${au.id}`}
                            onClick={() => resetPassword(au)}
                            className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                          >
                            {adminActionId === `reset-${au.id}` ? (
                              <LoaderCircle className="h-3 w-3 animate-spin" />
                            ) : (
                              <RefreshCw className="h-3 w-3" />
                            )}
                            Reset pw
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : null}
        </div>
      </aside>

      {/* ===== MAP AREA ===== */}
      <div className="relative min-w-0 flex-1 overflow-hidden">
        {/* Map */}
        <div className="absolute inset-0">
          <AnalysisMap
            presets={presets}
            selectedPresetId={form.usePreset ? form.presetId : null}
            analysisResult={currentResult}
            onPresetClick={handleMapPresetClick}
          />
        </div>

        {/* Top-right HUD */}
        <div className="pointer-events-none absolute right-3 top-3 z-20 flex flex-col items-end gap-2">
          <div
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold shadow-sm backdrop-blur-md ${
              isDemo
                ? "border-amber-200 bg-amber-50 text-amber-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isDemo ? "bg-amber-400" : "bg-emerald-400"
              }`}
            />
            {isDemo ? "Demo mode" : "Live Sentinel"}
          </div>
          {user.is_admin ? (
            <button
              type="button"
              onClick={() => setActiveTab("admin")}
              className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-[11px] font-semibold text-slate-700 shadow-sm backdrop-blur-md hover:bg-white"
            >
              <Settings2 className="h-3.5 w-3.5" />
              Admin
            </button>
          ) : null}
        </div>

        {/* Floating metric chips post-analysis (when drawer is closed) */}
        {currentResult && !showResultDrawer ? (
          <div className="pointer-events-none absolute left-3 top-3 z-20 flex flex-wrap gap-2">
            <StatChip
              label="Area changed"
              value={`${currentResult.statistics.changed_area_sq_km.toFixed(3)} km²`}
              sub={`${currentResult.statistics.football_fields} football fields`}
            />
            <StatChip
              label="Intensity"
              value={`${currentResult.statistics.change_percentage.toFixed(2)}%`}
              sub={currentResult.statistics.severity}
            />
            <StatChip
              label="Category"
              value={
                currentResult.classification[currentResult.dominant_change]
                  ?.label ?? currentResult.dominant_change
              }
              sub={`${currentResult.statistics.resolution_m}m`}
            />
            <button
              type="button"
              className="pointer-events-auto flex items-center gap-1.5 rounded-xl border border-white/60 bg-[#153b36]/90 px-3.5 py-2.5 text-xs font-bold text-white shadow-lg backdrop-blur-md hover:bg-[#153b36]"
              onClick={() => setShowResultDrawer(true)}
            >
              <BarChart3 className="h-4 w-4" />
              Full result
            </button>
          </div>
        ) : null}

        {/* Hint when nothing has been run yet */}
        {!currentResult && !analysisSubmitting ? (
          <div className="pointer-events-none absolute bottom-6 left-1/2 z-20 -translate-x-1/2">
            <div className="flex items-center gap-2 rounded-full border border-white/70 bg-white/90 px-4 py-2 text-xs font-medium text-slate-600 shadow-md backdrop-blur-md">
              <MapPin className="h-3.5 w-3.5 text-[#2c6e62]" />
              Select a preset from the sidebar or click any location marker
            </div>
          </div>
        ) : null}

        {/* Analysis-in-progress overlay */}
        {analysisSubmitting ? (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#153b36]/50 backdrop-blur-[3px]">
            <div className="flex items-center gap-3 rounded-2xl border border-white/20 bg-white/95 px-6 py-4 shadow-2xl backdrop-blur-sm">
              <LoaderCircle className="h-5 w-5 animate-spin text-[#2c6e62]" />
              <div>
                <p className="text-sm font-bold text-slate-900">
                  Running {form.mode.toUpperCase()} analysis…
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {isDemo ? "Generating demo assets" : "Querying Sentinel Hub"} · please wait
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {/* Result drawer */}
        {currentResult && showResultDrawer && currentAnalysisId ? (
          <ResultDrawer
            result={currentResult}
            analysisId={currentAnalysisId}
            onClose={() => setShowResultDrawer(false)}
            onDownloadPdf={downloadReport}
          />
        ) : null}
      </div>

      {/* Timeline modal */}
      {showTimeline && currentResult ? (
        <TimelineModal result={currentResult} onClose={() => setShowTimeline(false)} />
      ) : null}
    </div>
  );
}
