"use client";

import { Ban, CheckCircle2, Eye, KeyRound, Search } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";

import {
  AdminEmpty,
  AdminError,
  AdminLoading,
  AdminPageHeader,
  ConfirmDialog,
  Notice,
  Pagination,
  StatusBadge,
  formatAdminDate,
  requestErrorMessage,
} from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import {
  adminProjectRequest,
  adminProjectsRequest,
  updateAdminProjectStatusRequest,
  type AdminProject,
} from "@/lib/admin-api";

const PAGE_SIZE = 20;
const controlClass = "h-9 rounded-md border border-border bg-surface px-3 text-xs text-text-secondary outline-none focus:border-brand-steel focus:ring-2 focus:ring-brand/15";

function ProjectActions({ project, onChange }: { project: AdminProject; onChange: (project: AdminProject) => void }) {
  return <div className="flex flex-wrap justify-end gap-2"><Button asChild variant="ghost" size="sm"><Link href={`/admin/projects/${project.id}`}><Eye size={14} aria-hidden="true" />View</Link></Button><Button type="button" variant={project.status === "active" ? "destructive" : "outline"} size="sm" onClick={() => onChange(project)}>{project.status === "active" ? <Ban size={14} aria-hidden="true" /> : <CheckCircle2 size={14} aria-hidden="true" />}{project.status === "active" ? "Disable" : "Enable"}</Button></div>;
}

export function AdminProjectsView() {
  const [projects, setProjects] = useState<AdminProject[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0);
  const [pending, setPending] = useState<AdminProject | null>(null);
  const [mutating, setMutating] = useState(false);
  const refresh = useCallback(() => { setProjects(null); setError(""); setRevision((value) => value + 1); }, []);

  useEffect(() => {
    const controller = new AbortController();
    adminProjectsRequest({ page, limit: PAGE_SIZE, search, status: statusFilter || undefined }, controller.signal)
      .then((response) => { setProjects(response.data); setTotal(response.total_count); })
      .catch((reason) => { const message = requestErrorMessage(reason); if (message) setError(message); });
    return () => controller.abort();
  }, [page, revision, search, statusFilter]);

  function applySearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = String(new FormData(event.currentTarget).get("search") ?? "").trim();
    setProjects(null); setError(""); setPage(1);
    if (value === search) refresh(); else setSearch(value);
  }

  async function confirmStatusChange() {
    if (!pending) return;
    const next = pending.status === "active" ? "disabled" : "active";
    setMutating(true); setNotice("");
    try { await updateAdminProjectStatusRequest(pending.id, next); setNotice(`${pending.name} is now ${next}.`); setPending(null); refresh(); }
    catch (reason) { setError(requestErrorMessage(reason)); setPending(null); }
    finally { setMutating(false); }
  }

  return (
    <div>
      <AdminPageHeader eyebrow="Registry" title="Projects" description="Review project ownership and control future telemetry ingestion while preserving historical data." onRefresh={refresh} refreshing={projects === null} />
      <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(18rem,1fr)_12rem]">
        <form onSubmit={applySearch} className="flex min-w-0 gap-2" role="search"><label htmlFor="admin-project-search" className="sr-only">Search projects</label><div className="relative min-w-0 flex-1"><Search size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-text-muted" aria-hidden="true" /><input id="admin-project-search" name="search" defaultValue={search} maxLength={100} className={`${controlClass} w-full pl-9`} placeholder="Search project or owner email" /></div><Button type="submit" variant="secondary" size="sm">Search</Button></form>
        <label className="sr-only" htmlFor="admin-project-status">Filter by status</label><select id="admin-project-status" value={statusFilter} onChange={(event) => { setProjects(null); setError(""); setStatusFilter(event.target.value); setPage(1); }} className={controlClass}><option value="">All statuses</option><option value="active">Active</option><option value="disabled">Disabled</option></select>
      </div>
      {notice ? <div className="mt-4"><Notice kind="success">{notice}</Notice></div> : null}
      {error ? <AdminError message={error} retry={refresh} /> : null}
      {projects === null && !error ? <AdminLoading label="Loading projects…" /> : null}
      {projects?.length === 0 ? <div className="mt-6"><AdminEmpty title="No projects found" description="Try a different search or status filter." /></div> : null}
      {projects && projects.length > 0 ? <section className="mt-6 overflow-hidden rounded-md border border-border-subtle bg-surface" aria-label="Projects"><div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[58rem] border-collapse text-left type-table"><thead className="bg-surface-inset text-[0.625rem] uppercase tracking-[0.1em] text-text-muted"><tr><th className="px-4 py-3 font-medium">Project</th><th className="px-4 py-3 font-medium">Owner</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Created</th><th className="px-4 py-3 text-right font-medium">Actions</th></tr></thead><tbody className="divide-y divide-border-subtle">{projects.map((project) => <tr key={project.id} className="hover:bg-surface-hover/60"><td className="px-4 py-3"><p className="font-medium">{project.name}</p><p className="mt-1 font-mono text-[0.625rem] text-text-muted">{project.id}</p></td><td className="px-4 py-3"><p className="text-xs">{project.owner_email}</p><p className="mt-1 font-mono text-[0.625rem] text-text-muted">{project.owner_id}</p></td><td className="px-4 py-3"><StatusBadge status={project.status} /></td><td className="px-4 py-3 font-mono text-[0.6875rem] text-text-muted">{formatAdminDate(project.created_at)}</td><td className="px-4 py-3"><ProjectActions project={project} onChange={setPending} /></td></tr>)}</tbody></table></div><ul className="divide-y divide-border-subtle md:hidden">{projects.map((project) => <li key={project.id} className="p-4"><div className="flex items-start justify-between gap-3"><span className="min-w-0"><span className="block truncate text-sm font-medium">{project.name}</span><span className="mt-1 block truncate text-xs text-text-muted">{project.owner_email}</span></span><StatusBadge status={project.status} /></div><p className="mt-3 break-all font-mono text-[0.625rem] text-text-muted">{project.id}</p><p className="mt-2 font-mono text-[0.6875rem] text-text-muted">Created {formatAdminDate(project.created_at)}</p><div className="mt-4 border-t border-border-subtle pt-3"><ProjectActions project={project} onChange={setPending} /></div></li>)}</ul><Pagination page={page} limit={PAGE_SIZE} total={total} onPage={(value) => { setProjects(null); setError(""); setPage(value); }} /></section> : null}
      <ConfirmDialog open={Boolean(pending)} title={pending?.status === "active" ? "Disable project?" : "Enable project?"} description={pending?.status === "active" ? `Disable ${pending.name}? Future API-key telemetry ingestion will be rejected, while historical telemetry remains available.` : `Enable ${pending?.name ?? "this project"}? Its valid API key will be accepted for future telemetry again.`} confirmLabel={pending?.status === "active" ? "Disable project" : "Enable project"} destructive={pending?.status === "active"} busy={mutating} onClose={() => setPending(null)} onConfirm={() => void confirmStatusChange()} />
    </div>
  );
}

export function AdminProjectDetailView({ id }: { id: string }) {
  const [project, setProject] = useState<AdminProject | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [mutating, setMutating] = useState(false);
  const refresh = useCallback(() => { setProject(null); setError(""); setRevision((value) => value + 1); }, []);

  useEffect(() => {
    const controller = new AbortController();
    adminProjectRequest(id, controller.signal).then(setProject).catch((reason) => { const message = requestErrorMessage(reason); if (message) setError(message); });
    return () => controller.abort();
  }, [id, revision]);

  async function changeStatus() {
    if (!project) return;
    const next = project.status === "active" ? "disabled" : "active";
    setMutating(true);
    try { await updateAdminProjectStatusRequest(project.id, next); setNotice(`Project is now ${next}.`); setConfirming(false); refresh(); }
    catch (reason) { setError(requestErrorMessage(reason)); setConfirming(false); }
    finally { setMutating(false); }
  }

  return (
    <div>
      <AdminPageHeader eyebrow="Project detail" title={project?.name ?? "Project"} description="Ownership, ingestion state, and real telemetry summary." onRefresh={refresh} refreshing={!project && !error} />
      <Link href="/admin/projects" className="mt-5 inline-flex text-xs text-brand-steel hover:text-brand">← Back to projects</Link>
      {notice ? <div className="mt-4"><Notice kind="success">{notice}</Notice></div> : null}
      {error ? <AdminError message={error} retry={refresh} /> : null}
      {!project && !error ? <AdminLoading label="Loading project…" /> : null}
      {project ? <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]"><section className="rounded-md border border-border-subtle bg-surface"><div className="flex items-start justify-between gap-4 border-b border-border-subtle bg-surface-inset p-5"><div><h2 className="text-base font-semibold">Project record</h2><p className="mt-1 text-xs text-text-muted">Created {formatAdminDate(project.created_at)}</p></div><StatusBadge status={project.status} /></div><dl className="grid gap-px bg-border-subtle sm:grid-cols-2"><Detail label="Project ID" value={project.id} mono /><Detail label="Owner email" value={project.owner_email} /><Detail label="Owner ID" value={project.owner_id} mono /><Detail label="Telemetry events" value={(project.telemetry_event_count ?? 0).toLocaleString()} mono /><Detail label="Server errors" value={(project.server_error_count ?? 0).toLocaleString()} mono /><Detail label="Last activity" value={formatAdminDate(project.last_activity_at)} mono /></dl><div className="flex items-start gap-3 border-t border-border-subtle p-5"><KeyRound size={17} className="mt-0.5 shrink-0 text-brand-steel" aria-hidden="true" /><div><h3 className="text-sm font-semibold">API key protection</h3><p className="mt-1 text-xs leading-5 text-text-muted">The key is stored as a one-way hash and is never exposed in Super Admin responses.</p><span className="mt-3 inline-block font-mono text-[0.625rem] uppercase text-success">{project.api_key_metadata?.stored_as_hash ? "Hashed · protected" : "Not exposed"}</span></div></div></section><aside className="h-fit rounded-md border border-border-subtle bg-surface p-5"><h2 className="text-sm font-semibold">Ingestion control</h2><p className="mt-3 text-xs leading-5 text-text-muted">Disabling rejects future telemetry using this project key. Historical records are preserved.</p><Button type="button" className="mt-5 w-full" variant={project.status === "active" ? "destructive" : "secondary"} onClick={() => setConfirming(true)}>{project.status === "active" ? <Ban size={15} aria-hidden="true" /> : <CheckCircle2 size={15} aria-hidden="true" />}{project.status === "active" ? "Disable project" : "Enable project"}</Button></aside></div> : null}
      <ConfirmDialog open={confirming} title={project?.status === "active" ? "Disable project?" : "Enable project?"} description={project?.status === "active" ? "Future API-key telemetry ingestion will be rejected. Historical telemetry remains intact and available." : "The valid project key will be accepted for future telemetry ingestion again."} confirmLabel={project?.status === "active" ? "Disable project" : "Enable project"} destructive={project?.status === "active"} busy={mutating} onClose={() => setConfirming(false)} onConfirm={() => void changeStatus()} />
    </div>
  );
}

function Detail({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div className="min-w-0 bg-surface p-5"><dt className="type-meta text-text-muted">{label}</dt><dd className={`mt-2 break-words text-sm ${mono ? "font-mono text-xs" : ""}`}>{value}</dd></div>;
}
