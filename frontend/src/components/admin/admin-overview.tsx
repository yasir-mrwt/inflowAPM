"use client";

import { Activity, FolderKanban, ServerCrash, Users } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import {
  AdminEmpty,
  AdminError,
  AdminLoading,
  AdminPageHeader,
  StatusBadge,
  formatAdminDate,
  requestErrorMessage,
} from "@/components/admin/admin-ui";
import { adminOverviewRequest, type AdminOverview } from "@/lib/admin-api";

export function AdminOverviewView() {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [revision, setRevision] = useState(0);

  const refresh = useCallback(() => {
    setError("");
    if (data) setRefreshing(true);
    else setLoading(true);
    setRevision((value) => value + 1);
  }, [data]);

  useEffect(() => {
    const controller = new AbortController();
    adminOverviewRequest(controller.signal)
      .then(setData)
      .catch((reason) => {
        const message = requestErrorMessage(reason);
        if (message) setError(message);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      });
    return () => controller.abort();
  }, [revision]);

  const metrics = data
    ? [
        { label: "Total users", value: data.total_users, context: `${data.new_users_24h.toLocaleString()} new in 24h`, icon: Users },
        { label: "Total projects", value: data.total_projects, context: `${data.active_projects.toLocaleString()} active`, icon: FolderKanban },
        { label: "Telemetry events", value: data.total_telemetry_events, context: `${data.telemetry_events_24h.toLocaleString()} in 24h`, icon: Activity },
        { label: "Server errors", value: data.server_errors_24h, context: `${data.server_error_rate_24h.toFixed(2)}% recent rate`, icon: ServerCrash },
      ]
    : [];

  return (
    <div>
      <AdminPageHeader eyebrow="Overview" title="Platform health" description="Real account, project, and telemetry totals across InflowAPM." refreshing={refreshing} onRefresh={refresh} />
      {loading ? <AdminLoading label="Loading platform overview…" /> : null}
      {error && !data ? <AdminError message={error} retry={refresh} /> : null}
      {data ? (
        <>
          {error ? <AdminError message={error} retry={refresh} /> : null}
          <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Platform metrics">
            {metrics.map(({ label, value, context, icon: Icon }) => (
              <article key={label} className="rounded-md border border-border-subtle bg-surface p-4 sm:p-5">
                <div className="flex items-center justify-between"><p className="type-meta text-text-muted">{label}</p><Icon size={16} className="text-brand-steel" aria-hidden="true" /></div>
                <p className="type-metric mt-5 text-text-primary">{value.toLocaleString()}</p>
                <p className="mt-2 text-xs text-text-muted">{context}</p>
              </article>
            ))}
          </section>

          <div className="mt-6 grid gap-5 xl:grid-cols-2">
            <section className="overflow-hidden rounded-md border border-border-subtle bg-surface" aria-labelledby="recent-users-title">
              <div className="flex items-center justify-between border-b border-border-subtle bg-surface-inset px-4 py-3.5"><h2 id="recent-users-title" className="text-sm font-semibold">Recent registrations</h2><Link href="/admin/users" className="text-xs text-brand-steel hover:text-brand">View users</Link></div>
              {data.recent_registrations.length === 0 ? <AdminEmpty title="No registrations" description="No user accounts are available yet." /> : (
                <ul className="divide-y divide-border-subtle">
                  {data.recent_registrations.map((user) => <li key={user.id}><Link href={`/admin/users/${user.id}`} className="flex items-center justify-between gap-4 px-4 py-3.5 hover:bg-surface-hover"><span className="min-w-0"><span className="block truncate text-sm font-medium">{user.first_name} {user.last_name}</span><span className="mt-1 block truncate text-xs text-text-muted">{user.email}</span></span><span className="shrink-0 text-right"><StatusBadge status={user.status} /><span className="mt-1.5 block font-mono text-[0.625rem] text-text-muted">{formatAdminDate(user.created_at)}</span></span></Link></li>)}
                </ul>
              )}
            </section>

            <section className="overflow-hidden rounded-md border border-border-subtle bg-surface" aria-labelledby="recent-projects-title">
              <div className="flex items-center justify-between border-b border-border-subtle bg-surface-inset px-4 py-3.5"><h2 id="recent-projects-title" className="text-sm font-semibold">Recent projects</h2><Link href="/admin/projects" className="text-xs text-brand-steel hover:text-brand">View projects</Link></div>
              {data.recent_projects.length === 0 ? <AdminEmpty title="No projects" description="No projects have been created yet." /> : (
                <ul className="divide-y divide-border-subtle">
                  {data.recent_projects.map((project) => <li key={project.id}><Link href={`/admin/projects/${project.id}`} className="flex items-center justify-between gap-4 px-4 py-3.5 hover:bg-surface-hover"><span className="min-w-0"><span className="block truncate text-sm font-medium">{project.name}</span><span className="mt-1 block truncate text-xs text-text-muted">{project.owner_email}</span></span><span className="shrink-0 text-right"><StatusBadge status={project.status} /><span className="mt-1.5 block font-mono text-[0.625rem] text-text-muted">{formatAdminDate(project.created_at)}</span></span></Link></li>)}
                </ul>
              )}
            </section>
          </div>
        </>
      ) : null}
    </div>
  );
}
