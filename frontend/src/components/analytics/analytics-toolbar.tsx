"use client";

import { AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { useAnalytics } from "@/components/analytics/analytics-provider";
import { useProjects } from "@/components/projects/projects-provider";
import { Button } from "@/components/ui/button";
import type { AnalyticsRange } from "@/lib/analytics-api";

export function AnalyticsToolbar({ actions }: { actions?: ReactNode }) {
  const { selectedProject } = useProjects();
  const { range, setRange, reload, status, lastUpdatedAt, refreshStatus } = useAnalytics();
  const [, setClockTick] = useState(0);

  useEffect(() => {
    if (!lastUpdatedAt) return;
    const interval = window.setInterval(() => setClockTick((value) => value + 1), 30_000);
    return () => window.clearInterval(interval);
  }, [lastUpdatedAt]);

  const updating = refreshStatus === "refreshing";
  const loading = status === "loading";
  const updateLabel = formatLastUpdated(lastUpdatedAt);

  return (
    <div className="flex flex-col justify-between gap-4 border-b border-border-subtle pb-4 sm:flex-row sm:items-end">
      <div className="min-w-0">
        <p className="font-mono text-[0.625rem] tracking-[0.1em] text-text-muted uppercase">Active project</p>
        <h2 className="mt-1 truncate text-base font-semibold text-text-primary">{selectedProject?.name}</h2>
      </div>
      <div className="flex flex-col items-start gap-2 sm:items-end">
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="analytics-range" className="sr-only">Analytics time range</label>
          <select
            id="analytics-range"
            value={range}
            onChange={(event) => setRange(event.target.value as AnalyticsRange)}
            className="h-9 min-w-0 rounded-md border border-border bg-surface-inset px-3 font-mono text-xs text-text-secondary outline-none focus:border-brand-steel"
          >
            <option value="1h">Last hour</option>
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </select>
          {actions}
          <Button type="button" variant="outline" size="sm" onClick={reload} disabled={loading || updating} aria-label={updating ? "Refreshing analytics" : "Refresh analytics"} aria-busy={updating}>
            <RefreshCw size={14} className={loading || updating ? "animate-spin motion-reduce:animate-none" : ""} aria-hidden="true" />
            <span className="hidden sm:inline">{updating ? "Refreshing…" : "Refresh"}</span>
          </Button>
        </div>
        <div className="min-h-4 font-mono text-[0.625rem]" aria-live="polite" aria-atomic="true">
          {updating ? <span className="inline-flex items-center gap-1.5 text-brand-steel"><RefreshCw size={11} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />Refreshing analytics…</span> : null}
          {!updating && refreshStatus === "success" ? <span className="inline-flex items-center gap-1.5 text-success"><CheckCircle2 size={11} aria-hidden="true" />Refresh complete · {updateLabel}</span> : null}
          {!updating && refreshStatus === "error" ? <span role="alert" className="inline-flex items-center gap-1.5 text-danger"><AlertCircle size={11} aria-hidden="true" />Refresh failed{updateLabel ? ` · ${updateLabel}` : ""}</span> : null}
          {!updating && refreshStatus === "idle" && updateLabel ? <span className="text-text-muted">{updateLabel}</span> : null}
          {!updating && !updateLabel && loading ? <span className="text-text-muted">Fetching analytics…</span> : null}
        </div>
      </div>
    </div>
  );
}

function formatLastUpdated(timestamp: number | null): string {
  if (!timestamp) return "";
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1_000));
  if (elapsedSeconds < 45) return "Updated just now";
  if (elapsedSeconds < 3_600) return `Updated ${Math.floor(elapsedSeconds / 60)}m ago`;
  return `Updated ${new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(timestamp)}`;
}
