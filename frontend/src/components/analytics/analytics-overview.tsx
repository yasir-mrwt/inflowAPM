"use client";

import { Activity, BarChart3, Clock3, LoaderCircle, TriangleAlert } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useAnalytics } from "@/components/analytics/analytics-provider";
import type { AnalyticsRange, TimelinePoint } from "@/lib/analytics-api";

const METHOD_COLORS: Record<string, string> = {
  GET: "#45d5ee",
  POST: "#47c98b",
  PUT: "#e8ae4a",
  PATCH: "#6bb9dd",
  DELETE: "#ef6b73",
};
const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;
const tooltipStyle = {
  background: "var(--surface-elevated)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)",
  color: "var(--text-primary)",
  fontSize: "0.75rem",
};

function formatAxisTime(value: string, range: AnalyticsRange): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, range === "1h" || range === "24h"
    ? { hour: "numeric", minute: "2-digit" }
    : { month: "short", day: "numeric" }).format(date);
}

function formatFullTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function ChartCard({
  id,
  title,
  description,
  icon: Icon,
  children,
  className = "",
}: {
  id: string;
  title: string;
  description: string;
  icon: typeof Activity;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`min-w-0 border border-border-subtle bg-surface ${className}`} aria-labelledby={id}>
      <div className="flex min-h-20 items-start gap-3 border-b border-border-subtle bg-surface-inset px-4 py-4 sm:px-5">
        <Icon size={16} className="mt-0.5 shrink-0 text-brand-steel" aria-hidden="true" />
        <div>
          <h2 id={id} className="text-sm font-semibold text-text-primary">{title}</h2>
          <p className="mt-1 text-xs leading-5 text-text-muted">{description}</p>
        </div>
      </div>
      <div className="h-72 min-w-0 p-3 pt-5 sm:p-5">{children}</div>
    </section>
  );
}

function ChartLoading() {
  return (
    <div className="mt-6 grid gap-5 xl:grid-cols-2" role="status" aria-label="Loading analytics charts">
      {[0, 1, 2, 3].map((item) => (
        <div key={item} className="flex h-80 items-center justify-center border border-border-subtle bg-surface text-sm text-text-muted">
          <LoaderCircle size={17} className="mr-3 animate-spin text-brand motion-reduce:animate-none" aria-hidden="true" />
          Loading telemetry trend…
        </div>
      ))}
    </div>
  );
}

function EmptyAnalytics() {
  return (
    <div className="mt-6 border border-border-subtle bg-surface-inset px-5 py-12 text-center sm:px-8">
      <Activity size={21} className="mx-auto text-brand-steel" aria-hidden="true" />
      <h2 className="mt-4 text-base font-semibold">No chartable telemetry in this range</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-text-secondary">Send HTTP telemetry for the active project or select a wider range. Charts never substitute sample data.</p>
    </div>
  );
}

function requestSummary(timeline: TimelinePoint[]): string {
  const total = timeline.reduce((sum, point) => sum + point.requests, 0);
  return `${total.toLocaleString()} requests across ${timeline.length.toLocaleString()} real time buckets.`;
}

export function AnalyticsOverview() {
  const { analytics, range, status } = useAnalytics();
  const timeline = analytics?.timeline ?? [];

  if (status === "loading" || status === "idle") return <ChartLoading />;
  if (status !== "ready" || !analytics) return null;
  if (timeline.length === 0) return <EmptyAnalytics />;

  const methodTotals = METHODS.map((method) => ({
    method,
    requests: analytics.route_performance
      .filter((route) => route.method.toUpperCase() === method)
      .reduce((sum, route) => sum + route.request_count, 0),
    fill: METHOD_COLORS[method],
  })).filter((item) => item.requests > 0);
  const totalErrors = timeline.reduce((sum, point) => sum + point.errors, 0);

  return (
    <div className="mt-6 space-y-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
        <ChartCard id="request-traffic-title" title="Request traffic" description="Request volume per server-provided time bucket." icon={BarChart3}>
          <div className="h-full min-w-0" role="img" tabIndex={0} aria-label={`Request traffic chart. ${requestSummary(timeline)}`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeline} margin={{ top: 4, right: 4, left: -18, bottom: 0 }} accessibilityLayer>
                <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="time_bucket" tickFormatter={(value) => formatAxisTime(String(value), range)} tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={{ stroke: "var(--border)" }} tickLine={false} minTickGap={24} />
                <YAxis allowDecimals={false} tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: "var(--surface-hover)", opacity: 0.5 }} contentStyle={tooltipStyle} labelFormatter={(value) => formatFullTime(String(value))} formatter={(value) => [Number(value ?? 0).toLocaleString(), "Requests"]} />
                <Bar dataKey="requests" name="Requests" fill="var(--brand-steel)" radius={[3, 3, 0, 0]} maxBarSize={30} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard id="method-activity-title" title="HTTP methods" description="Real request totals aggregated from route analytics." icon={Activity}>
          {methodTotals.length > 0 ? (
            <div className="h-full min-w-0" role="img" tabIndex={0} aria-label={`HTTP method distribution. ${methodTotals.map((item) => `${item.method} ${item.requests}`).join(", ")}.`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={methodTotals} layout="vertical" margin={{ top: 4, right: 12, left: -8, bottom: 0 }} accessibilityLayer>
                  <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
                  <YAxis type="category" dataKey="method" width={54} tick={{ fill: "var(--text-secondary)", fontSize: 10, fontFamily: "var(--font-ibm-plex-mono)" }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: "var(--surface-hover)", opacity: 0.5 }} contentStyle={tooltipStyle} formatter={(value) => [Number(value ?? 0).toLocaleString(), "Requests"]} />
                  <Bar dataKey="requests" name="Requests" radius={[0, 3, 3, 0]} maxBarSize={22} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center px-5 text-center text-xs leading-5 text-text-muted">No GET, POST, PUT, PATCH, or DELETE activity was reported in this range.</div>
          )}
        </ChartCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <ChartCard id="error-trend-title" title="Error trend" description="5xx failures by time bucket, shown without smoothing." icon={TriangleAlert}>
          <div className="h-full min-w-0" role="img" tabIndex={0} aria-label={`Error trend chart. ${totalErrors.toLocaleString()} total server errors across ${timeline.length.toLocaleString()} time buckets.`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeline} margin={{ top: 4, right: 4, left: -18, bottom: 0 }} accessibilityLayer>
                <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="time_bucket" tickFormatter={(value) => formatAxisTime(String(value), range)} tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={{ stroke: "var(--border)" }} tickLine={false} minTickGap={24} />
                <YAxis allowDecimals={false} tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: "var(--surface-hover)", opacity: 0.5 }} contentStyle={tooltipStyle} labelFormatter={(value) => formatFullTime(String(value))} formatter={(value) => [Number(value ?? 0).toLocaleString(), "5xx errors"]} />
                <Bar dataKey="errors" name="5xx errors" fill="var(--danger)" radius={[3, 3, 0, 0]} maxBarSize={30} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard id="latency-trend-title" title="Latency trend" description="Average and P95 duration from each real time bucket." icon={Clock3}>
          <div className="h-full min-w-0" role="img" tabIndex={0} aria-label="Latency trend chart showing average and P95 request duration in milliseconds.">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeline} margin={{ top: 4, right: 8, left: -12, bottom: 0 }} accessibilityLayer>
                <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="time_bucket" tickFormatter={(value) => formatAxisTime(String(value), range)} tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={{ stroke: "var(--border)" }} tickLine={false} minTickGap={24} />
                <YAxis unit=" ms" tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} width={54} />
                <Tooltip contentStyle={tooltipStyle} labelFormatter={(value) => formatFullTime(String(value))} formatter={(value, name) => [`${Number(value ?? 0).toFixed(2)} ms`, name]} />
                <Legend wrapperStyle={{ color: "var(--text-secondary)", fontSize: "0.6875rem" }} />
                <Line type="linear" dataKey="avg_latency" name="Average" stroke="var(--brand)" strokeWidth={2} dot={false} activeDot={{ r: 3 }} connectNulls={false} isAnimationActive={false} />
                <Line type="linear" dataKey="p95_latency" name="P95" stroke="var(--warning)" strokeWidth={2} dot={false} activeDot={{ r: 3 }} connectNulls={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
