export type AuthIntent = "login" | "register" | "forgot-password" | "reset-password";

export type AuthUser = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  created_at: string;
};

export type LoginInput = { email: string; password: string };
export type RegisterInput = LoginInput & { first_name: string; last_name: string };

type AuthSession = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

type ApiEnvelope<T> = { success: boolean; message: string; data: T };

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:5002").replace(/\/$/, "");
const AUTH_PATH = "/api/v1/auth";
const SESSION_KEY = "inflowapm.auth.session.v1";
const SESSION_EVENT = "inflowapm:auth-session";

export function googleOAuthStartUrl(): string {
  return `${API_BASE_URL}${AUTH_PATH}/google`;
}

export class ApiError extends Error {
  constructor(message: string, readonly status: number | null = null) {
    super(message);
    this.name = "ApiError";
  }
}

function isUser(value: unknown): value is AuthUser {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<AuthUser>;
  return [candidate.id, candidate.email, candidate.first_name, candidate.last_name, candidate.role].every(
    (field) => typeof field === "string",
  );
}

export function readAuthSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as Partial<AuthSession>;
    if (
      typeof session.accessToken !== "string" ||
      typeof session.refreshToken !== "string" ||
      !isUser(session.user)
    ) {
      clearAuthSession();
      return null;
    }
    return session as AuthSession;
  } catch {
    clearAuthSession();
    return null;
  }
}

export function writeAuthSession(session: AuthSession): void {
  window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function clearAuthSession(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function subscribeToAuthSession(listener: () => void): () => void {
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
      headers: { "Content-Type": "application/json", Accept: "application/json", ...init.headers },
    });
  } catch {
    throw new ApiError("Unable to reach InflowAPM. Check your connection and try again.");
  }

  const payload = (await response.json().catch(() => null)) as { message?: unknown } | null;
  if (!response.ok) {
    const message = typeof payload?.message === "string" ? payload.message : "The request could not be completed.";
    throw new ApiError(message, response.status);
  }
  return payload as T;
}

export async function loginRequest(input: LoginInput): Promise<AuthSession> {
  const response = await requestJson<ApiEnvelope<{
    access_token: string;
    refresh_token: string;
    userData: AuthUser;
  }>>(`${AUTH_PATH}/login`, { method: "POST", body: JSON.stringify(input) });

  const { access_token, refresh_token, userData } = response.data;
  if (typeof access_token !== "string" || typeof refresh_token !== "string" || !isUser(userData)) {
    throw new ApiError("The authentication service returned an invalid response.");
  }
  return { accessToken: access_token, refreshToken: refresh_token, user: userData };
}

export async function exchangeOAuthCodeRequest(code: string): Promise<AuthSession> {
  const response = await requestJson<ApiEnvelope<{
    access_token: string;
    refresh_token: string;
    user: AuthUser;
  }>>(`${AUTH_PATH}/oauth/exchange`, { method: "POST", body: JSON.stringify({ code }) });

  const { access_token, refresh_token, user } = response.data;
  if (typeof access_token !== "string" || typeof refresh_token !== "string" || !isUser(user)) {
    throw new ApiError("The OAuth service returned an invalid response.");
  }
  return { accessToken: access_token, refreshToken: refresh_token, user };
}

export async function registerRequest(input: RegisterInput): Promise<AuthUser> {
  const response = await requestJson<ApiEnvelope<AuthUser | null>>(`${AUTH_PATH}/register`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!isUser(response.data)) throw new ApiError("The registration service returned an invalid response.");
  return response.data;
}

export async function forgotPasswordRequest(email: string): Promise<string> {
  const response = await requestJson<{ success: boolean; message: string }>(`${AUTH_PATH}/forgot-password`, {
    method: "POST",
    body: JSON.stringify({ email }),
  });
  return response.message;
}

export async function resetPasswordRequest(token: string, password: string): Promise<string> {
  const response = await requestJson<{ success: boolean; message: string }>(`${AUTH_PATH}/reset-password`, {
    method: "POST",
    body: JSON.stringify({ token, password }),
  });
  return response.message;
}

let refreshInFlight: Promise<string> | null = null;

export async function refreshAccessToken(): Promise<string> {
  if (refreshInFlight) return refreshInFlight;
  const session = readAuthSession();
  if (!session) throw new ApiError("Your session has ended. Sign in again.", 401);

  refreshInFlight = requestJson<{ success: boolean; new_access_token: string }>(`${AUTH_PATH}/refresh`, {
    method: "POST",
    body: JSON.stringify({ refresh_token: session.refreshToken }),
  })
    .then((response) => {
      if (typeof response.new_access_token !== "string") {
        throw new ApiError("The authentication service returned an invalid response.");
      }
      const current = readAuthSession();
      if (!current) throw new ApiError("Your session has ended. Sign in again.", 401);
      writeAuthSession({ ...current, accessToken: response.new_access_token });
      return response.new_access_token;
    })
    .catch((error) => {
      clearAuthSession();
      throw error;
    })
    .finally(() => {
      refreshInFlight = null;
    });

  return refreshInFlight;
}

export async function apiRequest<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const session = readAuthSession();
  if (!session) throw new ApiError("Sign in to continue.", 401);
  try {
    return await requestJson<T>(path, {
      ...init,
      headers: { ...init.headers, Authorization: `Bearer ${session.accessToken}` },
    });
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401 || !retry) throw error;
    const accessToken = await refreshAccessToken();
    return requestJson<T>(path, {
      ...init,
      headers: { ...init.headers, Authorization: `Bearer ${accessToken}` },
    });
  }
}

export async function logoutRequest(): Promise<void> {
  await apiRequest<{ success: boolean; message: string }>(`${AUTH_PATH}/logout`, { method: "POST" });
}
