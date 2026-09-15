"use client";

import { RefreshCw } from "lucide-react";

import { useAnalytics } from "@/components/analytics/analytics-provider";
import { useProjects } from "@/components/projects/projects-provider";
import { Button } from "@/components/ui/button";
import type { AnalyticsRange } from "@/lib/analytics-api";

export function AnalyticsToolbar() {
  const { selectedProject } = useProjects();
  const { range, setRange, reload, status } = useAnalytics();

  return (
    <div className="flex flex-col justify-between gap-4 border-b border-border-subtle pb-4 sm:flex-row sm:items-end">
      <div className="min-w-0">
        <p className="font-mono text-[0.625rem] tracking-[0.1em] text-text-muted uppercase">Active project</p>
        <h2 className="mt-1 truncate text-base font-semibold text-text-primary">{selectedProject?.name}</h2>
      </div>
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
        <Button type="button" variant="outline" size="sm" onClick={reload} disabled={status === "loading"} aria-label="Refresh analytics">
          <RefreshCw size={14} className={status === "loading" ? "animate-spin motion-reduce:animate-none" : ""} aria-hidden="true" />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </div>
    </div>
  );
}
