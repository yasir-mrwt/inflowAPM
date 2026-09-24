export type AdminIdentity = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: "super_admin";
  status: "active";
  created_at: string;
  project_count?: number;
  auth_providers?: string[];
};

export type AdminUser = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: "user" | "super_admin";
  status: "active" | "suspended";
  project_count: number;
  auth_providers?: string[];
  created_at: string;
};

export type AdminProject = {
  id: string;
  name: string;
  status: "active" | "disabled";
  created_at: string;
  owner_id: string;
  owner_email: string;
  telemetry_event_count?: number;
  server_error_count?: number;
  last_activity_at?: string | null;
  api_key_metadata?: { stored_as_hash: boolean; exposed: false };
};

export type AdminOverview = {
  total_users: number;
  new_users_24h: number;
  total_projects: number;
  active_projects: number;
  total_telemetry_events: number;
  telemetry_events_24h: number;
  server_errors_24h: number;
  server_error_rate_24h: number;
  recent_registrations: AdminUser[];
  recent_projects: AdminProject[];
};

export type QueueHealth = {
  status: "UP" | "DOWN" | "DISABLED";
  waiting?: number;
  active?: number;
  failed?: number;
};

export type AdminSystemHealth = {
  api: "UP" | "DOWN";
  postgresql: "UP" | "DOWN";
  redis: "UP" | "DOWN";
  queues: { telemetry: QueueHealth; email: QueueHealth };
  mail_enabled: boolean;
  resend_configured: boolean;
};

export type AdminSettings = {
  environment: string;
  mail_enabled: boolean;
  mail_provider_configured: boolean;
  google_oauth_configured: boolean;
  telemetry_queue_available: boolean;
};

export type AdminAuditLog = {
  id: number;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
  admin_user_id: string | null;
  admin_email: string | null;
};

export type PaginatedResponse<T> = {
  success: true;
  data: T[];
  total_count: number;
  meta: { page: number; limit: number };
};

type AdminSession = {
  accessToken: string;
  refreshToken: string;
  admin: AdminIdentity;
};

type Envelope<T> = { success: true; data: T; message?: string };

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:5002"
).replace(/\/$/, "");
const ADMIN_PATH = "/api/v1/admin";
const SESSION_KEY = "inflowapm.admin.session.v1";
const SESSION_EVENT = "inflowapm:admin-session";

export class AdminApiError extends Error {
  constructor(
    message: string,
    readonly status: number | null = null,
  ) {
    super(message);
    this.name = "AdminApiError";
  }
}

function isAdmin(value: unknown): value is AdminIdentity {
  if (!value || typeof value !== "object") return false;
  const admin = value as Partial<AdminIdentity>;
  return (
    [admin.id, admin.email, admin.first_name, admin.last_name].every(
      (field) => typeof field === "string",
    ) &&
    admin.role === "super_admin" &&
    admin.status === "active"
  );
}

export function readAdminSession(): AdminSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as Partial<AdminSession>;
    if (
      typeof session.accessToken !== "string" ||
      typeof session.refreshToken !== "string" ||
      !isAdmin(session.admin)
    ) {
      clearAdminSession();
      return null;
    }
    return session as AdminSession;
  } catch {
    clearAdminSession();
    return null;
  }
}

export function writeAdminSession(session: AdminSession): void {
  window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function clearAdminSession(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function subscribeToAdminSession(listener: () => void): () => void {
  window.addEventListener(SESSION_EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(SESSION_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

async function requestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new AdminApiError(
      "Unable to reach InflowAPM. Check your connection and try again.",
    );
  }
  const payload = (await response.json().catch(() => null)) as {
    message?: unknown;
  } | null;
  if (!response.ok) {
    const fallback =
      response.status === 401
        ? "Your admin session has ended. Sign in again."
        : response.status === 403
          ? "This account does not have Super Admin access."
          : "The request could not be completed.";
    throw new AdminApiError(
      typeof payload?.message === "string" ? payload.message : fallback,
      response.status,
    );
  }
  return payload as T;
}

export async function adminLoginRequest(input: {
  email: string;
  password: string;
}): Promise<AdminSession> {
  const response = await requestJson<
    Envelope<{
      access_token: string;
      refresh_token: string;
      admin: AdminIdentity;
    }>
  >(`${ADMIN_PATH}/auth/login`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  const { access_token, refresh_token, admin } = response.data;
  if (
    typeof access_token !== "string" ||
    typeof refresh_token !== "string" ||
    !isAdmin(admin)
  ) {
    throw new AdminApiError(
      "The admin authentication service returned an invalid response.",
    );
  }
  return { accessToken: access_token, refreshToken: refresh_token, admin };
}

let refreshInFlight: Promise<string> | null = null;

async function refreshAdminAccessToken(): Promise<string> {
  if (refreshInFlight) return refreshInFlight;
  const session = readAdminSession();
  if (!session) throw new AdminApiError("Sign in to continue.", 401);
  refreshInFlight = requestJson<{ success: true; new_access_token: string }>(
    "/api/v1/auth/refresh",
    {
      method: "POST",
      body: JSON.stringify({ refresh_token: session.refreshToken }),
    },
  )
    .then((response) => {
      if (typeof response.new_access_token !== "string") {
        throw new AdminApiError("The authentication service returned an invalid response.");
      }
      const current = readAdminSession();
      if (!current) throw new AdminApiError("Sign in to continue.", 401);
      writeAdminSession({ ...current, accessToken: response.new_access_token });
      return response.new_access_token;
    })
    .catch((error) => {
      clearAdminSession();
      throw error;
    })
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

export async function adminApiRequest<T>(
  path: string,
  init: RequestInit = {},
  retry = true,
): Promise<T> {
  const session = readAdminSession();
  if (!session) throw new AdminApiError("Sign in to continue.", 401);
  try {
    return await requestJson<T>(path, {
      ...init,
      headers: { ...init.headers, Authorization: `Bearer ${session.accessToken}` },
    });
  } catch (error) {
    if (!(error instanceof AdminApiError) || error.status !== 401 || !retry) {
      throw error;
    }
    const accessToken = await refreshAdminAccessToken();
    return requestJson<T>(path, {
      ...init,
      headers: { ...init.headers, Authorization: `Bearer ${accessToken}` },
    });
  }
}

export async function adminMeRequest(signal?: AbortSignal): Promise<AdminIdentity> {
  const response = await adminApiRequest<Envelope<AdminIdentity>>(
    `${ADMIN_PATH}/auth/me`,
    { signal },
  );
  if (!isAdmin(response.data)) throw new AdminApiError("Super Admin access is required.", 403);
  return response.data;
}

export async function adminLogoutRequest(): Promise<void> {
  await adminApiRequest("/api/v1/auth/logout", { method: "POST" });
}

export async function adminOverviewRequest(signal?: AbortSignal) {
  return (
    await adminApiRequest<Envelope<AdminOverview>>(`${ADMIN_PATH}/overview`, {
      signal,
    })
  ).data;
}

function queryString(values: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  return params.toString();
}

export async function adminUsersRequest(
  query: { page: number; limit: number; search?: string; status?: string; role?: string },
  signal?: AbortSignal,
) {
  return adminApiRequest<PaginatedResponse<AdminUser>>(
    `${ADMIN_PATH}/users?${queryString(query)}`,
    { signal },
  );
}

export async function adminUserRequest(id: string, signal?: AbortSignal) {
  return (
    await adminApiRequest<Envelope<AdminUser>>(`${ADMIN_PATH}/users/${id}`, {
      signal,
    })
  ).data;
}

export async function updateAdminUserStatusRequest(
  id: string,
  status: AdminUser["status"],
) {
  return (
    await adminApiRequest<Envelope<AdminUser>>(`${ADMIN_PATH}/users/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    })
  ).data;
}

export async function adminProjectsRequest(
  query: { page: number; limit: number; search?: string; status?: string },
  signal?: AbortSignal,
) {
  return adminApiRequest<PaginatedResponse<AdminProject>>(
    `${ADMIN_PATH}/projects?${queryString(query)}`,
    { signal },
  );
}

export async function adminProjectRequest(id: string, signal?: AbortSignal) {
  return (
    await adminApiRequest<Envelope<AdminProject>>(`${ADMIN_PATH}/projects/${id}`, {
      signal,
    })
  ).data;
}

export async function updateAdminProjectStatusRequest(
  id: string,
  status: AdminProject["status"],
) {
  return (
    await adminApiRequest<Envelope<AdminProject>>(
      `${ADMIN_PATH}/projects/${id}/status`,
      { method: "PATCH", body: JSON.stringify({ status }) },
    )
  ).data;
}

export async function adminHealthRequest(signal?: AbortSignal) {
  return (
    await adminApiRequest<Envelope<AdminSystemHealth>>(
      `${ADMIN_PATH}/system/health`,
      { signal },
    )
  ).data;
}

export async function adminAuditLogsRequest(
  query: { page: number; limit: number; action?: string },
  signal?: AbortSignal,
) {
  return adminApiRequest<PaginatedResponse<AdminAuditLog>>(
    `${ADMIN_PATH}/audit-logs?${queryString(query)}`,
    { signal },
  );
}

export async function adminSettingsRequest(signal?: AbortSignal) {
  return (
    await adminApiRequest<Envelope<AdminSettings>>(`${ADMIN_PATH}/settings`, {
      signal,
    })
  ).data;
}

export async function changeAdminPasswordRequest(input: {
  current_password: string;
  new_password: string;
}): Promise<string> {
  const response = await adminApiRequest<{ success: true; message: string }>(
    `${ADMIN_PATH}/auth/change-password`,
    { method: "POST", body: JSON.stringify(input) },
  );
  return response.message;
}
