"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  AdminApiError,
  adminLoginRequest,
  adminLogoutRequest,
  adminMeRequest,
  clearAdminSession,
  readAdminSession,
  subscribeToAdminSession,
  writeAdminSession,
  type AdminIdentity,
} from "@/lib/admin-api";

type AdminAuthStatus =
  | "initializing"
  | "authenticated"
  | "unauthenticated"
  | "forbidden";

type AdminContextValue = {
  admin: AdminIdentity | null;
  status: AdminAuthStatus;
  login: (input: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  endSession: () => void;
};

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminIdentity | null>(null);
  const [status, setStatus] = useState<AdminAuthStatus>("initializing");

  useEffect(() => {
    let active = true;
    const syncClearedSession = () => {
      if (!readAdminSession() && active) {
        setAdmin(null);
        setStatus("unauthenticated");
      }
    };
    const unsubscribe = subscribeToAdminSession(syncClearedSession);

    async function restore() {
      const session = readAdminSession();
      if (!session) {
        if (active) setStatus("unauthenticated");
        return;
      }
      try {
        const identity = await adminMeRequest();
        if (!active) return;
        setAdmin(identity);
        setStatus("authenticated");
      } catch (error) {
        if (!active) return;
        setAdmin(null);
        if (error instanceof AdminApiError && error.status === 403) {
          setStatus("forbidden");
        } else {
          clearAdminSession();
          setStatus("unauthenticated");
        }
      }
    }

    void restore();
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const login = useCallback(async (input: { email: string; password: string }) => {
    const session = await adminLoginRequest(input);
    writeAdminSession(session);
    setAdmin(session.admin);
    setStatus("authenticated");
  }, []);

  const endSession = useCallback(() => {
    clearAdminSession();
    setAdmin(null);
    setStatus("unauthenticated");
  }, []);

  const logout = useCallback(async () => {
    try {
      await adminLogoutRequest();
    } finally {
      endSession();
    }
  }, [endSession]);

  const value = useMemo(
    () => ({ admin, status, login, logout, endSession }),
    [admin, endSession, login, logout, status],
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin(): AdminContextValue {
  const context = useContext(AdminContext);
  if (!context) throw new Error("useAdmin must be used within AdminProvider");
  return context;
}
