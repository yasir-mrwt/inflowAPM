"use client";

import { LoaderCircle, Route } from "lucide-react";

import { AnalyticsBoundary } from "@/components/analytics/analytics-boundary";
import { useAnalytics } from "@/components/analytics/analytics-provider";
import { AnalyticsToolbar } from "@/components/analytics/analytics-toolbar";

export function RoutePerformanceView() {
  const { analytics, status } = useAnalytics();
  const routes = analytics?.route_performance ?? [];

  return (
    <AnalyticsBoundary>
      <AnalyticsToolbar />

      {status === "loading" ? (
        <div className="mt-5 flex min-h-52 items-center justify-center gap-3 border border-border-subtle bg-surface text-sm text-text-muted" role="status">
          <LoaderCircle size={17} className="animate-spin text-brand motion-reduce:animate-none" aria-hidden="true" />
          Loading route performance…
        </div>
      ) : null}

      {status === "ready" && routes.length === 0 ? (
        <div className="mt-5 border border-border-subtle bg-surface-inset px-5 py-10 text-center sm:px-8">
          <Route size={20} className="mx-auto text-brand-steel" aria-hidden="true" />
          <h2 className="mt-4 text-base font-semibold">No route performance in this range</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-text-secondary">Route metrics appear after the active project sends HTTP telemetry. Try selecting a wider time range.</p>
        </div>
      ) : null}

      {status === "ready" && routes.length > 0 ? (
        <section className="mt-5 overflow-hidden border border-border-subtle bg-surface" aria-labelledby="route-table-title">
          <div className="border-b border-border-subtle bg-surface-inset px-4 py-4 sm:px-5">
            <h2 id="route-table-title" className="text-sm font-semibold">Route performance</h2>
            <p className="mt-1 text-xs leading-5 text-text-muted">Backend-calculated request volume, errors, and latency for each HTTP method and route.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="type-table w-full min-w-[42rem] border-collapse text-left">
              <thead className="bg-surface-inset font-mono text-[0.625rem] tracking-[0.08em] text-text-muted uppercase">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium sm:px-5">Method</th>
                  <th scope="col" className="px-4 py-3 font-medium">Route</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Requests</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Errors</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Avg latency</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium sm:px-5">P95 latency</th>
                </tr>
              </thead>
              <tbody>
                {routes.map((route) => (
                  <tr key={`${route.method}:${route.route}`} className="border-t border-border-subtle text-text-secondary hover:bg-surface-hover/45">
                    <td className="px-4 py-3.5 sm:px-5"><span className="rounded border border-brand-steel/25 bg-brand-muted px-2 py-1 font-mono text-[0.6875rem] font-semibold text-brand">{route.method}</span></td>
                    <th scope="row" className="max-w-md break-all px-4 py-3.5 font-mono text-xs font-medium text-text-primary">{route.route}</th>
                    <td className="px-4 py-3.5 text-right font-mono text-xs text-text-primary">{route.request_count.toLocaleString()}</td>
                    <td className={`px-4 py-3.5 text-right font-mono text-xs ${route.error_count > 0 ? "text-danger" : "text-text-secondary"}`}>{route.error_count.toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-right font-mono text-xs">{route.avg_latency.toFixed(2)} ms</td>
                    <td className="px-4 py-3.5 text-right font-mono text-xs sm:px-5">{route.p95_latency.toFixed(2)} ms</td>
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
