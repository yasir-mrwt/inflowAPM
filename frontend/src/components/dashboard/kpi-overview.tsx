"use client";

import { Activity, AlertTriangle, Clock3, Gauge, LoaderCircle, RadioTower } from "lucide-react";
import Link from "next/link";

import { useAnalytics } from "@/components/analytics/analytics-provider";
import { AnalyticsToolbar } from "@/components/analytics/analytics-toolbar";
import { useProjects } from "@/components/projects/projects-provider";

export function KpiOverview() {
  const { selectedProject, status: projectsStatus } = useProjects();
  const { analytics, status, error } = useAnalytics();

  if (projectsStatus === "loading") return <div className="mt-8 flex min-h-48 items-center justify-center gap-3 border-y border-border-subtle text-sm text-text-muted"><LoaderCircle size={17} className="animate-spin text-brand motion-reduce:animate-none" aria-hidden="true" />Loading workspace…</div>;
  if (!selectedProject) return <section className="mt-8 border-y border-border-subtle bg-surface-inset px-5 py-9 sm:px-7"><h2 className="text-base font-semibold">Create a project to see KPIs</h2><p className="mt-2 text-sm leading-6 text-text-secondary">Overview metrics are loaded only from a real project analytics response.</p><Link href="/dashboard/projects" className="mt-5 inline-flex text-sm font-medium text-brand-steel hover:text-brand">Open projects →</Link></section>;

  const overview = analytics?.overview;
  const cards = [
    { label: "Requests", value: overview?.total_requests.toLocaleString(), unit: "total", icon: RadioTower, iconClass: "text-[#2D9CFF]" },
    { label: "Errors", value: overview?.total_errors.toLocaleString(), unit: "5xx", icon: AlertTriangle, iconClass: "text-[#FF4D55]" },
    { label: "Error rate", value: overview ? overview.error_rate.toFixed(2) : undefined, unit: "%", icon: Activity, iconClass: "text-[#FF4D55]" },
    { label: "Avg latency", value: overview ? overview.avg_latency.toFixed(2) : undefined, unit: "ms", icon: Clock3, iconClass: "text-[#2D9CFF]" },
    { label: "P95 latency", value: overview ? overview.p95_latency.toFixed(2) : undefined, unit: "ms", icon: Gauge, iconClass: "text-[#F8C547]" },
    { label: "Throughput", value: overview ? overview.throughput.toFixed(2) : undefined, unit: "req/s", icon: Activity, iconClass: "text-[#2D9CFF]" },
  ];

  return (
    <div className="mt-8">
      <AnalyticsToolbar />

      {status === "error" ? <div role="alert" className="mt-5 border border-danger/25 bg-danger-muted/35 p-4 text-sm text-danger">{error}</div> : null}
      <div className="mt-5 grid gap-px overflow-hidden rounded-md border border-border-subtle bg-border-subtle sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6" aria-busy={status === "loading"}>
        {cards.map(({ label, value, unit, icon: Icon, iconClass }) => <article key={label} className="min-w-0 bg-surface p-5"><div className="flex items-center gap-3"><Icon size={18} className={iconClass} aria-hidden="true" /><p className="type-meta text-text-muted">{label}</p></div><p className="mt-7 font-mono text-2xl font-medium tracking-[-0.04em] text-text-primary">{status === "loading" ? <span className="text-text-muted" aria-label="Loading">—</span> : (value ?? "—")}</p><p className="mt-1 font-mono text-[0.625rem] text-text-muted">{unit}</p></article>)}
      </div>
      {status === "ready" && overview?.total_requests === 0 ? <p className="mt-4 border-l-2 border-brand-steel px-3 text-xs leading-5 text-text-muted">No HTTP telemetry was received for this project in the selected range. These zero values come directly from the analytics API.</p> : null}
    </div>
  );
}
