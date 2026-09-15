"use client";

import { Activity, BarChart3, Clock3, LoaderCircle, TriangleAlert } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useAnalytics } from "@/components/analytics/analytics-provider";
import type { AnalyticsRange, TimelinePoint } from "@/lib/analytics-api";

const METHOD_COLORS: Record<string, string> = {
  GET: "#2D9CFF",
  POST: "#35D39A",
  PUT: "#F8C547",
  PATCH: "#2BC7B8",
  DELETE: "#7B57D1",
};
const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;
const tooltipStyle = {
  background: "var(--surface-elevated)",
  border: "1px solid var(--border)",
  borderRadius: "6px",
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
  contentClassName = "",
  iconClassName = "text-[#2D9CFF]",
}: {
  id: string;
  title: string;
  description: string;
  icon: typeof Activity;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  iconClassName?: string;
}) {
  return (
    <section className={`min-w-0 overflow-hidden rounded-md border border-border-subtle bg-surface ${className}`} aria-labelledby={id}>
      <div className="flex min-h-20 items-start gap-3 border-b border-border-subtle bg-surface-inset px-4 py-4 sm:px-5">
        <Icon size={18} className={`mt-0.5 shrink-0 ${iconClassName}`} aria-hidden="true" />
        <div>
          <h2 id={id} className="text-sm font-semibold text-text-primary">{title}</h2>
          <p className="mt-1 text-xs leading-5 text-text-muted">{description}</p>
        </div>
      </div>
      <div className={`h-72 min-w-0 p-3 pt-5 sm:p-5 ${contentClassName}`}>{children}</div>
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
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(24rem,1fr)]">
        <ChartCard id="request-traffic-title" title="Request traffic" description="Total requests over the selected period." icon={BarChart3}>
          <div className="h-full min-w-0" role="img" tabIndex={0} aria-label={`Request traffic chart. ${requestSummary(timeline)}`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeline} margin={{ top: 4, right: 4, left: -18, bottom: 0 }} accessibilityLayer>
                <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="time_bucket" tickFormatter={(value) => formatAxisTime(String(value), range)} tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={{ stroke: "var(--border)" }} tickLine={false} minTickGap={24} />
                <YAxis allowDecimals={false} tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: "var(--surface-hover)", opacity: 0.5 }} contentStyle={tooltipStyle} labelFormatter={(value) => formatFullTime(String(value))} formatter={(value) => [Number(value ?? 0).toLocaleString(), "Requests"]} />
                <Bar dataKey="requests" name="Requests" fill="#2D9CFF" radius={[2, 2, 0, 0]} maxBarSize={30} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard id="method-activity-title" title="HTTP methods" description="Proportion of requests by method." icon={Activity} contentClassName="h-auto min-h-72">
          {methodTotals.length > 0 ? (
            <div className="grid min-h-60 min-w-0 items-center gap-4 sm:grid-cols-[10.5rem_minmax(0,1fr)]" role="img" tabIndex={0} aria-label={`HTTP method distribution. ${methodTotals.map((item) => `${item.method} ${item.requests}`).join(", ")}.`}>
              <div className="relative mx-auto h-40 w-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart accessibilityLayer>
                    <Tooltip contentStyle={tooltipStyle} formatter={(value, name) => [Number(value ?? 0).toLocaleString(), name]} />
                    <Pie data={methodTotals} dataKey="requests" nameKey="method" innerRadius={50} outerRadius={76} paddingAngle={0} stroke="none" isAnimationActive={false}>
                      {methodTotals.map((item) => <Cell key={item.method} fill={item.fill} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
                  <span className="font-mono text-xl font-medium text-text-primary">{methodTotals.reduce((sum, item) => sum + item.requests, 0).toLocaleString()}</span>
                  <span className="mt-0.5 text-[0.625rem] text-text-muted">requests</span>
                </div>
              </div>
              <div className="min-w-0">
                <div className="grid grid-cols-[1fr_auto_auto] gap-3 border-b border-border-subtle pb-2 font-mono text-[0.5625rem] tracking-[0.08em] text-text-muted uppercase"><span>Method</span><span>Requests</span><span>Percent</span></div>
                <ul className="divide-y divide-border-subtle">
                  {methodTotals.map((item) => {
                    const total = methodTotals.reduce((sum, method) => sum + method.requests, 0);
                    return <li key={item.method} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 py-2.5 font-mono text-[0.6875rem]"><span className="flex items-center gap-2 text-text-primary"><span className="size-2.5 rounded-full" style={{ backgroundColor: item.fill }} aria-hidden="true" />{item.method}</span><span className="text-text-secondary">{item.requests.toLocaleString()}</span><span className="w-10 text-right text-text-secondary">{Math.round((item.requests / total) * 100)}%</span></li>;
                  })}
                </ul>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center px-5 text-center text-xs leading-5 text-text-muted">No GET, POST, PUT, PATCH, or DELETE activity was reported in this range.</div>
          )}
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard id="error-trend-title" title="Error trend" description="5xx failures by time bucket." icon={TriangleAlert} iconClassName="text-[#FF4D55]">
          <div className="relative h-full min-w-0" role="img" tabIndex={0} aria-label={`Error trend chart. ${totalErrors.toLocaleString()} total server errors across ${timeline.length.toLocaleString()} time buckets.`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeline} margin={{ top: 4, right: 4, left: -18, bottom: 0 }} accessibilityLayer>
                <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="time_bucket" tickFormatter={(value) => formatAxisTime(String(value), range)} tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={{ stroke: "var(--border)" }} tickLine={false} minTickGap={24} />
                <YAxis allowDecimals={false} tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: "var(--surface-hover)", opacity: 0.5 }} contentStyle={tooltipStyle} labelFormatter={(value) => formatFullTime(String(value))} formatter={(value) => [Number(value ?? 0).toLocaleString(), "5xx errors"]} />
                <Bar dataKey="errors" name="5xx errors" fill="#FF4D55" radius={[2, 2, 0, 0]} maxBarSize={30} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
            {totalErrors === 0 ? <div className="pointer-events-none absolute inset-0 grid place-content-center text-center"><p className="text-sm font-medium text-text-primary">No errors</p><p className="mt-1 text-xs text-text-muted">Looks good — no 5xx errors in the selected period.</p></div> : null}
          </div>
        </ChartCard>

        <ChartCard id="latency-trend-title" title="Latency trend" description="Average and P95 latency by time bucket." icon={Clock3}>
          <div className="h-full min-w-0" role="img" tabIndex={0} aria-label="Latency trend chart showing average and P95 request duration in milliseconds.">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeline} margin={{ top: 4, right: 8, left: -12, bottom: 0 }} accessibilityLayer>
                <defs>
                  <linearGradient id="average-latency-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#35B5FF" stopOpacity={0.24} /><stop offset="100%" stopColor="#35B5FF" stopOpacity={0.01} /></linearGradient>
                  <linearGradient id="p95-latency-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#F8C547" stopOpacity={0.22} /><stop offset="100%" stopColor="#F8C547" stopOpacity={0.01} /></linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="time_bucket" tickFormatter={(value) => formatAxisTime(String(value), range)} tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={{ stroke: "var(--border)" }} tickLine={false} minTickGap={24} />
                <YAxis unit=" ms" tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} width={54} />
                <Tooltip contentStyle={tooltipStyle} labelFormatter={(value) => formatFullTime(String(value))} formatter={(value, name) => [`${Number(value ?? 0).toFixed(2)} ms`, name]} />
                <Legend wrapperStyle={{ color: "var(--text-secondary)", fontSize: "0.6875rem" }} />
                <Area type="linear" dataKey="p95_latency" name="P95" stroke="#F8C547" fill="url(#p95-latency-fill)" strokeWidth={2} dot={false} activeDot={{ r: 3 }} connectNulls={false} isAnimationActive={false} />
                <Area type="linear" dataKey="avg_latency" name="Average" stroke="#35B5FF" fill="url(#average-latency-fill)" strokeWidth={2} dot={false} activeDot={{ r: 3 }} connectNulls={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
