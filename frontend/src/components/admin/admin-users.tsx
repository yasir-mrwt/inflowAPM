"use client";

import { Eye, Search, ShieldAlert, UserCheck, UserX } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";

import { useAdmin } from "@/components/admin/admin-provider";
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
  adminUserRequest,
  adminUsersRequest,
  updateAdminUserStatusRequest,
  type AdminUser,
} from "@/lib/admin-api";

const PAGE_SIZE = 20;
const controlClass = "h-9 rounded-md border border-border bg-surface px-3 text-xs text-text-secondary outline-none focus:border-brand-steel focus:ring-2 focus:ring-brand/15";

function UserActions({ user, self, onChange }: { user: AdminUser; self: boolean; onChange: (user: AdminUser) => void }) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button asChild variant="ghost" size="sm"><Link href={`/admin/users/${user.id}`}><Eye size={14} aria-hidden="true" />View</Link></Button>
      {!self ? <Button type="button" variant={user.status === "active" ? "destructive" : "outline"} size="sm" onClick={() => onChange(user)}>{user.status === "active" ? <UserX size={14} aria-hidden="true" /> : <UserCheck size={14} aria-hidden="true" />}{user.status === "active" ? "Suspend" : "Reactivate"}</Button> : <span className="px-2 text-[0.625rem] text-text-muted">Current admin</span>}
    </div>
  );
}

export function AdminUsersView() {
  const { admin } = useAdmin();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0);
  const [pending, setPending] = useState<AdminUser | null>(null);
  const [mutating, setMutating] = useState(false);

  const refresh = useCallback(() => { setUsers(null); setError(""); setRevision((value) => value + 1); }, []);

  useEffect(() => {
    const controller = new AbortController();
    adminUsersRequest({ page, limit: PAGE_SIZE, search, status: statusFilter || undefined, role: roleFilter || undefined }, controller.signal)
      .then((response) => { setUsers(response.data); setTotal(response.total_count); })
      .catch((reason) => { const message = requestErrorMessage(reason); if (message) setError(message); });
    return () => controller.abort();
  }, [page, revision, roleFilter, search, statusFilter]);

  function applySearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = String(new FormData(event.currentTarget).get("search") ?? "").trim();
    setUsers(null); setError(""); setPage(1);
    if (value === search) refresh();
    else setSearch(value);
  }

  async function confirmStatusChange() {
    if (!pending) return;
    const next = pending.status === "active" ? "suspended" : "active";
    setMutating(true);
    setNotice("");
    try {
      await updateAdminUserStatusRequest(pending.id, next);
      setNotice(`${pending.email} is now ${next}.`);
      setPending(null);
      refresh();
    } catch (reason) {
      setError(requestErrorMessage(reason));
      setPending(null);
    } finally {
      setMutating(false);
    }
  }

  return (
    <div>
      <AdminPageHeader eyebrow="Accounts" title="Users" description="Search and manage real InflowAPM accounts without exposing credentials or sessions." onRefresh={refresh} refreshing={users === null} />
      <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(18rem,1fr)_12rem_12rem]">
        <form onSubmit={applySearch} className="flex min-w-0 gap-2" role="search"><label htmlFor="admin-user-search" className="sr-only">Search users</label><div className="relative min-w-0 flex-1"><Search size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-text-muted" aria-hidden="true" /><input id="admin-user-search" name="search" defaultValue={search} maxLength={100} className={`${controlClass} w-full pl-9`} placeholder="Search email or name" /></div><Button type="submit" variant="secondary" size="sm">Search</Button></form>
        <label className="sr-only" htmlFor="admin-user-status">Filter by status</label><select id="admin-user-status" value={statusFilter} onChange={(event) => { setUsers(null); setError(""); setStatusFilter(event.target.value); setPage(1); }} className={controlClass}><option value="">All statuses</option><option value="active">Active</option><option value="suspended">Suspended</option></select>
        <label className="sr-only" htmlFor="admin-user-role">Filter by role</label><select id="admin-user-role" value={roleFilter} onChange={(event) => { setUsers(null); setError(""); setRoleFilter(event.target.value); setPage(1); }} className={controlClass}><option value="">All roles</option><option value="user">User</option><option value="super_admin">Super Admin</option></select>
      </div>
      {notice ? <div className="mt-4"><Notice kind="success">{notice}</Notice></div> : null}
      {error ? <AdminError message={error} retry={refresh} /> : null}
      {users === null && !error ? <AdminLoading label="Loading users…" /> : null}
      {users?.length === 0 ? <div className="mt-6"><AdminEmpty title="No users found" description="Try a different search or filter." /></div> : null}
      {users && users.length > 0 ? (
        <section className="mt-6 overflow-hidden rounded-md border border-border-subtle bg-surface" aria-label="User accounts">
          <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[56rem] border-collapse text-left type-table"><thead className="bg-surface-inset text-[0.625rem] uppercase tracking-[0.1em] text-text-muted"><tr><th className="px-4 py-3 font-medium">User</th><th className="px-4 py-3 font-medium">Role</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 text-right font-medium">Projects</th><th className="px-4 py-3 font-medium">Created</th><th className="px-4 py-3 text-right font-medium">Actions</th></tr></thead><tbody className="divide-y divide-border-subtle">{users.map((user) => <tr key={user.id} className="hover:bg-surface-hover/60"><td className="px-4 py-3"><p className="font-medium text-text-primary">{user.first_name} {user.last_name}</p><p className="mt-1 text-xs text-text-muted">{user.email}</p></td><td className="px-4 py-3 font-mono text-xs text-text-secondary">{user.role.replace("_", " ")}</td><td className="px-4 py-3"><StatusBadge status={user.status} /></td><td className="px-4 py-3 text-right font-mono text-xs">{user.project_count}</td><td className="px-4 py-3 font-mono text-[0.6875rem] text-text-muted">{formatAdminDate(user.created_at)}</td><td className="px-4 py-3"><UserActions user={user} self={admin?.id === user.id} onChange={setPending} /></td></tr>)}</tbody></table></div>
          <ul className="divide-y divide-border-subtle md:hidden">{users.map((user) => <li key={user.id} className="p-4"><div className="flex items-start justify-between gap-3"><span className="min-w-0"><span className="block truncate text-sm font-medium">{user.first_name} {user.last_name}</span><span className="mt-1 block truncate text-xs text-text-muted">{user.email}</span></span><StatusBadge status={user.status} /></div><dl className="mt-4 grid grid-cols-2 gap-3 text-xs"><div><dt className="text-text-muted">Role</dt><dd className="mt-1 font-mono">{user.role.replace("_", " ")}</dd></div><div><dt className="text-text-muted">Projects</dt><dd className="mt-1 font-mono">{user.project_count}</dd></div><div className="col-span-2"><dt className="text-text-muted">Created</dt><dd className="mt-1 font-mono text-[0.6875rem]">{formatAdminDate(user.created_at)}</dd></div></dl><div className="mt-4 border-t border-border-subtle pt-3"><UserActions user={user} self={admin?.id === user.id} onChange={setPending} /></div></li>)}</ul>
          <Pagination page={page} limit={PAGE_SIZE} total={total} onPage={(value) => { setUsers(null); setError(""); setPage(value); }} />
        </section>
      ) : null}
      <ConfirmDialog open={Boolean(pending)} title={pending?.status === "active" ? "Suspend user?" : "Reactivate user?"} description={pending?.status === "active" ? `Suspend ${pending.email}? Their authenticated requests and project telemetry ingestion will be blocked until reactivated.` : `Restore platform access for ${pending?.email ?? "this user"}?`} confirmLabel={pending?.status === "active" ? "Suspend user" : "Reactivate user"} destructive={pending?.status === "active"} busy={mutating} onClose={() => setPending(null)} onConfirm={() => void confirmStatusChange()} />
    </div>
  );
}

export function AdminUserDetailView({ id }: { id: string }) {
  const { admin } = useAdmin();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [notice, setNotice] = useState("");
  const refresh = useCallback(() => { setUser(null); setError(""); setRevision((value) => value + 1); }, []);

  useEffect(() => {
    const controller = new AbortController();
    adminUserRequest(id, controller.signal).then(setUser).catch((reason) => { const message = requestErrorMessage(reason); if (message) setError(message); });
    return () => controller.abort();
  }, [id, revision]);

  async function changeStatus() {
    if (!user) return;
    const next = user.status === "active" ? "suspended" : "active";
    setMutating(true);
    try { await updateAdminUserStatusRequest(user.id, next); setNotice(`Account is now ${next}.`); setConfirming(false); refresh(); }
    catch (reason) { setError(requestErrorMessage(reason)); setConfirming(false); }
    finally { setMutating(false); }
  }

  return (
    <div>
      <AdminPageHeader eyebrow="User detail" title={user ? `${user.first_name} ${user.last_name}` : "Account"} description="Safe account identity, authorization state, and project ownership summary." onRefresh={refresh} refreshing={!user && !error} />
      <Link href="/admin/users" className="mt-5 inline-flex text-xs text-brand-steel hover:text-brand">← Back to users</Link>
      {notice ? <div className="mt-4"><Notice kind="success">{notice}</Notice></div> : null}
      {error ? <AdminError message={error} retry={refresh} /> : null}
      {!user && !error ? <AdminLoading label="Loading user…" /> : null}
      {user ? <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]"><section className="rounded-md border border-border-subtle bg-surface"><div className="flex items-start justify-between gap-4 border-b border-border-subtle bg-surface-inset p-5"><div><h2 className="text-base font-semibold">Account profile</h2><p className="mt-1 text-xs text-text-muted">Created {formatAdminDate(user.created_at)}</p></div><StatusBadge status={user.status} /></div><dl className="grid gap-px bg-border-subtle sm:grid-cols-2"><Detail label="Email" value={user.email} /><Detail label="Role" value={user.role.replace("_", " ")} mono /><Detail label="User ID" value={user.id} mono /><Detail label="Projects" value={String(user.project_count)} mono /><Detail label="Authentication providers" value={user.auth_providers?.length ? user.auth_providers.join(", ") : "Password account"} /><Detail label="Status" value={user.status} /></dl></section><aside className="h-fit rounded-md border border-border-subtle bg-surface p-5"><div className="flex items-center gap-2"><ShieldAlert size={16} className="text-warning" aria-hidden="true" /><h2 className="text-sm font-semibold">Account control</h2></div><p className="mt-3 text-xs leading-5 text-text-muted">Suspension blocks authenticated use and telemetry ingestion for owned projects.</p>{admin?.id === user.id ? <p className="mt-5 border border-warning/25 bg-warning-muted/30 p-3 text-xs text-warning">You cannot suspend your own Super Admin account.</p> : <Button type="button" className="mt-5 w-full" variant={user.status === "active" ? "destructive" : "secondary"} onClick={() => setConfirming(true)}>{user.status === "active" ? <UserX size={15} aria-hidden="true" /> : <UserCheck size={15} aria-hidden="true" />}{user.status === "active" ? "Suspend account" : "Reactivate account"}</Button>}</aside></div> : null}
      <ConfirmDialog open={confirming} title={user?.status === "active" ? "Suspend user?" : "Reactivate user?"} description={user?.status === "active" ? "This blocks authenticated use and future telemetry ingestion for all projects owned by this user." : "This restores authenticated use and project telemetry ingestion, except for projects disabled separately."} confirmLabel={user?.status === "active" ? "Suspend user" : "Reactivate user"} destructive={user?.status === "active"} busy={mutating} onClose={() => setConfirming(false)} onConfirm={() => void changeStatus()} />
    </div>
  );
}

function Detail({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div className="min-w-0 bg-surface p-5"><dt className="type-meta text-text-muted">{label}</dt><dd className={`mt-2 break-words text-sm text-text-primary ${mono ? "font-mono text-xs" : ""}`}>{value}</dd></div>;
}
