"use client";

import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Inbox,
  RefreshCw,
  Search,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { AnalyticsBoundary } from "@/components/analytics/analytics-boundary";
import { useAnalytics } from "@/components/analytics/analytics-provider";
import { AnalyticsToolbar } from "@/components/analytics/analytics-toolbar";
import { useProjects } from "@/components/projects/projects-provider";
import { Button } from "@/components/ui/button";
import { listIssuesRequest, type IssueSummary } from "@/lib/issues-api";

const PAGE_SIZE = 20;
type LoadStatus = "idle" | "loading" | "ready" | "error";

export function IssuesList() {
  const { selectedProject } = useProjects();
  const { range } = useAnalytics();
  const [issues, setIssues] = useState<IssueSummary[]>([]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<LoadStatus>("idle");
  const [error, setError] = useState("");
  const [loadedScope, setLoadedScope] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState("");
  const manualRefreshRef = useRef(false);
  const projectId = selectedProject?.id ?? "";
  const baseScope = `${projectId}:${range}`;
  const requestScope = `${baseScope}:${page}:${search}`;
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
        setIssues([]);
        setTotalCount(0);
        setTotalPages(0);
        setStatus("idle");
        setLoadedScope("");
        setRefreshing(false);
        setRefreshError("");
      });
      return () => controller.abort();
    }

    if (!manualRefresh) {
      queueMicrotask(() => {
        if (controller.signal.aborted) return;
        setIssues([]);
        setTotalCount(0);
        setTotalPages(0);
        setStatus("loading");
        setError("");
        setLoadedScope(requestScope);
        setRefreshing(false);
        setRefreshError("");
      });
    }

    void listIssuesRequest({
      projectId,
      range,
      page,
      limit: PAGE_SIZE,
      search: search || undefined,
      signal: controller.signal,
    })
      .then((result) => {
        if (controller.signal.aborted) return;
        setIssues(result.issues);
        setTotalCount(result.totalCount);
        setTotalPages(result.totalPages);
        setStatus("ready");
        setError("");
        setLoadedScope(requestScope);
        setRefreshing(false);
        setRefreshError("");
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        const message = reason instanceof Error ? reason.message : "Issues could not be loaded.";
        if (manualRefresh) {
          setRefreshing(false);
          setRefreshError(message);
        } else {
          setIssues([]);
          setTotalCount(0);
          setTotalPages(0);
          setStatus("error");
          setError(message);
          setLoadedScope(requestScope);
        }
      });

    return () => controller.abort();
  }, [page, projectId, range, reloadKey, requestScope, search]);

  const scopeLoaded = loadedScope === requestScope;
  const visibleIssues = scopeLoaded ? issues : [];
  const visibleCount = scopeLoaded ? totalCount : 0;
  const visiblePages = scopeLoaded ? totalPages : 0;
  const visibleStatus: LoadStatus = projectId && !scopeLoaded ? "loading" : status;

  function applySearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  }

  function clearSearch() {
    setSearchInput("");
    setSearch("");
    setPage(1);
  }

  function refreshIssues() {
    if (!projectId || refreshing || visibleStatus === "loading") return;
    manualRefreshRef.current = true;
    setRefreshing(true);
    setRefreshError("");
    setReloadKey((current) => current + 1);
  }

  return (
    <AnalyticsBoundary>
      <AnalyticsToolbar />
      <section className="mt-5 overflow-hidden border border-border-subtle bg-surface" aria-labelledby="issues-list-title" aria-busy={visibleStatus === "loading" || refreshing}>
        <div className="flex flex-col gap-4 border-b border-border-subtle bg-surface-inset px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
          <div>
            <div className="flex flex-wrap items-center gap-2"><h2 id="issues-list-title" className="text-sm font-semibold">Active issues</h2>{visibleStatus === "ready" ? <span className="rounded-full border border-border px-2 py-0.5 font-mono text-[0.625rem] text-text-muted">{visibleCount.toLocaleString()} groups</span> : null}</div>
            <p className="mt-1 text-xs leading-5 text-text-muted">Recurring error patterns ordered by most recently seen.</p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={refreshIssues} disabled={refreshing || visibleStatus === "loading"} aria-label={refreshing ? "Refreshing issues" : "Refresh issues"}><RefreshCw size={14} className={refreshing ? "animate-spin motion-reduce:animate-none" : ""} aria-hidden="true" />{refreshing ? "Refreshing…" : "Refresh"}</Button>
        </div>

        <form onSubmit={applySearch} className="border-b border-border-subtle px-4 py-4 sm:px-5" role="search">
          <label htmlFor="issue-search" className="mb-1.5 block text-xs font-medium text-text-secondary">Search issue message, route, or type</label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <span className="relative min-w-0 flex-1"><Search size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-text-muted" aria-hidden="true" /><input id="issue-search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} maxLength={200} placeholder="Search issues" className="h-9 w-full rounded-md border border-border bg-background pr-3 pl-9 font-mono text-xs text-text-primary outline-none placeholder:text-text-muted focus:border-brand-steel" /></span>
            <Button type="submit" variant="secondary" size="sm">Search</Button>
            {search || searchInput ? <Button type="button" variant="ghost" size="sm" onClick={clearSearch}>Clear</Button> : null}
          </div>
          <div className="mt-2 min-h-4 font-mono text-[0.625rem]" aria-live="polite">{refreshError ? <span role="alert" className="text-danger">Refresh failed: {refreshError}</span> : visibleStatus === "ready" ? <span className="text-text-muted">Page {page} of {Math.max(visiblePages, 1)} · selected range only</span> : null}</div>
        </form>

        {visibleStatus === "loading" ? <IssuesSkeleton /> : null}
        {visibleStatus === "error" ? <IssuesError message={error} onRetry={() => setReloadKey((current) => current + 1)} /> : null}
        {visibleStatus === "ready" && visibleIssues.length === 0 ? (
          <div className="px-5 py-12 text-center"><Inbox size={20} className="mx-auto text-brand-steel" aria-hidden="true" /><h3 className="mt-3 text-sm font-semibold">{search ? "No issues match this search" : "No issues in this range"}</h3><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-text-secondary">{search ? "Clear or adjust the search to inspect other error groups." : "No HTTP 5xx or application-error events were reported. No sample issues are shown."}</p>{search ? <Button type="button" variant="outline" size="sm" className="mt-4" onClick={clearSearch}>Clear search</Button> : null}</div>
        ) : null}

        {visibleStatus === "ready" && visibleIssues.length > 0 ? (
          <>
            <DesktopIssuesTable issues={visibleIssues} />
            <MobileIssuesList issues={visibleIssues} />
            <div className="flex flex-col gap-3 border-t border-border-subtle bg-surface-inset px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5"><p className="font-mono text-[0.6875rem] text-text-muted">Page {page} of {Math.max(visiblePages, 1)} · {visibleCount.toLocaleString()} issues</p><div className="flex gap-2"><Button type="button" variant="outline" size="sm" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1 || refreshing}><ChevronLeft size={14} aria-hidden="true" />Previous</Button><Button type="button" variant="outline" size="sm" onClick={() => setPage((current) => current + 1)} disabled={page >= visiblePages || refreshing}>Next<ChevronRight size={14} aria-hidden="true" /></Button></div></div>
          </>
        ) : null}
      </section>
    </AnalyticsBoundary>
  );
}

function DesktopIssuesTable({ issues }: { issues: IssueSummary[] }) {
  return <div className="hidden overflow-x-auto md:block"><table className="type-table w-full min-w-[62rem] border-collapse text-left"><thead className="bg-surface-inset font-mono text-[0.625rem] tracking-[0.08em] text-text-muted uppercase"><tr><th className="px-4 py-3 font-medium sm:px-5">Issue</th><th className="px-4 py-3 font-medium">Route</th><th className="px-4 py-3 text-right font-medium">Occurrences</th><th className="px-4 py-3 text-right font-medium">Affected</th><th className="px-4 py-3 font-medium">First seen</th><th className="px-4 py-3 font-medium sm:px-5">Last seen</th></tr></thead><tbody>{issues.map((issue) => <tr key={issue.issue_id} className="border-t border-border-subtle text-text-secondary hover:bg-surface-hover/45"><td className="max-w-sm px-4 py-3.5 sm:px-5"><Link href={`/dashboard/issues/${issue.issue_id}`} className="group block rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="block truncate text-sm font-medium text-text-primary group-hover:text-brand" title={issue.message ?? issue.error_type}>{issue.message ?? issue.error_type}</span><span className="mt-1 block font-mono text-[0.625rem] text-danger">{issue.error_type}</span></Link></td><td className="max-w-56 truncate px-4 py-3.5 font-mono text-xs text-text-primary" title={issue.route ?? undefined}>{issue.route ?? "—"}</td><td className="px-4 py-3.5 text-right font-mono text-xs text-text-primary">{issue.occurrence_count.toLocaleString()}</td><td className="px-4 py-3.5 text-right font-mono text-xs"><span className="inline-flex items-center gap-1.5"><UsersRound size={13} aria-hidden="true" />{issue.affected_identity_count.toLocaleString()}</span></td><td className="whitespace-nowrap px-4 py-3.5 font-mono text-[0.6875rem]">{formatTime(issue.first_seen)}</td><td className="whitespace-nowrap px-4 py-3.5 font-mono text-[0.6875rem] sm:px-5">{formatTime(issue.last_seen)}</td></tr>)}</tbody></table></div>;
}

function MobileIssuesList({ issues }: { issues: IssueSummary[] }) {
  return <ul className="divide-y divide-border-subtle md:hidden">{issues.map((issue) => <li key={issue.issue_id}><Link href={`/dashboard/issues/${issue.issue_id}`} className="block px-4 py-4 hover:bg-surface-hover/45 focus-visible:bg-brand-muted/30"><span className="flex items-start justify-between gap-3"><span className="min-w-0"><span className="block truncate text-sm font-medium text-text-primary">{issue.message ?? issue.error_type}</span><span className="mt-1 block truncate font-mono text-[0.6875rem] text-text-muted">{issue.route ?? "No route"}</span></span><span className="shrink-0 rounded border border-danger/30 bg-danger-muted/45 px-2 py-0.5 font-mono text-[0.625rem] text-danger">{issue.error_type}</span></span><span className="mt-3 grid grid-cols-3 gap-2 font-mono text-[0.625rem] text-text-muted"><span><span className="block text-text-primary">{issue.occurrence_count.toLocaleString()}</span>occurrences</span><span><span className="block text-text-primary">{issue.affected_identity_count.toLocaleString()}</span>affected</span><span className="text-right"><span className="block text-text-primary">{formatTime(issue.last_seen)}</span>last seen</span></span></Link></li>)}</ul>;
}

function IssuesSkeleton() {
  return <div role="status" aria-label="Loading issues" className="animate-pulse motion-reduce:animate-none"><span className="sr-only">Loading issues…</span>{Array.from({ length: 6 }, (_, index) => <div key={index} className="grid grid-cols-[minmax(0,1fr)_4rem_4rem] gap-3 border-b border-border-subtle px-4 py-5 md:grid-cols-[minmax(12rem,1fr)_12rem_6rem_6rem_9rem_9rem] md:gap-4 md:px-5" aria-hidden="true">{Array.from({ length: 6 }, (__, cell) => <span key={cell} className={`${cell > 2 ? "hidden md:block" : "block"} h-3 rounded-sm bg-surface-elevated`} />)}</div>)}</div>;
}

function IssuesError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="px-5 py-12 text-center" role="alert"><AlertCircle size={20} className="mx-auto text-danger" aria-hidden="true" /><h3 className="mt-3 text-sm font-semibold">Issues could not be loaded</h3><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-text-secondary">{message}</p><Button type="button" variant="outline" size="sm" className="mt-4" onClick={onRetry}>Try again</Button></div>;
}

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}
