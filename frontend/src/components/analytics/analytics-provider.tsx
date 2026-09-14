"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { useProjects } from "@/components/projects/projects-provider";
import { dashboardAnalyticsRequest, type AnalyticsRange, type DashboardAnalytics } from "@/lib/analytics-api";

type AnalyticsStatus = "idle" | "loading" | "ready" | "error";
type AnalyticsContextValue = {
  analytics: DashboardAnalytics | null;
  range: AnalyticsRange;
  status: AnalyticsStatus;
  error: string;
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
  const currentScope = selectedProject ? `${selectedProject.id}:${range}:${reloadKey}` : "";

  useEffect(() => {
    const controller = new AbortController();
    if (!selectedProject) {
      queueMicrotask(() => {
        if (!controller.signal.aborted) {
          setAnalytics(null);
          setStatus("idle");
          setError("");
          setLoadedScope("");
        }
      });
      return () => controller.abort();
    }

    queueMicrotask(() => {
      if (!controller.signal.aborted) {
        setStatus("loading");
        setError("");
        setAnalytics(null);
        setLoadedScope(currentScope);
      }
    });
    dashboardAnalyticsRequest(selectedProject.id, range, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setAnalytics(data);
          setStatus("ready");
          setLoadedScope(currentScope);
        }
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setAnalytics(null);
          setError(reason instanceof Error ? reason.message : "Analytics could not be loaded.");
          setStatus("error");
          setLoadedScope(currentScope);
        }
      });
    return () => controller.abort();
  }, [currentScope, range, selectedProject]);

  const reload = useCallback(() => setReloadKey((current) => current + 1), []);
  const scopedAnalytics = loadedScope === currentScope ? analytics : null;
  const scopedStatus = selectedProject && loadedScope !== currentScope ? "loading" : status;
  const value = useMemo(
    () => ({ analytics: scopedAnalytics, range, status: scopedStatus, error, setRange, reload }),
    [error, range, reload, scopedAnalytics, scopedStatus],
  );

  return <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>;
}

export function useAnalytics(): AnalyticsContextValue {
  const context = useContext(AnalyticsContext);
  if (!context) throw new Error("useAnalytics must be used within AnalyticsProvider");
  return context;
}
