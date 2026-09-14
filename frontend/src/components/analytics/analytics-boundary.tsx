"use client";

import { LoaderCircle } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { useAnalytics } from "@/components/analytics/analytics-provider";
import { useProjects } from "@/components/projects/projects-provider";

export function AnalyticsBoundary({ children }: { children: ReactNode }) {
  const { selectedProject, status: projectsStatus } = useProjects();
  const { error, status } = useAnalytics();

  if (projectsStatus === "loading") {
    return <div className="mt-8 flex min-h-48 items-center justify-center gap-3 border-y border-border-subtle text-sm text-text-muted"><LoaderCircle size={17} className="animate-spin text-brand motion-reduce:animate-none" aria-hidden="true" />Loading workspace…</div>;
  }
  if (!selectedProject) {
    return <section className="mt-8 border-y border-border-subtle bg-surface-inset px-5 py-9 sm:px-7"><h2 className="text-base font-semibold">Create a project to view analytics</h2><p className="mt-2 text-sm leading-6 text-text-secondary">Request activity is loaded only from a real project telemetry stream.</p><Link href="/dashboard/projects" className="mt-5 inline-flex text-sm font-medium text-brand-steel hover:text-brand">Open projects →</Link></section>;
  }

  return (
    <div className="mt-8">
      {children}
      {status === "error" ? <div role="alert" className="mt-5 border border-danger/25 bg-danger-muted/35 p-4 text-sm text-danger">{error}</div> : null}
    </div>
  );
}
