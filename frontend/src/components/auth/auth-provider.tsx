"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import {
  clearAuthSession,
  exchangeOAuthCodeRequest,
  loginRequest,
  logoutRequest,
  readAuthSession,
  refreshAccessToken,
  registerRequest,
  subscribeToAuthSession,
  writeAuthSession,
  type AuthUser,
  type LoginInput,
  type RegisterInput,
} from "@/lib/auth-api";

type AuthStatus = "initializing" | "authenticated" | "unauthenticated";
type AuthContextValue = {
  user: AuthUser | null;
  status: AuthStatus;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  completeOAuth: (code: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("initializing");

  useEffect(() => {
    let active = true;
    const sync = () => {
      const session = readAuthSession();
      setUser(session?.user ?? null);
      setStatus(session ? "authenticated" : "unauthenticated");
    };
    const unsubscribe = subscribeToAuthSession(sync);
    const session = readAuthSession();
    if (!session) {
      queueMicrotask(() => { if (active) sync(); });
    } else {
      refreshAccessToken()
        .catch(() => undefined)
        .finally(() => { if (active) sync(); });
    }
    return () => { active = false; unsubscribe(); };
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    const session = await loginRequest(input);
    writeAuthSession(session);
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    await registerRequest(input);
    try {
      const session = await loginRequest({ email: input.email, password: input.password });
      writeAuthSession(session);
    } catch {
      throw new Error("Your account was created, but automatic sign-in failed. Return to sign in and use your new credentials.");
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      clearAuthSession();
    }
  }, []);

  const completeOAuth = useCallback(async (code: string) => {
    const session = await exchangeOAuthCodeRequest(code);
    writeAuthSession(session);
  }, []);

  const value = useMemo(() => ({ user, status, login, register, logout, completeOAuth }), [completeOAuth, login, logout, register, status, user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
