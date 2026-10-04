"use client";

import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Fingerprint,
  RefreshCw,
  UserRound,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { AnalyticsBoundary } from "@/components/analytics/analytics-boundary";
import { useAnalytics } from "@/components/analytics/analytics-provider";
import { AnalyticsToolbar } from "@/components/analytics/analytics-toolbar";
import { useProjects } from "@/components/projects/projects-provider";
import { Button } from "@/components/ui/button";
import {
  getIssueRequest,
  type IssueOccurrence,
  type IssueSummary,
} from "@/lib/issues-api";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;
type LoadStatus = "idle" | "loading" | "ready" | "error";

export function IssueDetail({ issueId }: { issueId: string }) {
  const { selectedProject } = useProjects();
  const { range } = useAnalytics();
  const [issue, setIssue] = useState<IssueSummary | null>(null);
  const [occurrences, setOccurrences] = useState<IssueOccurrence[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [status, setStatus] = useState<LoadStatus>("idle");
  const [error, setError] = useState("");
  const [loadedScope, setLoadedScope] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState("");
  const manualRefreshRef = useRef(false);
  const projectId = selectedProject?.id ?? "";
  const baseScope = `${projectId}:${range}:${issueId}`;
  const requestScope = `${baseScope}:${page}`;
  const previousBaseScopeRef = useRef(baseScope);

  useEffect(() => {
    if (previousBaseScopeRef.current === baseScope) return;
    previousBaseScopeRef.current = baseScope;
    queueMicrotask(() => setPage(1));
  }, [baseScope]);

  useEffect(() => {
    const controller = new AbortController();
    const manualRefresh = manualRefreshRef.current;
    manualRefreshRef.current = false;
    if (!projectId) {
      queueMicrotask(() => {
        if (controller.signal.aborted) return;
        setIssue(null);
        setOccurrences([]);
        setTotalPages(0);
        setStatus("idle");
        setLoadedScope("");
        setRefreshing(false);
      });
      return () => controller.abort();
    }

    if (!manualRefresh) {
      queueMicrotask(() => {
        if (controller.signal.aborted) return;
        setIssue(null);
        setOccurrences([]);
        setTotalPages(0);
        setStatus("loading");
        setError("");
        setLoadedScope(requestScope);
        setRefreshing(false);
        setRefreshError("");
      });
    }

    void getIssueRequest({
      issueId,
      projectId,
      range,
      page,
      limit: PAGE_SIZE,
      signal: controller.signal,
    })
      .then((result) => {
        if (controller.signal.aborted) return;
        setIssue(result.issue);
        setOccurrences(result.occurrences);
        setTotalPages(result.totalPages);
        setStatus("ready");
        setError("");
        setLoadedScope(requestScope);
        setRefreshing(false);
        setRefreshError("");
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        const message = reason instanceof Error ? reason.message : "Issue detail could not be loaded.";
        if (manualRefresh) {
          setRefreshing(false);
          setRefreshError(message);
        } else {
          setIssue(null);
          setOccurrences([]);
          setTotalPages(0);
          setStatus("error");
          setError(message);
          setLoadedScope(requestScope);
        }
      });
    return () => controller.abort();
  }, [issueId, page, projectId, range, reloadKey, requestScope]);

  const scopeLoaded = loadedScope === requestScope;
  const visibleIssue = scopeLoaded ? issue : null;
  const visibleOccurrences = scopeLoaded ? occurrences : [];
  const visiblePages = scopeLoaded ? totalPages : 0;
  const visibleStatus: LoadStatus = projectId && !scopeLoaded ? "loading" : status;
  const pageIdentities = uniquePageIdentities(visibleOccurrences);

  function refreshDetail() {
    if (!projectId || refreshing || visibleStatus === "loading") return;
    manualRefreshRef.current = true;
    setRefreshing(true);
    setRefreshError("");
    setReloadKey((current) => current + 1);
  }

  return (
    <AnalyticsBoundary>
      <AnalyticsToolbar />
      {visibleStatus === "loading" ? <IssueDetailSkeleton /> : null}
      {visibleStatus === "error" ? <IssueDetailError message={error} onRetry={() => setReloadKey((current) => current + 1)} /> : null}
      {visibleStatus === "ready" && visibleIssue ? (
        <div className="mt-5 space-y-5" aria-busy={refreshing}>
          <section className="overflow-hidden border border-border-subtle bg-surface" aria-labelledby="issue-summary-title">
            <div className="flex flex-col gap-3 border-b border-border-subtle bg-surface-inset px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5"><div className="min-w-0"><p className="font-mono text-[0.625rem] text-danger">{visibleIssue.error_type}</p><h2 id="issue-summary-title" className="mt-1 break-words text-base font-semibold text-text-primary">{visibleIssue.message ?? "No error message reported"}</h2><p className="mt-2 break-all font-mono text-xs text-text-muted">{visibleIssue.route ?? "No route reported"}</p></div><Button type="button" variant="ghost" size="sm" onClick={refreshDetail} disabled={refreshing}><RefreshCw size={14} className={refreshing ? "animate-spin motion-reduce:animate-none" : ""} aria-hidden="true" />{refreshing ? "Refreshing…" : "Refresh issue"}</Button></div>
            <dl className="grid grid-cols-2 lg:grid-cols-5"><Metric label="Occurrences" value={visibleIssue.occurrence_count.toLocaleString()} /><Metric label="Affected identities" value={visibleIssue.affected_identity_count.toLocaleString()} /><Metric label="First seen" value={formatTime(visibleIssue.first_seen)} /><Metric label="Last seen" value={formatTime(visibleIssue.last_seen)} /><Metric label="Issue ID" value={shortId(visibleIssue.issue_id)} title={visibleIssue.issue_id} /></dl>
            <div className="min-h-7 border-t border-border-subtle px-4 py-2 font-mono text-[0.625rem] sm:px-5" aria-live="polite">{refreshError ? <span role="alert" className="text-danger">Refresh failed: {refreshError}</span> : refreshing ? <span className="text-brand-steel">Refreshing issue and occurrences…</span> : <span className="text-text-muted">Selected range: {range}</span>}</div>
          </section>

          <section className="overflow-hidden border border-border-subtle bg-surface" aria-labelledby="affected-identities-title">
            <div className="flex items-start gap-3 border-b border-border-subtle bg-surface-inset px-4 py-4 sm:px-5"><UsersRound size={16} className="mt-0.5 shrink-0 text-brand-steel" aria-hidden="true" /><div><h2 id="affected-identities-title" className="text-sm font-semibold">Affected identities</h2><p className="mt-1 text-xs leading-5 text-text-muted">Application-provided identifiers only; no account lookup, email, or IP data.</p></div></div>
            {visibleIssue.affected_identity_count === 0 ? <p className="px-4 py-6 text-sm text-text-secondary sm:px-5">No user identity was attached to these occurrences.</p> : pageIdentities.length > 0 ? <><ul className="divide-y divide-border-subtle">{pageIdentities.map((identity) => <li key={`${identity.kind}:${identity.id}`} className="flex min-w-0 items-center gap-3 px-4 py-3 sm:px-5">{identity.kind === "user" ? <UserRound size={14} className="shrink-0 text-brand-steel" aria-hidden="true" /> : <Fingerprint size={14} className="shrink-0 text-text-muted" aria-hidden="true" />}<span className="min-w-0"><span className="block font-mono text-[0.625rem] tracking-[0.08em] text-text-muted uppercase">{identity.kind === "user" ? "User ID" : "Anonymous ID"}</span><span className="mt-0.5 block truncate font-mono text-xs text-text-primary" title={identity.id}>{identity.id}</span></span></li>)}</ul><p className="border-t border-border-subtle px-4 py-2.5 text-xs text-text-muted sm:px-5">Showing unique identities present in this occurrence page. {visibleIssue.affected_identity_count.toLocaleString()} affected across the selected range.</p></> : <p className="px-4 py-6 text-sm text-text-secondary sm:px-5">No identity appears in this occurrence page. The issue summary reports {visibleIssue.affected_identity_count.toLocaleString()} across the selected range.</p>}
          </section>

          <section className="overflow-hidden border border-border-subtle bg-surface" aria-labelledby="recent-occurrences-title">
            <div className="border-b border-border-subtle bg-surface-inset px-4 py-4 sm:px-5"><h2 id="recent-occurrences-title" className="text-sm font-semibold">Recent occurrences</h2><p className="mt-1 text-xs leading-5 text-text-muted">Newest telemetry occurrences for this fingerprint. HTTP occurrences link to their request detail.</p></div>
            <DesktopOccurrences occurrences={visibleOccurrences} />
            <MobileOccurrences occurrences={visibleOccurrences} />
            <div className="flex flex-col gap-3 border-t border-border-subtle bg-surface-inset px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5"><p className="font-mono text-[0.6875rem] text-text-muted">Page {page} of {Math.max(visiblePages, 1)} · {visibleIssue.occurrence_count.toLocaleString()} occurrences</p><div className="flex gap-2"><Button type="button" variant="outline" size="sm" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1 || refreshing}><ChevronLeft size={14} aria-hidden="true" />Previous</Button><Button type="button" variant="outline" size="sm" onClick={() => setPage((current) => current + 1)} disabled={page >= visiblePages || refreshing}>Next<ChevronRight size={14} aria-hidden="true" /></Button></div></div>
          </section>
        </div>
      ) : null}
    </AnalyticsBoundary>
  );
}

function DesktopOccurrences({ occurrences }: { occurrences: IssueOccurrence[] }) {
  return <div className="hidden overflow-x-auto md:block"><table className="type-table w-full min-w-[58rem] border-collapse text-left"><thead className="bg-surface-inset font-mono text-[0.625rem] tracking-[0.08em] text-text-muted uppercase"><tr><th className="px-4 py-3 font-medium sm:px-5">Time</th><th className="px-4 py-3 font-medium">Request</th><th className="px-4 py-3 font-medium">Route</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 text-right font-medium">Duration</th><th className="px-4 py-3 font-medium sm:px-5">Identity</th></tr></thead><tbody>{occurrences.map((occurrence) => <tr key={occurrence.id} className="border-t border-border-subtle text-text-secondary hover:bg-surface-hover/45"><td className="whitespace-nowrap px-4 py-3.5 font-mono text-[0.6875rem] sm:px-5">{formatTime(occurrence.occurred_at)}</td><td className="px-4 py-3.5">{occurrence.type === "http" ? <Link href={`/dashboard/requests/${occurrence.id}`} className="font-mono text-xs text-brand-steel hover:text-brand">Request #{occurrence.id}</Link> : <span className="font-mono text-xs text-text-muted">Event #{occurrence.id}</span>}</td><td className="max-w-56 truncate px-4 py-3.5 font-mono text-xs text-text-primary" title={occurrence.route ?? undefined}>{occurrence.route ?? "—"}</td><td className="px-4 py-3.5"><StatusBadge status={occurrence.status} type={occurrence.type} /></td><td className="px-4 py-3.5 text-right font-mono text-xs">{formatDuration(occurrence.duration_ms)}</td><td className="max-w-44 px-4 py-3.5 sm:px-5"><OccurrenceIdentity occurrence={occurrence} /></td></tr>)}</tbody></table></div>;
}

function MobileOccurrences({ occurrences }: { occurrences: IssueOccurrence[] }) {
  return <ul className="divide-y divide-border-subtle md:hidden">{occurrences.map((occurrence) => <li key={occurrence.id} className="px-4 py-4"><span className="flex items-start justify-between gap-3"><span className="min-w-0"><span className="block font-mono text-[0.6875rem] text-text-muted">{formatTime(occurrence.occurred_at)}</span><span className="mt-1 block truncate font-mono text-xs text-text-primary">{occurrence.route ?? "—"}</span></span><StatusBadge status={occurrence.status} type={occurrence.type} /></span><span className="mt-3 flex min-w-0 items-center justify-between gap-3">{occurrence.type === "http" ? <Link href={`/dashboard/requests/${occurrence.id}`} className="truncate font-mono text-xs text-brand-steel hover:text-brand">Request #{occurrence.id}</Link> : <span className="truncate font-mono text-xs text-text-muted">Event #{occurrence.id}</span>}<span className="shrink-0 font-mono text-xs text-text-secondary">{formatDuration(occurrence.duration_ms)}</span></span><span className="mt-2 block min-w-0"><OccurrenceIdentity occurrence={occurrence} /></span></li>)}</ul>;
}

function OccurrenceIdentity({ occurrence }: { occurrence: IssueOccurrence }) {
  if (occurrence.user_id) return <span className="block truncate font-mono text-[0.6875rem] text-text-secondary" title={occurrence.user_id}>User {occurrence.user_id}</span>;
  if (occurrence.anonymous_id) return <span className="block truncate font-mono text-[0.6875rem] text-text-muted" title={occurrence.anonymous_id}>Anon {occurrence.anonymous_id}</span>;
  return <span className="text-xs text-text-muted">No identity</span>;
}

function Metric({ label, value, title }: { label: string; value: string; title?: string }) {
  return <div className="min-w-0 border-t border-r border-border-subtle px-4 py-4 last:border-r-0 sm:px-5"><dt className="font-mono text-[0.625rem] tracking-[0.08em] text-text-muted uppercase">{label}</dt><dd className="mt-2 truncate font-mono text-sm text-text-primary" title={title}>{value}</dd></div>;
}

function StatusBadge({ status, type }: { status: number | null; type: IssueOccurrence["type"] }) {
  if (status === null) return <span className="rounded border border-danger/25 bg-danger-muted/35 px-2 py-0.5 font-mono text-[0.625rem] text-danger">{type === "event" ? "App error" : "Unknown"}</span>;
  const tone = status >= 500 ? "border-danger/30 bg-danger-muted/45 text-danger" : status >= 400 ? "border-warning/30 bg-warning-muted/45 text-warning" : "border-success/25 bg-success-muted/40 text-success";
  return <span className={cn("rounded border px-2 py-0.5 font-mono text-[0.6875rem]", tone)}>{status}</span>;
}

function IssueDetailSkeleton() {
  return <div className="mt-5 animate-pulse space-y-5 motion-reduce:animate-none" role="status" aria-label="Loading issue detail"><span className="sr-only">Loading issue detail…</span><div className="h-52 border border-border-subtle bg-surface"><div className="h-24 border-b border-border-subtle bg-surface-inset" /><div className="grid grid-cols-2 gap-px p-4 sm:grid-cols-5">{Array.from({ length: 5 }, (_, index) => <span key={index} className="h-12 rounded-sm bg-surface-elevated" />)}</div></div><div className="h-36 border border-border-subtle bg-surface" /><div className="h-64 border border-border-subtle bg-surface" /></div>;
}

function IssueDetailError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="mt-5 border border-danger/25 bg-danger-muted/20 px-5 py-12 text-center" role="alert"><AlertCircle size={20} className="mx-auto text-danger" aria-hidden="true" /><h2 className="mt-3 text-sm font-semibold">Issue detail could not be loaded</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-text-secondary">{message}</p><Button type="button" variant="outline" size="sm" className="mt-4" onClick={onRetry}>Try again</Button></div>;
}

function uniquePageIdentities(occurrences: IssueOccurrence[]): Array<{ kind: "user" | "anonymous"; id: string }> {
  const identities = new Map<string, { kind: "user" | "anonymous"; id: string }>();
  for (const occurrence of occurrences) {
    const identity = occurrence.user_id ? { kind: "user" as const, id: occurrence.user_id } : occurrence.anonymous_id ? { kind: "anonymous" as const, id: occurrence.anonymous_id } : null;
    if (identity) identities.set(`${identity.kind}:${identity.id}`, identity);
  }
  return [...identities.values()];
}

function shortId(value: string): string {
  return value.length > 16 ? `${value.slice(0, 8)}…${value.slice(-8)}` : value;
}

function formatDuration(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} ms`;
}

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit" }).format(date);
}
