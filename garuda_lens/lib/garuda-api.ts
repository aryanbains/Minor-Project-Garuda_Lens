const API_BASE_URL = (
  process.env.NEXT_PUBLIC_GARUDA_API_URL || "http://localhost:8000"
).replace(/\/$/, "");

const REFRESH_EXCLUDED_PATHS = new Set([
  "/auth/login",
  "/auth/register",
  "/auth/refresh",
  "/auth/logout",
]);

export interface GarudaUser {
  id: string;
  email: string;
  full_name: string;
  is_admin: boolean;
  is_active: boolean;
  is_verified: boolean;
  must_change_password: boolean;
  created_at: string;
  last_login_at: string | null;
}

export interface LocationPreset {
  id: string;
  label: string;
  category?: string;
  region?: string;
  country: string;
  description: string;
  coordinates: {
    lat: number;
    lon: number;
  };
  zoomLevel: string;
  resolution: string;
  bufferDegrees: number;
  timelineYears: number;
  tags?: string[];
}

export interface AnalysisClassificationItem {
  count: number;
  percentage: number;
  label: string;
  color: string;
}

export interface AnalysisStatistics {
  changed_pixels: number;
  total_pixels: number;
  change_percentage: number;
  changed_area_sq_km: number;
  football_fields: number;
  severity: string;
  resolution_m: number;
  estimated_credit_cost: number;
  timeline_frames?: number;
}

export interface AnalysisImages {
  before: string;
  after: string;
  overlay: string;
  mask: string;
  ndvi_overlay?: string;
  classification_overlay?: string;
  thumbnail?: string;
}

export interface TimelineFrame {
  year: number;
  image: string;
}

export interface TimelinePayload {
  years: number[];
  frames: TimelineFrame[];
  gif: string;
  warnings?: string[];
}

export interface AnalysisResult {
  location: {
    name: string;
    preset_id?: string | null;
    latitude: number;
    longitude: number;
  };
  dates: {
    before: string;
    after: string;
  };
  analysis_mode: string;
  demo_mode: boolean;
  warnings: string[];
  statistics: AnalysisStatistics;
  classification: Record<string, AnalysisClassificationItem>;
  dominant_change: string;
  images: AnalysisImages;
  timeline: TimelinePayload;
  ndvi_summary?: Record<string, number | string>;
  classification_summary?: Record<string, number | string>;
  available_dates_count?: number;
  zoom_level: string;
  report?: {
    generated_at?: string;
    status?: string;
    download_url?: string;
  };
}

export interface AnalysisRunPayload {
  location_name: string;
  preset_id?: string;
  coordinates?: {
    lat: number;
    lon: number;
  };
  zoom_level: string;
  resolution: string;
  mode: string;
  before_date?: string;
  after_date?: string;
  timeline_years: number;
}

export interface AnalysisRunResponse {
  analysis_id: string;
  result: AnalysisResult;
}

export interface HistoryItem {
  id: string;
  location_name: string;
  preset_id?: string | null;
  latitude: number;
  longitude: number;
  before_date: string;
  after_date: string;
  change_percentage: number;
  changed_area_sq_km: number;
  football_fields: number;
  severity: string;
  dominant_change: string;
  thumbnail?: string | null;
  demo_mode: boolean;
  mode: string;
  created_at: string;
  report_available: boolean;
  result?: AnalysisResult;
}

export interface AdminSummary {
  totals: {
    users: number;
    active_users: number;
    disabled_users: number;
    analyses: number;
    estimated_credit_consumption: number;
  };
  demo_mode: boolean;
  most_analyzed_locations: Array<{
    location: string;
    count: number;
  }>;
}

export interface AdminUser extends GarudaUser {
  analysis_count: number;
}

function normalizeErrorDetail(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    const parts = value
      .map((item) => normalizeErrorDetail(item))
      .filter((item): item is string => Boolean(item));

    return parts.length > 0 ? parts.join(" ") : null;
  }

  if (value && typeof value === "object") {
    const payload = value as Record<string, unknown>;

    if (typeof payload.msg === "string") {
      const loc = Array.isArray(payload.loc)
        ? payload.loc.map((part) => String(part)).join(" -> ")
        : "";

      return loc ? `${loc}: ${payload.msg}` : payload.msg;
    }

    const nested = normalizeErrorDetail(
      payload.detail ?? payload.message ?? payload.error
    );
    if (nested) {
      return nested;
    }

    const entries = Object.entries(payload)
      .map(([key, item]) => {
        const text = normalizeErrorDetail(item);
        return text ? `${key}: ${text}` : null;
      })
      .filter((item): item is string => Boolean(item));

    return entries.length > 0 ? entries.join(", ") : null;
  }

  return null;
}

async function extractError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as {
      detail?: unknown;
      message?: unknown;
      error?: unknown;
    };

    return (
      normalizeErrorDetail(payload.detail) ||
      normalizeErrorDetail(payload.message) ||
      normalizeErrorDetail(payload.error) ||
      `${response.status} ${response.statusText}`
    );
  } catch {
    return `${response.status} ${response.statusText}`;
  }
}

async function refreshSession(): Promise<boolean> {
  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    credentials: "include",
  });
  if (!response.ok) {
    return false;
  }

  const payload = (await response.json()) as { user?: GarudaUser | null };
  return Boolean(payload.user);
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  retryAuth = true
): Promise<T> {
  const headers = new Headers(init.headers);
  const isFormData =
    typeof FormData !== "undefined" && init.body instanceof FormData;

  if (init.body && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: "include",
    cache: "no-store",
  });

  if (
    response.status === 401 &&
    retryAuth &&
    !REFRESH_EXCLUDED_PATHS.has(path)
  ) {
    const refreshed = await refreshSession();
    if (refreshed) {
      return request<T>(path, init, false);
    }
  }

  if (!response.ok) {
    throw new Error(await extractError(response));
  }

  return (await response.json()) as T;
}

export function buildApiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

export const garudaApi = {
  async getPresets() {
    return request<{ presets: LocationPreset[] }>("/location-presets");
  },

  async getCurrentUser() {
    const payload = await request<{ user: GarudaUser | null; message: string }>(
      "/auth/me"
    );
    if (!payload.user) {
      const refreshed = await refreshSession();
      if (!refreshed) {
        return null;
      }

      const retried = await request<{ user: GarudaUser | null; message: string }>(
        "/auth/me",
        {},
        false
      );
      return retried.user;
    }

    return payload.user;
  },

  async register(input: {
    full_name: string;
    email: string;
    password: string;
  }) {
    return request<{ user: GarudaUser; message: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async login(input: { email: string; password: string }) {
    return request<{ user: GarudaUser; message: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async logout() {
    return request<{ message: string }>("/auth/logout", {
      method: "POST",
    });
  },

  async runAnalysis(payload: AnalysisRunPayload) {
    return request<AnalysisRunResponse>("/analysis/run", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getHistory() {
    const payload = await request<{ analyses: HistoryItem[] }>(
      "/analyze/history"
    );
    return payload.analyses;
  },

  async getAnalysis(analysisId: string) {
    const payload = await request<{ data: HistoryItem }>(
      `/analyze/history/${analysisId}`
    );
    return payload.data;
  },

  async deleteAnalysis(analysisId: string) {
    return request<{ status: string; message: string }>(
      `/analyze/history/${analysisId}`,
      {
        method: "DELETE",
      }
    );
  },

  /**
   * Trigger a PDF download by navigating directly to the report URL.
   * The httpOnly cookie is sent automatically, and the backend's
   * Content-Disposition header controls the filename —  which avoids
   * the cross-origin blob-URL issue where browsers ignore `a.download`.
   */
  downloadReportUrl(analysisId: string): string {
    return `${API_BASE_URL}/reports/${analysisId}.pdf`;
  },

  async getAdminSummary() {
    return request<AdminSummary>("/admin/summary");
  },

  async getAdminUsers() {
    const payload = await request<{ users: AdminUser[] }>("/admin/users");
    return payload.users;
  },

  async updateAdminUser(
    userId: string,
    payload: Partial<Pick<AdminUser, "is_active" | "is_admin" | "full_name">>
  ) {
    return request<{ message: string; user: GarudaUser }>(
      `/admin/users/${userId}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      }
    );
  },

  async resetAdminUserPassword(userId: string, newPassword?: string) {
    return request<{
      message: string;
      temporary_password: string;
      user: GarudaUser;
    }>(`/admin/users/${userId}/reset-password`, {
      method: "POST",
      body: JSON.stringify(newPassword ? { new_password: newPassword } : {}),
    });
  },

  async setDemoMode(enabled: boolean) {
    return request<{ enabled: boolean }>("/admin/demo-mode", {
      method: "POST",
      body: JSON.stringify({ enabled }),
    });
  },
};