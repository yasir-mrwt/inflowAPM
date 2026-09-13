"use client";

import { Activity, AlertTriangle, Clock3, Gauge, LoaderCircle, RadioTower } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { useProjects } from "@/components/projects/projects-provider";
import { dashboardAnalyticsRequest, type AnalyticsRange, type DashboardAnalytics } from "@/lib/analytics-api";

export function KpiOverview() {
  const { selectedProject, status: projectsStatus } = useProjects();
  const [range, setRange] = useState<AnalyticsRange>("24h");
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!selectedProject) {
      queueMicrotask(() => { setAnalytics(null); setStatus("idle"); });
      return;
    }
    const controller = new AbortController();
    queueMicrotask(() => { setStatus("loading"); setError(""); });
    dashboardAnalyticsRequest(selectedProject.id, range, controller.signal)
      .then((data) => { if (!controller.signal.aborted) { setAnalytics(data); setStatus("ready"); } })
      .catch((reason: unknown) => { if (!controller.signal.aborted) { setError(reason instanceof Error ? reason.message : "Analytics could not be loaded."); setStatus("error"); } });
    return () => controller.abort();
  }, [range, selectedProject]);

  if (projectsStatus === "loading") return <div className="mt-8 flex min-h-48 items-center justify-center gap-3 border-y border-border-subtle text-sm text-text-muted"><LoaderCircle size={17} className="animate-spin text-brand motion-reduce:animate-none" aria-hidden="true" />Loading workspace…</div>;
  if (!selectedProject) return <section className="mt-8 border-y border-border-subtle bg-surface-inset px-5 py-9 sm:px-7"><h2 className="text-base font-semibold">Create a project to see KPIs</h2><p className="mt-2 text-sm leading-6 text-text-secondary">Overview metrics are loaded only from a real project analytics response.</p><Link href="/dashboard/projects" className="mt-5 inline-flex text-sm font-medium text-brand-steel hover:text-brand">Open projects →</Link></section>;

  const overview = analytics?.overview;
  const cards = [
    { label: "Requests", value: overview?.total_requests.toLocaleString(), unit: "total", icon: RadioTower },
    { label: "Errors", value: overview?.total_errors.toLocaleString(), unit: "5xx", icon: AlertTriangle },
    { label: "Error rate", value: overview ? overview.error_rate.toFixed(2) : undefined, unit: "%", icon: Activity },
    { label: "Avg latency", value: overview ? overview.avg_latency.toFixed(2) : undefined, unit: "ms", icon: Clock3 },
    { label: "P95 latency", value: overview ? overview.p95_latency.toFixed(2) : undefined, unit: "ms", icon: Gauge },
    { label: "Throughput", value: overview ? overview.throughput.toFixed(2) : undefined, unit: "req/s", icon: Activity },
  ];

  return (
    <div className="mt-8">
      <div className="flex flex-col justify-between gap-4 border-b border-border-subtle pb-4 sm:flex-row sm:items-end">
        <div><p className="font-mono text-[0.625rem] tracking-[0.1em] text-text-muted uppercase">Active project</p><h2 className="mt-1 text-base font-semibold">{selectedProject.name}</h2></div>
        <div><label htmlFor="analytics-range" className="sr-only">Analytics time range</label><select id="analytics-range" value={range} onChange={(event) => setRange(event.target.value as AnalyticsRange)} className="h-9 rounded-md border border-border bg-surface-inset px-3 font-mono text-xs text-text-secondary outline-none focus:border-brand-steel"><option value="1h">Last hour</option><option value="24h">Last 24 hours</option><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option></select></div>
      </div>

      {status === "error" ? <div role="alert" className="mt-5 border border-danger/25 bg-danger-muted/35 p-4 text-sm text-danger">{error}</div> : null}
      <div className="mt-5 grid gap-px overflow-hidden border border-border-subtle bg-border-subtle sm:grid-cols-2 xl:grid-cols-3" aria-busy={status === "loading"}>
        {cards.map(({ label, value, unit, icon: Icon }) => <article key={label} className="min-w-0 bg-surface p-5"><div className="flex items-center justify-between"><p className="type-meta text-text-muted">{label}</p><Icon size={15} className="text-brand-steel" aria-hidden="true" /></div><p className="mt-6 font-mono text-2xl font-medium tracking-[-0.04em] text-text-primary">{status === "loading" ? <span className="text-text-muted" aria-label="Loading">—</span> : (value ?? "—")}</p><p className="mt-1 font-mono text-[0.625rem] text-text-muted">{unit}</p></article>)}
      </div>
      {status === "ready" && overview?.total_requests === 0 ? <p className="mt-4 border-l-2 border-brand-steel px-3 text-xs leading-5 text-text-muted">No HTTP telemetry was received for this project in the selected range. These zero values come directly from the analytics API.</p> : null}
    </div>
  );
}
