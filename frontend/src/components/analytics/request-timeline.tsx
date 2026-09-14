"use client";

import { Activity, Clock3, LoaderCircle } from "lucide-react";

import { AnalyticsBoundary } from "@/components/analytics/analytics-boundary";
import { useAnalytics } from "@/components/analytics/analytics-provider";
import { AnalyticsToolbar } from "@/components/analytics/analytics-toolbar";

function formatBucket(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function RequestTimeline() {
  const { analytics, status } = useAnalytics();
  const timeline = analytics?.timeline ?? [];
  const busiestBucket = Math.max(...timeline.map((point) => point.requests), 1);

  return (
    <AnalyticsBoundary>
      <AnalyticsToolbar />

      {status === "loading" ? (
        <div className="mt-5 flex min-h-52 items-center justify-center gap-3 border border-border-subtle bg-surface text-sm text-text-muted" role="status">
          <LoaderCircle size={17} className="animate-spin text-brand motion-reduce:animate-none" aria-hidden="true" />
          Loading request activity…
        </div>
      ) : null}

      {status === "ready" && timeline.length === 0 ? (
        <div className="mt-5 border border-border-subtle bg-surface-inset px-5 py-10 text-center sm:px-8">
          <Activity size={20} className="mx-auto text-brand-steel" aria-hidden="true" />
          <h2 className="mt-4 text-base font-semibold">No request activity in this range</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-text-secondary">Send HTTP telemetry for the active project or select a wider time range. No sample data appears here.</p>
        </div>
      ) : null}

      {status === "ready" && timeline.length > 0 ? (
        <section className="mt-5 overflow-hidden border border-border-subtle bg-surface" aria-labelledby="activity-table-title">
          <div className="flex items-start gap-3 border-b border-border-subtle bg-surface-inset px-4 py-4 sm:px-5">
            <Clock3 size={16} className="mt-0.5 shrink-0 text-brand-steel" aria-hidden="true" />
            <div>
              <h2 id="activity-table-title" className="text-sm font-semibold">HTTP activity timeline</h2>
              <p className="mt-1 text-xs leading-5 text-text-muted">Server-provided request totals, errors, and latency grouped by time bucket.</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="type-table w-full min-w-[42rem] border-collapse text-left">
              <thead className="bg-surface-inset font-mono text-[0.625rem] tracking-[0.08em] text-text-muted uppercase">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium sm:px-5">Time</th>
                  <th scope="col" className="px-4 py-3 font-medium">Activity</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Requests</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Errors</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Avg latency</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium sm:px-5">P95 latency</th>
                </tr>
              </thead>
              <tbody>
                {timeline.map((point) => (
                  <tr key={point.time_bucket} className="border-t border-border-subtle text-text-secondary hover:bg-surface-hover/45">
                    <th scope="row" className="whitespace-nowrap px-4 py-3.5 font-mono text-xs font-medium text-text-primary sm:px-5">{formatBucket(point.time_bucket)}</th>
                    <td className="w-40 px-4 py-3.5">
                      <span className="block h-1.5 overflow-hidden rounded-full bg-border-subtle" aria-hidden="true"><span className="block h-full rounded-full bg-brand-steel" style={{ width: `${Math.max((point.requests / busiestBucket) * 100, 4)}%` }} /></span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-xs text-text-primary">{point.requests.toLocaleString()}</td>
                    <td className={`px-4 py-3.5 text-right font-mono text-xs ${point.errors > 0 ? "text-danger" : "text-text-secondary"}`}>{point.errors.toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-right font-mono text-xs">{point.avg_latency.toFixed(2)} ms</td>
                    <td className="px-4 py-3.5 text-right font-mono text-xs sm:px-5">{point.p95_latency.toFixed(2)} ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </AnalyticsBoundary>
  );
}
