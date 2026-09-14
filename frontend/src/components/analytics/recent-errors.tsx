"use client";

import { Bug, LoaderCircle } from "lucide-react";

import { AnalyticsBoundary } from "@/components/analytics/analytics-boundary";
import { useAnalytics } from "@/components/analytics/analytics-provider";
import { AnalyticsToolbar } from "@/components/analytics/analytics-toolbar";

function formatOccurredAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

export function RecentErrorsView() {
  const { analytics, status } = useAnalytics();
  const errors = analytics?.recent_errors ?? [];

  return (
    <AnalyticsBoundary>
      <AnalyticsToolbar />

      {status === "loading" ? (
        <div className="mt-5 flex min-h-52 items-center justify-center gap-3 border border-border-subtle bg-surface text-sm text-text-muted" role="status">
          <LoaderCircle size={17} className="animate-spin text-brand motion-reduce:animate-none" aria-hidden="true" />
          Loading recent errors…
        </div>
      ) : null}

      {status === "ready" && errors.length === 0 ? (
        <div className="mt-5 border border-border-subtle bg-surface-inset px-5 py-10 text-center sm:px-8">
          <Bug size={20} className="mx-auto text-brand-steel" aria-hidden="true" />
          <h2 className="mt-4 text-base font-semibold">No recent errors in this range</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-text-secondary">No HTTP responses with a 5xx status were reported for the active project.</p>
        </div>
      ) : null}

      {status === "ready" && errors.length > 0 ? (
        <section className="mt-5 overflow-hidden border border-border-subtle bg-surface" aria-labelledby="recent-errors-title">
          <div className="border-b border-border-subtle bg-surface-inset px-4 py-4 sm:px-5">
            <h2 id="recent-errors-title" className="text-sm font-semibold">Latest failures</h2>
            <p className="mt-1 text-xs leading-5 text-text-muted">The newest backend-reported HTTP failures in the selected time range, limited to 20.</p>
          </div>
          <div className="hidden grid-cols-[minmax(10rem,1fr)_4.75rem_minmax(9rem,1.1fr)_4.5rem_6.5rem_minmax(12rem,1.4fr)] gap-4 border-b border-border-subtle bg-surface-inset px-5 py-3 font-mono text-[0.625rem] tracking-[0.08em] text-text-muted uppercase md:grid" aria-hidden="true">
            <span>Time</span><span>Method</span><span>Route</span><span>Status</span><span className="text-right">Duration</span><span>Context</span>
          </div>
          <ul className="divide-y divide-border-subtle">
            {errors.map((error) => (
              <li key={error.id} className="grid gap-3 px-4 py-4 hover:bg-surface-hover/45 sm:px-5 md:grid-cols-[minmax(10rem,1fr)_4.75rem_minmax(9rem,1.1fr)_4.5rem_6.5rem_minmax(12rem,1.4fr)] md:items-center md:gap-4">
                <time dateTime={error.occurred_at} className="font-mono text-xs text-text-secondary">{formatOccurredAt(error.occurred_at)}</time>
                <span className="w-fit rounded border border-brand-steel/25 bg-brand-muted px-2 py-1 font-mono text-[0.6875rem] font-semibold text-brand">{error.method}</span>
                <code className="min-w-0 break-all font-mono text-xs text-text-primary">{error.route}</code>
                <span className="w-fit rounded border border-danger/30 bg-danger-muted/55 px-2 py-1 font-mono text-[0.6875rem] font-semibold text-danger">{error.status}</span>
                <span className="font-mono text-xs text-text-secondary md:text-right">{error.duration_ms.toFixed(2)} ms</span>
                <span className="min-w-0 break-words text-xs leading-5 text-text-secondary">{error.error_message || "No error message reported"}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </AnalyticsBoundary>
  );
}
