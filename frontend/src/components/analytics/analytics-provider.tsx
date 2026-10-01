"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { useProjects } from "@/components/projects/projects-provider";
import { dashboardAnalyticsRequest, type AnalyticsRange, type DashboardAnalytics } from "@/lib/analytics-api";

type AnalyticsStatus = "idle" | "loading" | "ready" | "error";
type AnalyticsRefreshStatus = "idle" | "refreshing" | "success" | "error";
type AnalyticsContextValue = {
  analytics: DashboardAnalytics | null;
  range: AnalyticsRange;
  status: AnalyticsStatus;
  error: string;
  lastUpdatedAt: number | null;
  refreshStatus: AnalyticsRefreshStatus;
  refreshError: string;
  setRange: (range: AnalyticsRange) => void;
  reload: () => void;
};

const AnalyticsContext = createContext<AnalyticsContextValue | null>(null);

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const { selectedProject } = useProjects();
  const [range, setRange] = useState<AnalyticsRange>("24h");
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [status, setStatus] = useState<AnalyticsStatus>("idle");
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [loadedScope, setLoadedScope] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [refreshStatus, setRefreshStatus] = useState<AnalyticsRefreshStatus>("idle");
  const [refreshError, setRefreshError] = useState("");
  const manualRefreshRef = useRef(false);
  const currentScope = selectedProject ? `${selectedProject.id}:${range}` : "";
  const requestScope = selectedProject ? `${currentScope}:${reloadKey}` : "";

  useEffect(() => {
    const controller = new AbortController();
    const manualRefresh = manualRefreshRef.current;
    manualRefreshRef.current = false;
    if (!selectedProject) {
      queueMicrotask(() => {
        if (!controller.signal.aborted) {
          setAnalytics(null);
          setStatus("idle");
          setError("");
          setLoadedScope("");
          setLastUpdatedAt(null);
          setRefreshStatus("idle");
          setRefreshError("");
        }
      });
      return () => controller.abort();
    }

    if (!manualRefresh) {
      queueMicrotask(() => {
        if (!controller.signal.aborted) {
          setStatus("loading");
          setError("");
          setAnalytics(null);
          setLoadedScope(currentScope);
          setLastUpdatedAt(null);
          setRefreshStatus("idle");
          setRefreshError("");
        }
      });
    }
    dashboardAnalyticsRequest(selectedProject.id, range, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setAnalytics(data);
          setStatus("ready");
          setLoadedScope(currentScope);
          setLastUpdatedAt(Date.now());
          setRefreshStatus(manualRefresh ? "success" : "idle");
          setRefreshError("");
        }
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          const message = reason instanceof Error ? reason.message : "Analytics could not be loaded.";
          if (manualRefresh) {
            setRefreshStatus("error");
            setRefreshError(message);
          } else {
            setAnalytics(null);
            setError(message);
            setStatus("error");
            setLoadedScope(currentScope);
          }
        }
      });
    return () => controller.abort();
  }, [currentScope, range, requestScope, selectedProject]);

  const reload = useCallback(() => {
    if (!selectedProject || refreshStatus === "refreshing" || status === "loading") return;
    const hasCurrentData = loadedScope === currentScope && analytics !== null && status === "ready";
    manualRefreshRef.current = hasCurrentData;
    setError("");
    setRefreshError("");
    setRefreshStatus(hasCurrentData ? "refreshing" : "idle");
    setReloadKey((current) => current + 1);
  }, [analytics, currentScope, loadedScope, refreshStatus, selectedProject, status]);
  const scopedAnalytics = loadedScope === currentScope ? analytics : null;
  const scopedStatus = selectedProject && loadedScope !== currentScope ? "loading" : status;
  const scopedLastUpdatedAt = loadedScope === currentScope ? lastUpdatedAt : null;
  const scopedRefreshStatus = loadedScope === currentScope ? refreshStatus : "idle";
  const value = useMemo(
    () => ({ analytics: scopedAnalytics, range, status: scopedStatus, error, lastUpdatedAt: scopedLastUpdatedAt, refreshStatus: scopedRefreshStatus, refreshError, setRange, reload }),
    [error, range, refreshError, reload, scopedAnalytics, scopedLastUpdatedAt, scopedRefreshStatus, scopedStatus],
  );

  return <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>;
}

export function useAnalytics(): AnalyticsContextValue {
  const context = useContext(AnalyticsContext);
  if (!context) throw new Error("useAnalytics must be used within AnalyticsProvider");
  return context;
}
