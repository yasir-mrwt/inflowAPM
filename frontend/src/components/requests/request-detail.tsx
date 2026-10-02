"use client";

import { AlertCircle, ArrowLeft, Fingerprint, UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { useProjects } from "@/components/projects/projects-provider";
import { Button } from "@/components/ui/button";
import {
  getTelemetryRequest,
  type TelemetryRequestDetail,
} from "@/lib/telemetry-request-api";
import { cn } from "@/lib/utils";

type DetailStatus = "loading" | "ready" | "error";

export function RequestDetail({ requestId }: { requestId: string }) {
  const { projects } = useProjects();
  const [request, setRequest] = useState<TelemetryRequestDetail | null>(null);
  const [status, setStatus] = useState<DetailStatus>("loading");
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => {
      if (controller.signal.aborted) return;
      setStatus("loading");
      setError("");
      setRequest(null);
    });
    void getTelemetryRequest(requestId, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        setRequest(data);
        setStatus("ready");
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setError(reason instanceof Error ? reason.message : "Request detail could not be loaded.");
        setStatus("error");
      });
    return () => controller.abort();
  }, [reloadKey, requestId]);

  const projectName = request
    ? projects.find((project) => project.id === request.project_id)?.name
    : undefined;

  return (
    <div className="max-w-5xl">
      <Link href="/dashboard/requests" className="inline-flex items-center gap-2 text-sm text-text-secondary transition-colors hover:text-text-primary"><ArrowLeft size={15} aria-hidden="true" />Back to requests</Link>
      <div className="mt-6">
        <p className="type-meta text-brand-steel">Investigation</p>
        <h1 className="type-page mt-3">Request detail</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-text-secondary">Inspect the stored request, timing, status, and captured identity context.</p>
      </div>

      {status === "loading" ? <RequestDetailSkeleton /> : null}

      {status === "error" ? (
        <section className="mt-8 border border-danger/25 bg-danger-muted/25 px-5 py-10 text-center" role="alert">
          <AlertCircle size={21} className="mx-auto text-danger" aria-hidden="true" />
          <h2 className="mt-3 text-base font-semibold">Request detail unavailable</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-text-secondary">{error}</p>
          <Button type="button" variant="outline" size="sm" className="mt-5" onClick={() => setReloadKey((current) => current + 1)}>Try again</Button>
        </section>
      ) : null}

      {status === "ready" && request ? (
        <div className="mt-8 space-y-5">
          <section className="overflow-hidden border border-border-subtle bg-surface" aria-labelledby="request-fields-title">
            <div className="flex flex-col gap-3 border-b border-border-subtle bg-surface-inset px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div><h2 id="request-fields-title" className="text-sm font-semibold">Request</h2><p className="mt-1 text-xs text-text-muted">{projectName ?? "Owned project"}</p></div>
              <StatusBadge status={request.status} />
            </div>
            <dl className="grid sm:grid-cols-2 lg:grid-cols-3">
              <DetailField label="Request ID" value={`#${request.id}`} mono />
              <DetailField label="Timestamp" value={formatTimestamp(request.occurred_at)} mono />
              <DetailField label="Method" value={request.method ?? "Not captured"} mono />
              <DetailField label="Route" value={request.route ?? "Not captured"} mono />
              <DetailField label="Status" value={request.status?.toString() ?? "Not captured"} mono />
              <DetailField label="Duration" value={formatDuration(request.duration_ms)} mono />
            </dl>
          </section>

          {request.user_id || request.anonymous_id ? (
            <section className="overflow-hidden border border-border-subtle bg-surface" aria-labelledby="identity-fields-title">
              <div className="flex items-start gap-3 border-b border-border-subtle bg-surface-inset px-4 py-4 sm:px-5"><UserRound size={16} className="mt-0.5 text-brand-steel" aria-hidden="true" /><div><h2 id="identity-fields-title" className="text-sm font-semibold">Identity</h2><p className="mt-1 text-xs text-text-muted">Identity attached when this telemetry event was captured.</p></div></div>
              <dl className="grid sm:grid-cols-2">
                {request.user_id ? <DetailField label="User ID" value={request.user_id} mono icon={<UserRound size={13} aria-hidden="true" />} /> : null}
                {request.anonymous_id ? <DetailField label="Anonymous ID" value={request.anonymous_id} mono icon={<Fingerprint size={13} aria-hidden="true" />} /> : null}
              </dl>
            </section>
          ) : null}

          {request.is_error || request.error_message ? (
            <section className="overflow-hidden border border-danger/25 bg-danger-muted/15" aria-labelledby="error-fields-title">
              <div className="flex items-start gap-3 border-b border-danger/20 px-4 py-4 sm:px-5"><AlertCircle size={16} className="mt-0.5 text-danger" aria-hidden="true" /><div><h2 id="error-fields-title" className="text-sm font-semibold">Error</h2><p className="mt-1 text-xs text-text-muted">Safe error context retained for this request.</p></div></div>
              <dl className="grid sm:grid-cols-[12rem_minmax(0,1fr)]">
                <DetailField label="HTTP status" value={request.status?.toString() ?? "Not captured"} mono />
                {request.error_message ? <DetailField label="Message" value={request.error_message} mono /> : null}
              </dl>
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function DetailField({ label, value, mono = false, icon }: { label: string; value: string; mono?: boolean; icon?: React.ReactNode }) {
  return <div className="min-w-0 border-b border-border-subtle px-4 py-4 last:border-b-0 sm:border-r sm:px-5"><dt className="flex items-center gap-1.5 font-mono text-[0.625rem] tracking-[0.08em] text-text-muted uppercase">{icon}{label}</dt><dd className={cn("mt-2 break-words text-sm text-text-primary", mono && "font-mono text-xs")}>{value}</dd></div>;
}

function StatusBadge({ status }: { status: number | null }) {
  const tone = status === null ? "border-border text-text-muted" : status >= 500 ? "border-danger/30 bg-danger-muted/45 text-danger" : status >= 400 ? "border-warning/30 bg-warning-muted/45 text-warning" : "border-success/25 bg-success-muted/40 text-success";
  const label = status === null ? "Status unknown" : status >= 500 ? `${status} Server error` : status >= 400 ? `${status} Client error` : `${status} Successful response`;
  return <span className={cn("inline-flex w-fit rounded border px-2.5 py-1 font-mono text-[0.6875rem]", tone)}>{label}</span>;
}

function RequestDetailSkeleton() {
  return <div className="mt-8 animate-pulse space-y-5 motion-reduce:animate-none" role="status" aria-label="Loading request detail"><span className="sr-only">Loading request detail…</span><div className="h-56 border border-border-subtle bg-surface"><div className="h-16 border-b border-border-subtle bg-surface-inset" /><div className="grid grid-cols-2 gap-px p-5 sm:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <span key={index} className="h-10 rounded-sm bg-surface-elevated" />)}</div></div></div>;
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "long" }).format(date);
}

function formatDuration(duration: number | null): string {
  if (duration === null || !Number.isFinite(duration)) return "Not captured";
  return `${duration.toLocaleString(undefined, { maximumFractionDigits: 2 })} ms`;
}
