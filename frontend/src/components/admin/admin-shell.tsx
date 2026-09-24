"use client";

import {
  Activity,
  ChevronLeft,
  ChevronRight,
  FileClock,
  FolderKanban,
  Gauge,
  Home,
  LogOut,
  Menu,
  ServerCog,
  Settings,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { useAdmin } from "@/components/admin/admin-provider";
import { UserAvatar } from "@/components/auth/user-avatar";
import { BrandLockup, BrandMark } from "@/components/brand/brand-mark";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navigation = [
  { label: "Overview", href: "/admin", icon: Gauge },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Projects", href: "/admin/projects", icon: FolderKanban },
  { label: "System", href: "/admin/system", icon: ServerCog },
  { label: "Audit Logs", href: "/admin/logs", icon: FileClock },
  { label: "Settings", href: "/admin/settings", icon: Settings },
] as const;
const SIDEBAR_KEY = "inflowapm.admin.sidebar-collapsed";

function Tooltip({ id, children }: { id: string; children: ReactNode }) {
  return <span id={id} role="tooltip" className="pointer-events-none absolute left-full z-40 ml-3 hidden whitespace-nowrap rounded-md border border-border bg-surface-elevated px-2.5 py-1.5 text-xs text-text-primary shadow-xl group-hover:block group-focus-visible:block lg:block lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-visible:opacity-100">{children}</span>;
}

function AdminNavigation({ collapsed = false, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Super Admin navigation" className={cn("flex-1 space-y-1 py-5", collapsed ? "px-2" : "px-3")}>
      <p className={cn("type-meta mb-3 text-text-muted", collapsed ? "sr-only" : "px-3")}>Platform</p>
      {navigation.map(({ label, href, icon: Icon }) => {
        const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
        const tooltipId = `admin-nav-${label.replaceAll(" ", "-").toLowerCase()}`;
        return (
          <Link key={href} href={href} onClick={onNavigate} aria-current={active ? "page" : undefined} aria-describedby={collapsed ? tooltipId : undefined} className={cn("group relative flex min-h-10 items-center rounded-md border-l-2 text-sm transition-colors", collapsed ? "justify-center px-0" : "gap-3 px-3", active ? "border-brand bg-brand-muted/65 text-text-primary" : "border-transparent text-text-secondary hover:bg-surface-hover hover:text-text-primary")}>
            <Icon size={16} className={active ? "text-brand" : "text-text-muted"} aria-hidden="true" />
            <span className={collapsed ? "sr-only" : undefined}>{label}</span>
            {collapsed ? <Tooltip id={tooltipId}>{label}</Tooltip> : null}
          </Link>
        );
      })}
    </nav>
  );
}

function AdminAccount({ collapsed, onLogout }: { collapsed: boolean; onLogout: () => void }) {
  const { admin } = useAdmin();
  if (!admin) return null;
  if (collapsed) {
    return (
      <div className="border-t border-border-subtle p-2">
        <div className="flex justify-center py-2"><UserAvatar user={admin} /></div>
        <Link href="/" aria-describedby="admin-home-tip" className="group relative flex size-10 w-full items-center justify-center rounded-md text-text-secondary hover:bg-surface-hover hover:text-text-primary" aria-label="Back to product"><Home size={16} aria-hidden="true" /><Tooltip id="admin-home-tip">Back to product</Tooltip></Link>
        <button type="button" onClick={onLogout} aria-describedby="admin-logout-tip" className="group relative mt-1 flex size-10 w-full items-center justify-center rounded-md text-text-secondary hover:bg-surface-hover hover:text-text-primary" aria-label="Sign out"><LogOut size={16} aria-hidden="true" /><Tooltip id="admin-logout-tip">Sign out</Tooltip></button>
      </div>
    );
  }
  return (
    <div className="border-t border-border-subtle p-3">
      <div className="flex min-w-0 items-center gap-3 px-2 py-2">
        <UserAvatar user={admin} />
        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{admin.first_name} {admin.last_name}</span><span className="block truncate text-xs text-text-muted">{admin.email}</span></span>
      </div>
      <Link href="/" className="mt-1 flex h-10 items-center gap-3 rounded-md px-3 text-sm text-text-secondary hover:bg-surface-hover hover:text-text-primary"><Home size={16} aria-hidden="true" />Back to product</Link>
      <button type="button" onClick={onLogout} className="mt-1 flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm text-text-secondary hover:bg-surface-hover hover:text-text-primary"><LogOut size={16} aria-hidden="true" />Sign out</button>
    </div>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const { logout } = useAdmin();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const menuRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    queueMicrotask(() => {
      try { setCollapsed(window.localStorage.getItem(SIDEBAR_KEY) === "true"); } catch { /* optional preference */ }
    });
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
      if (event.key !== "Tab") return;
      const controls = drawerRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])');
      if (!controls?.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", keyboard);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", keyboard); };
  }, [mobileOpen]);

  function toggleCollapsed() {
    setCollapsed((value) => {
      const next = !value;
      try { window.localStorage.setItem(SIDEBAR_KEY, String(next)); } catch { /* optional preference */ }
      return next;
    });
  }

  async function handleLogout() {
    setLoggingOut(true);
    await logout().catch(() => undefined);
    router.replace("/admin/login");
  }

  return (
    <div className={cn("min-h-svh bg-background text-text-primary lg:grid", collapsed ? "lg:grid-cols-[5rem_minmax(0,1fr)]" : "lg:grid-cols-[17rem_minmax(0,1fr)]")}>
      <aside id="admin-desktop-sidebar" className={cn("fixed inset-y-0 left-0 z-20 hidden flex-col border-r border-border-subtle bg-surface-inset lg:flex", collapsed ? "w-20" : "w-[17rem]")}>
        <div className={cn("flex h-16 items-center justify-between border-b border-border-subtle", collapsed ? "px-2" : "px-4")}>
          <Link href="/admin" aria-label="InflowAPM Super Admin">{collapsed ? <BrandMark className="size-8" priority /> : <BrandLockup className="size-8" priority />}</Link>
          <Button type="button" variant="ghost" size="icon" className="size-8" onClick={toggleCollapsed} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!collapsed} aria-controls="admin-desktop-sidebar">{collapsed ? <ChevronRight size={16} aria-hidden="true" /> : <ChevronLeft size={16} aria-hidden="true" />}</Button>
        </div>
        {!collapsed ? <div className="mx-4 mt-4 flex items-center gap-2 rounded-md border border-brand/20 bg-brand-muted/35 px-3 py-2 font-mono text-[0.625rem] uppercase tracking-[0.12em] text-brand-steel"><ShieldCheck size={13} aria-hidden="true" />Super Admin</div> : null}
        <AdminNavigation collapsed={collapsed} />
        <AdminAccount collapsed={collapsed} onLogout={handleLogout} />
      </aside>

      <div className="min-w-0 lg:col-start-2">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border-subtle bg-background/95 px-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Button ref={menuRef} type="button" variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open admin navigation" aria-expanded={mobileOpen} aria-controls="admin-mobile-navigation"><Menu size={19} aria-hidden="true" /></Button>
            <div className="lg:hidden"><BrandLockup className="size-7" /></div>
            <div className="hidden items-center gap-2 font-mono text-[0.6875rem] text-text-muted sm:flex"><Activity size={13} className="text-brand" aria-hidden="true" />PLATFORM CONTROL</div>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand-muted/30 px-2.5 py-1 font-mono text-[0.625rem] uppercase tracking-[0.08em] text-brand-steel"><ShieldCheck size={12} aria-hidden="true" />Super Admin</span>
        </header>
        <main className="mx-auto w-full max-w-[92rem] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">{children}</main>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Super Admin navigation" id="admin-mobile-navigation">
          <button type="button" className="absolute inset-0 bg-black/75" onClick={() => { setMobileOpen(false); menuRef.current?.focus(); }} aria-label="Close navigation overlay" tabIndex={-1} />
          <aside ref={drawerRef} className="relative flex h-full w-[min(19rem,88vw)] flex-col border-r border-border bg-surface-inset">
            <div className="flex h-16 items-center justify-between border-b border-border-subtle px-4"><BrandLockup className="size-8" /><Button type="button" variant="ghost" size="icon" autoFocus onClick={() => { setMobileOpen(false); menuRef.current?.focus(); }} aria-label="Close navigation"><X size={19} aria-hidden="true" /></Button></div>
            <div className="mx-4 mt-4 flex items-center gap-2 rounded-md border border-brand/20 bg-brand-muted/35 px-3 py-2 font-mono text-[0.625rem] uppercase tracking-[0.12em] text-brand-steel"><ShieldCheck size={13} aria-hidden="true" />Super Admin</div>
            <AdminNavigation onNavigate={() => setMobileOpen(false)} />
            <AdminAccount collapsed={false} onLogout={handleLogout} />
          </aside>
        </div>
      ) : null}
      {loggingOut ? <div className="fixed inset-x-0 bottom-4 z-[90] mx-auto w-fit rounded-md border border-border bg-surface-elevated px-4 py-2 text-xs text-text-secondary" role="status">Signing out…</div> : null}
    </div>
  );
}
