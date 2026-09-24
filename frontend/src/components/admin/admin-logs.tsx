"use client";

import { useCallback, useEffect, useState } from "react";

import {
  AdminEmpty,
  AdminError,
  AdminLoading,
  AdminPageHeader,
  Pagination,
  formatAdminDate,
  requestErrorMessage,
} from "@/components/admin/admin-ui";
import { adminAuditLogsRequest, type AdminAuditLog } from "@/lib/admin-api";

const PAGE_SIZE = 25;
const actions = [
  "admin.login.succeeded",
  "admin.login.failed",
  "admin.password.changed",
  "user.suspended",
  "user.reactivated",
  "project.disabled",
  "project.enabled",
];

function redactSensitiveMetadata(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSensitiveMetadata);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !/(password|token|secret|credential|api.?key)/i.test(key))
      .map(([key, entry]) => [key, redactSensitiveMetadata(entry)]),
  );
}

function safeMetadata(metadata: Record<string, unknown>): string {
  const safe = redactSensitiveMetadata(metadata) as Record<string, unknown>;
  return Object.keys(safe).length ? JSON.stringify(safe) : "—";
}

export function AdminLogsView() {
  const [logs, setLogs] = useState<AdminAuditLog[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => { setLogs(null); setError(""); setRevision((value) => value + 1); }, []);

  useEffect(() => {
    const controller = new AbortController();
    adminAuditLogsRequest({ page, limit: PAGE_SIZE, action: action || undefined }, controller.signal)
      .then((response) => { setLogs(response.data); setTotal(response.total_count); })
      .catch((reason) => { const message = requestErrorMessage(reason); if (message) setError(message); });
    return () => controller.abort();
  }, [action, page, revision]);

  return (
    <div>
      <AdminPageHeader eyebrow="Governance" title="Audit logs" description="Newest-first record of security-sensitive administrator actions." onRefresh={refresh} refreshing={logs === null} />
      <div className="mt-5 flex justify-end"><label htmlFor="audit-action" className="sr-only">Filter by action</label><select id="audit-action" value={action} onChange={(event) => { setLogs(null); setError(""); setAction(event.target.value); setPage(1); }} className="h-9 w-full rounded-md border border-border bg-surface px-3 text-xs text-text-secondary outline-none focus:border-brand-steel sm:w-64"><option value="">All actions</option>{actions.map((value) => <option key={value} value={value}>{value.replaceAll(".", " · ")}</option>)}</select></div>
      {error ? <AdminError message={error} retry={refresh} /> : null}
      {logs === null && !error ? <AdminLoading label="Loading audit records…" /> : null}
      {logs?.length === 0 ? <div className="mt-6"><AdminEmpty title="No audit records" description="No records match this action filter." /></div> : null}
      {logs && logs.length > 0 ? <section className="mt-6 overflow-hidden rounded-md border border-border-subtle bg-surface" aria-label="Admin audit logs"><div className="hidden overflow-x-auto lg:block"><table className="w-full min-w-[66rem] border-collapse text-left type-table"><thead className="bg-surface-inset text-[0.625rem] uppercase tracking-[0.1em] text-text-muted"><tr><th className="px-4 py-3 font-medium">Timestamp</th><th className="px-4 py-3 font-medium">Admin</th><th className="px-4 py-3 font-medium">Action</th><th className="px-4 py-3 font-medium">Target</th><th className="px-4 py-3 font-medium">IP</th><th className="px-4 py-3 font-medium">Details</th></tr></thead><tbody className="divide-y divide-border-subtle">{logs.map((log) => <tr key={log.id} className="align-top hover:bg-surface-hover/50"><td className="px-4 py-3 font-mono text-[0.6875rem] text-text-muted">{formatAdminDate(log.created_at)}</td><td className="px-4 py-3 text-xs">{log.admin_email ?? "Unknown / unauthenticated"}</td><td className="px-4 py-3 font-mono text-[0.6875rem] text-brand-steel">{log.action}</td><td className="px-4 py-3"><span className="block text-xs">{log.target_type ?? "—"}</span><span className="mt-1 block max-w-56 break-all font-mono text-[0.625rem] text-text-muted">{log.target_id ?? "—"}</span></td><td className="px-4 py-3 font-mono text-[0.6875rem] text-text-muted">{log.ip_address ?? "—"}</td><td className="max-w-72 px-4 py-3 break-words font-mono text-[0.625rem] leading-5 text-text-muted">{safeMetadata(log.metadata)}</td></tr>)}</tbody></table></div><ul className="divide-y divide-border-subtle lg:hidden">{logs.map((log) => <li key={log.id} className="space-y-3 p-4"><div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"><span className="font-mono text-xs text-brand-steel">{log.action}</span><time className="font-mono text-[0.625rem] text-text-muted">{formatAdminDate(log.created_at)}</time></div><p className="text-xs">{log.admin_email ?? "Unknown / unauthenticated admin"}</p><dl className="grid gap-2 text-[0.6875rem] sm:grid-cols-2"><div><dt className="text-text-muted">Target</dt><dd className="mt-1 break-all font-mono">{log.target_type ?? "—"} · {log.target_id ?? "—"}</dd></div><div><dt className="text-text-muted">IP</dt><dd className="mt-1 font-mono">{log.ip_address ?? "—"}</dd></div><div className="sm:col-span-2"><dt className="text-text-muted">Details</dt><dd className="mt-1 break-words font-mono">{safeMetadata(log.metadata)}</dd></div></dl></li>)}</ul><Pagination page={page} limit={PAGE_SIZE} total={total} onPage={(value) => { setLogs(null); setError(""); setPage(value); }} /></section> : null}
    </div>
  );
}
