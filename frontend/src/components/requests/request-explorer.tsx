"use client";

import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  Inbox,
  RefreshCw,
  Search,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";

import { AnalyticsBoundary } from "@/components/analytics/analytics-boundary";
import { useAnalytics } from "@/components/analytics/analytics-provider";
import { AnalyticsToolbar } from "@/components/analytics/analytics-toolbar";
import { RequestTimeline } from "@/components/analytics/request-timeline";
import { useProjects } from "@/components/projects/projects-provider";
import { Button } from "@/components/ui/button";
import { buildCsv, buildRequestsCsvFilename } from "@/lib/csv";
import {
  listTelemetryRequests,
  type HttpMethod,
  type TelemetryRequest,
} from "@/lib/telemetry-request-api";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;
const HTTP_METHODS: HttpMethod[] = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "OPTIONS",
  "HEAD",
];
type LoadStatus = "idle" | "loading" | "ready" | "error";

export function RequestExplorer() {
  const router = useRouter();
  const { selectedProject } = useProjects();
  const { range } = useAnalytics();
  const [page, setPage] = useState(1);
  const [method, setMethod] = useState<HttpMethod | "">("");
  const [statusInput, setStatusInput] = useState("");
  const [statusFilter, setStatusFilter] = useState<number | undefined>();
  const [searchInput, setSearchInput] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const [filterError, setFilterError] = useState("");
  const [requests, setRequests] = useState<TelemetryRequest[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [status, setStatus] = useState<LoadStatus>("idle");
  const [error, setError] = useState("");
  const [loadedScope, setLoadedScope] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState("");
  const manualRefreshRef = useRef(false);
  const projectId = selectedProject?.id ?? "";
  const baseScope = `${projectId}:${range}`;
  const requestScope = `${baseScope}:${page}:${method}:${statusFilter ?? ""}:${searchFilter}`;
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
        setRequests([]);
        setTotalCount(0);
        setTotalPages(0);
        setStatus("idle");
        setError("");
        setLoadedScope("");
        setRefreshing(false);
        setRefreshError("");
      });
      return () => controller.abort();
    }

    if (!manualRefresh) {
      queueMicrotask(() => {
        if (controller.signal.aborted) return;
        setRequests([]);
        setTotalCount(0);
        setTotalPages(0);
        setStatus("loading");
        setError("");
        setLoadedScope(requestScope);
        setRefreshing(false);
        setRefreshError("");
      });
    }

    void listTelemetryRequests({
      projectId,
      range,
      page,
      limit: PAGE_SIZE,
      method: method || undefined,
      status: statusFilter,
      search: searchFilter || undefined,
      signal: controller.signal,
    })
      .then((result) => {
        if (controller.signal.aborted) return;
        setRequests(result.requests);
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
        const message =
          reason instanceof Error
            ? reason.message
            : "Request telemetry could not be loaded.";
        if (manualRefresh) {
          setRefreshing(false);
          setRefreshError(message);
        } else {
          setRequests([]);
          setTotalCount(0);
          setTotalPages(0);
          setStatus("error");
          setError(message);
          setLoadedScope(requestScope);
        }
      });

    return () => controller.abort();
  }, [method, page, projectId, range, reloadKey, requestScope, searchFilter, statusFilter]);

  const scopeLoaded = loadedScope === requestScope;
  const visibleRequests = scopeLoaded ? requests : [];
  const visibleCount = scopeLoaded ? totalCount : 0;
  const visiblePages = scopeLoaded ? totalPages : 0;
  const visibleStatus: LoadStatus = projectId && !scopeLoaded ? "loading" : status;
  const hasFilters = Boolean(method || statusFilter !== undefined || searchFilter);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedStatus = statusInput.trim();
    const parsedStatus = trimmedStatus === "" ? undefined : Number(trimmedStatus);
    if (
      parsedStatus !== undefined &&
      (!Number.isInteger(parsedStatus) || parsedStatus < 100 || parsedStatus > 599)
    ) {
      setFilterError("Status must be a whole number from 100 to 599.");
      return;
    }
    setFilterError("");
    setStatusFilter(parsedStatus);
    setSearchFilter(searchInput.trim());
    setPage(1);
  }

  function clearFilters() {
    setMethod("");
    setStatusInput("");
    setStatusFilter(undefined);
    setSearchInput("");
    setSearchFilter("");
    setFilterError("");
    setPage(1);
  }

  function refreshRequests() {
    if (!projectId || refreshing || visibleStatus === "loading") return;
    manualRefreshRef.current = true;
    setRefreshing(true);
    setRefreshError("");
    setReloadKey((current) => current + 1);
  }

  function openRequest(requestId: string) {
    router.push(`/dashboard/requests/${encodeURIComponent(requestId)}`);
  }

  function handleRowKeyDown(
    event: KeyboardEvent<HTMLTableRowElement>,
    requestId: string,
  ) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openRequest(requestId);
  }

  function exportCurrentPage() {
    if (!selectedProject || visibleRequests.length === 0) return;
    const csv = buildCsv(
      [
        "Timestamp",
        "HTTP Method",
        "Route",
        "Status Code",
        "Duration (ms)",
        "Request ID",
        "User ID",
        "Anonymous ID",
      ],
      visibleRequests.map((request) => [
        request.occurred_at,
        request.method,
        request.route,
        request.status,
        request.duration_ms,
        request.id,
        request.user_id,
        request.anonymous_id,
      ]),
    );
    const filename = buildRequestsCsvFilename(selectedProject.name, range);
    const objectUrl = URL.createObjectURL(
      new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }),
    );
    const download = document.createElement("a");
    download.href = objectUrl;
    download.download = filename;
    download.hidden = true;
    document.body.appendChild(download);
    download.click();
    download.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  }

  return (
    <AnalyticsBoundary>
      <AnalyticsToolbar />
      <RequestTimeline />

      <section className="mt-5 overflow-hidden border border-border-subtle bg-surface" aria-labelledby="request-explorer-title" aria-busy={visibleStatus === "loading" || refreshing}>
        <div className="flex flex-col gap-4 border-b border-border-subtle bg-surface-inset px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="request-explorer-title" className="text-sm font-semibold">Request explorer</h2>
              {visibleStatus === "ready" ? <span className="rounded-full border border-border px-2 py-0.5 font-mono text-[0.625rem] text-text-muted">{visibleCount.toLocaleString()} results</span> : null}
            </div>
            <p className="mt-1 text-xs leading-5 text-text-muted">Newest individual HTTP requests from the selected project and time range.</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={exportCurrentPage} disabled={visibleRequests.length === 0 || visibleStatus !== "ready"} aria-label="Export the currently loaded request page as CSV" title="Exports the currently loaded request page only">
            <Download size={14} aria-hidden="true" />Export current page
          </Button>
        </div>

        <form onSubmit={applyFilters} className="border-b border-border-subtle px-4 py-4 sm:px-5" aria-label="Filter request telemetry">
          <div className="grid gap-3 md:grid-cols-[minmax(12rem,1fr)_9rem_8rem_auto] md:items-end">
            <label className="block min-w-0 text-xs text-text-secondary">
              <span className="mb-1.5 block font-medium">Route</span>
              <span className="relative block">
                <Search size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-text-muted" aria-hidden="true" />
                <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} maxLength={200} placeholder="Search route" className="h-9 w-full rounded-md border border-border bg-background pr-3 pl-9 font-mono text-xs text-text-primary outline-none placeholder:text-text-muted focus:border-brand-steel" />
              </span>
            </label>
            <label className="block text-xs text-text-secondary">
              <span className="mb-1.5 block font-medium">Method</span>
              <select value={method} onChange={(event) => { setMethod(event.target.value as HttpMethod | ""); setPage(1); }} className="h-9 w-full rounded-md border border-border bg-background px-3 font-mono text-xs text-text-primary outline-none focus:border-brand-steel">
                <option value="">All methods</option>
                {HTTP_METHODS.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
            <label className="block text-xs text-text-secondary">
              <span className="mb-1.5 block font-medium">Status</span>
              <input type="number" inputMode="numeric" min={100} max={599} step={1} value={statusInput} onChange={(event) => setStatusInput(event.target.value)} placeholder="Any" aria-invalid={Boolean(filterError)} aria-describedby={filterError ? "request-filter-error" : undefined} className="h-9 w-full rounded-md border border-border bg-background px-3 font-mono text-xs text-text-primary outline-none placeholder:text-text-muted focus:border-brand-steel aria-invalid:border-danger" />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" variant="secondary" size="sm">Apply</Button>
              {hasFilters || searchInput || statusInput ? <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>Clear</Button> : null}
              <Button type="button" variant="ghost" size="icon" className="size-8" onClick={refreshRequests} disabled={refreshing || visibleStatus === "loading"} aria-label={refreshing ? "Refreshing request records" : "Refresh request records"} title="Refresh request records">
                <RefreshCw size={14} className={refreshing ? "animate-spin motion-reduce:animate-none" : ""} aria-hidden="true" />
              </Button>
            </div>
          </div>
          <div className="mt-2 min-h-4 font-mono text-[0.625rem]" aria-live="polite">
            {filterError ? <span id="request-filter-error" role="alert" className="text-danger">{filterError}</span> : null}
            {!filterError && refreshing ? <span className="text-brand-steel">Refreshing current request page…</span> : null}
            {!filterError && !refreshing && refreshError ? <span role="alert" className="text-danger">Refresh failed: {refreshError}</span> : null}
            {!filterError && !refreshing && !refreshError && visibleStatus === "ready" ? <span className="text-text-muted">Showing page {page} of {Math.max(visiblePages, 1)} · current page only</span> : null}
          </div>
        </form>

        {visibleStatus === "loading" ? <RequestTableSkeleton /> : null}

        {visibleStatus === "error" ? (
          <div className="px-5 py-12 text-center" role="alert">
            <AlertCircle size={20} className="mx-auto text-danger" aria-hidden="true" />
            <h3 className="mt-3 text-sm font-semibold">Request records could not be loaded</h3>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-text-secondary">{error}</p>
            <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => setReloadKey((current) => current + 1)}>Try again</Button>
          </div>
        ) : null}

        {visibleStatus === "ready" && visibleRequests.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Inbox size={20} className="mx-auto text-brand-steel" aria-hidden="true" />
            <h3 className="mt-3 text-sm font-semibold">{hasFilters ? "No requests match these filters" : "No request records in this range"}</h3>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-text-secondary">{hasFilters ? "Clear or adjust the filters to inspect other telemetry." : "Send HTTP telemetry for this project or select a wider time range. No sample rows are shown."}</p>
            {hasFilters ? <Button type="button" variant="outline" size="sm" className="mt-4" onClick={clearFilters}>Clear filters</Button> : null}
          </div>
        ) : null}

        {visibleStatus === "ready" && visibleRequests.length > 0 ? (
          <>
            <DesktopRequestTable requests={visibleRequests} onOpen={openRequest} onKeyDown={handleRowKeyDown} />
            <MobileRequestList requests={visibleRequests} onOpen={openRequest} />
            <div className="flex flex-col gap-3 border-t border-border-subtle bg-surface-inset px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <p className="font-mono text-[0.6875rem] text-text-muted">Page {page} of {Math.max(visiblePages, 1)} · {visibleCount.toLocaleString()} requests</p>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1 || refreshing}><ChevronLeft size={14} aria-hidden="true" />Previous</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setPage((current) => current + 1)} disabled={page >= visiblePages || refreshing}>Next<ChevronRight size={14} aria-hidden="true" /></Button>
              </div>
            </div>
          </>
        ) : null}
      </section>
    </AnalyticsBoundary>
  );
}

function DesktopRequestTable({ requests, onOpen, onKeyDown }: { requests: TelemetryRequest[]; onOpen: (requestId: string) => void; onKeyDown: (event: KeyboardEvent<HTMLTableRowElement>, requestId: string) => void }) {
  return (
    <div className="hidden overflow-x-auto md:block">
      <table className="type-table w-full min-w-[62rem] border-collapse text-left">
        <thead className="bg-surface-inset font-mono text-[0.625rem] tracking-[0.08em] text-text-muted uppercase">
          <tr><th className="px-4 py-3 font-medium sm:px-5">Time</th><th className="px-4 py-3 font-medium">Method</th><th className="px-4 py-3 font-medium">Route</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 text-right font-medium">Duration</th><th className="px-4 py-3 font-medium">Identity</th><th className="px-4 py-3 font-medium sm:px-5">Request ID</th></tr>
        </thead>
        <tbody>
          {requests.map((request) => (
            <tr key={request.id} tabIndex={0} onClick={() => onOpen(request.id)} onKeyDown={(event) => onKeyDown(event, request.id)} aria-label={`Inspect ${request.method ?? "HTTP"} ${request.route ?? "request"}, status ${request.status ?? "unknown"}`} className="cursor-pointer border-t border-border-subtle text-text-secondary outline-none hover:bg-surface-hover/45 focus-visible:bg-brand-muted/30">
              <td className="whitespace-nowrap px-4 py-3.5 font-mono text-[0.6875rem] sm:px-5" title={formatExactTime(request.occurred_at)}>{formatRequestTime(request.occurred_at)}</td>
              <td className="px-4 py-3.5"><MethodLabel method={request.method} /></td>
              <td className="max-w-xs truncate px-4 py-3.5 font-mono text-xs text-text-primary" title={request.route ?? undefined}>{request.route ?? "—"}</td>
              <td className="px-4 py-3.5"><StatusLabel status={request.status} /></td>
              <td className="whitespace-nowrap px-4 py-3.5 text-right font-mono text-xs text-text-primary">{formatDuration(request.duration_ms)}</td>
              <td className="max-w-44 px-4 py-3.5"><Identity request={request} /></td>
              <td className="px-4 py-3.5 font-mono text-[0.6875rem] text-brand-steel sm:px-5">#{request.id}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MobileRequestList({ requests, onOpen }: { requests: TelemetryRequest[]; onOpen: (requestId: string) => void }) {
  return (
    <ul className="divide-y divide-border-subtle md:hidden">
      {requests.map((request) => (
        <li key={request.id}>
          <button type="button" onClick={() => onOpen(request.id)} className="block w-full px-4 py-4 text-left hover:bg-surface-hover/45 focus-visible:bg-brand-muted/30">
            <span className="flex items-start justify-between gap-3"><span className="flex min-w-0 items-center gap-2"><MethodLabel method={request.method} /><span className="truncate font-mono text-xs text-text-primary">{request.route ?? "—"}</span></span><StatusLabel status={request.status} /></span>
            <span className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 font-mono text-[0.6875rem] text-text-muted"><span>{formatRequestTime(request.occurred_at)}</span><span className="text-right text-text-primary">{formatDuration(request.duration_ms)}</span><span className="truncate"><Identity request={request} /></span><span className="truncate text-right text-brand-steel">#{request.id}</span></span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function RequestTableSkeleton() {
  return (
    <div role="status" aria-label="Loading request records" className="animate-pulse motion-reduce:animate-none">
      <span className="sr-only">Loading request records…</span>
      {Array.from({ length: 6 }, (_, index) => <div key={index} className="grid grid-cols-[4rem_minmax(0,1fr)_3.5rem] gap-3 border-b border-border-subtle px-4 py-4 sm:px-5 md:grid-cols-[8rem_5rem_minmax(10rem,1fr)_5rem_6rem_8rem_6rem] md:gap-4" aria-hidden="true">{Array.from({ length: 7 }, (__, cell) => <span key={cell} className={cn("h-3 rounded-sm bg-surface-elevated", cell > 2 ? "hidden md:block" : "block")} />)}</div>)}
    </div>
  );
}

function MethodLabel({ method }: { method: string | null }) {
  return <span className="font-mono text-[0.6875rem] font-medium text-brand-steel">{method ?? "—"}</span>;
}

function StatusLabel({ status }: { status: number | null }) {
  const tone = status === null ? "border-border text-text-muted" : status >= 500 ? "border-danger/30 bg-danger-muted/45 text-danger" : status >= 400 ? "border-warning/30 bg-warning-muted/45 text-warning" : "border-success/25 bg-success-muted/40 text-success";
  return <span className={cn("inline-flex min-w-10 justify-center rounded border px-1.5 py-0.5 font-mono text-[0.6875rem]", tone)}>{status ?? "—"}</span>;
}

function Identity({ request }: { request: TelemetryRequest }) {
  if (request.user_id) return <span className="block truncate font-mono text-[0.6875rem] text-text-secondary" title={request.user_id}>User {request.user_id}</span>;
  if (request.anonymous_id) return <span className="block truncate font-mono text-[0.6875rem] text-text-muted" title={request.anonymous_id}>Anon {request.anonymous_id}</span>;
  return <span className="text-text-muted">—</span>;
}

function formatDuration(duration: number | null): string {
  if (duration === null || !Number.isFinite(duration)) return "—";
  return `${duration.toLocaleString(undefined, { maximumFractionDigits: 2 })} ms`;
}

function formatRequestTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit" }).format(date);
}

function formatExactTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}
