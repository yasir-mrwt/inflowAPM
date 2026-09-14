"use client";

import { Activity, Bug, ChevronLeft, ChevronRight, FolderKanban, Gauge, LogOut, Menu, RadioTower, Route, Settings, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { UserAvatar } from "@/components/auth/user-avatar";
import { BrandLockup, BrandMark } from "@/components/brand/brand-mark";
import { useProjects } from "@/components/projects/projects-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navigation = [
  { label: "Overview", href: "/dashboard", icon: Gauge },
  { label: "Projects", href: "/dashboard/projects", icon: FolderKanban },
  { label: "Requests / Telemetry", href: "/dashboard/requests", icon: RadioTower },
  { label: "Routes", href: "/dashboard/routes", icon: Route },
  { label: "Errors", href: "/dashboard/errors", icon: Bug },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
] as const;
const SIDEBAR_PREFERENCE_KEY = "inflowapm.dashboard.sidebar-collapsed";

function SidebarTooltip({ id, children }: { id: string; children: ReactNode }) {
  return <span id={id} role="tooltip" className="pointer-events-none absolute left-full z-30 ml-3 hidden whitespace-nowrap rounded-md border border-border bg-surface-elevated px-2.5 py-1.5 text-xs text-text-primary shadow-xl group-hover:block group-focus-visible:block lg:block lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-visible:opacity-100">{children}</span>;
}

function Account({ collapsed = false, onLogout }: { collapsed?: boolean; onLogout: () => void }) {
  const { user } = useAuth();
  if (!user) return null;

  if (collapsed) {
    return (
      <div className="border-t border-border-subtle p-2">
        <div className="flex justify-center py-2" title={`${user.first_name} ${user.last_name}`}><UserAvatar user={user} /></div>
        <button type="button" onClick={onLogout} aria-describedby="logout-tooltip" className="group relative mt-1 flex size-10 w-full items-center justify-center rounded-md text-text-secondary hover:bg-surface-hover hover:text-text-primary" aria-label="Sign out">
          <LogOut size={16} aria-hidden="true" /><SidebarTooltip id="logout-tooltip">Sign out</SidebarTooltip>
        </button>
      </div>
    );
  }

  return (
    <div className="border-t border-border-subtle p-3">
      <div className="flex min-w-0 items-center gap-3 px-2 py-2">
        <UserAvatar user={user} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-text-primary">{user.first_name} {user.last_name}</span>
          <span className="block truncate text-xs text-text-muted">{user.email}</span>
        </span>
      </div>
      <button type="button" onClick={onLogout} className="mt-1 flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary">
        <LogOut size={16} aria-hidden="true" /> Sign out
      </button>
    </div>
  );
}

function Navigation({ collapsed = false, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Application navigation" className={cn("flex-1 space-y-1 py-5", collapsed ? "px-2" : "px-3")}>
      <p className={cn("type-meta mb-3 text-text-muted", collapsed ? "sr-only" : "px-3")}>Workspace</p>
      {navigation.map(({ label, href, icon: Icon }) => {
        const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
        return (
          <Link key={href} href={href} onClick={onNavigate} aria-current={active ? "page" : undefined} aria-describedby={collapsed ? `nav-tooltip-${label.replaceAll(" ", "-").toLowerCase()}` : undefined} className={cn("group relative flex min-h-10 items-center rounded-md border-l-2 text-sm transition-colors", collapsed ? "justify-center px-0" : "gap-3 px-3", active ? "border-brand bg-brand-muted/65 text-text-primary" : "border-transparent text-text-secondary hover:bg-surface-hover hover:text-text-primary")}>
            <Icon size={16} className={active ? "text-brand" : "text-text-muted"} aria-hidden="true" />
            <span className={collapsed ? "sr-only" : undefined}>{label}</span>
            {collapsed ? <SidebarTooltip id={`nav-tooltip-${label.replaceAll(" ", "-").toLowerCase()}`}>{label}</SidebarTooltip> : null}
          </Link>
        );
      })}
    </nav>
  );
}

export function DashboardShell({ children }: { children: ReactNode }) {
  const { logout } = useAuth();
  const { projects, selectedProject, selectProject, status: projectsStatus } = useProjects();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const restoreMenuFocusRef = useRef(false);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        setSidebarCollapsed(window.localStorage.getItem(SIDEBAR_PREFERENCE_KEY) === "true");
      } catch {
        setSidebarCollapsed(false);
      }
    });
  }, []);

  function toggleSidebar() {
    setSidebarCollapsed((current) => {
      const next = !current;
      try { window.localStorage.setItem(SIDEBAR_PREFERENCE_KEY, String(next)); } catch { /* preference storage is optional */ }
      return next;
    });
  }

  function closeMobileNavigation() {
    restoreMenuFocusRef.current = true;
    setMobileOpen(false);
  }

  useEffect(() => {
    if (!mobileOpen && restoreMenuFocusRef.current) {
      restoreMenuFocusRef.current = false;
      menuButtonRef.current?.focus();
    }
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMobileNavigation();
      if (event.key !== "Tab") return;
      const controls = drawerRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])');
      if (!controls?.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", handleKeyboard);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", handleKeyboard); };
  }, [mobileOpen]);

  async function handleLogout() {
    setLoggingOut(true);
    await logout().catch(() => undefined);
    router.replace("/login");
  }

  return (
    <div className={cn("min-h-svh bg-background text-text-primary lg:grid", sidebarCollapsed ? "lg:grid-cols-[5rem_minmax(0,1fr)]" : "lg:grid-cols-[17rem_minmax(0,1fr)]")}>
      <aside id="desktop-dashboard-sidebar" className={cn("fixed inset-y-0 left-0 z-20 hidden flex-col border-r border-border-subtle bg-surface-inset lg:flex", sidebarCollapsed ? "w-20" : "w-[17rem]")}>
        <div className={cn("flex h-16 shrink-0 items-center border-b border-border-subtle", sidebarCollapsed ? "justify-between px-2" : "justify-between px-4")}>
          <Link href="/dashboard" aria-label="InflowAPM dashboard">{sidebarCollapsed ? <BrandMark className="size-8" priority /> : <BrandLockup className="size-8" priority />}</Link>
          <Button type="button" variant="ghost" size="icon" className="size-8" onClick={toggleSidebar} aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!sidebarCollapsed} aria-controls="desktop-dashboard-sidebar" title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}>
            {sidebarCollapsed ? <ChevronRight size={16} aria-hidden="true" /> : <ChevronLeft size={16} aria-hidden="true" />}
          </Button>
        </div>
        <Navigation collapsed={sidebarCollapsed} />
        <Account collapsed={sidebarCollapsed} onLogout={handleLogout} />
      </aside>

      <div className="min-w-0 lg:col-start-2">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border-subtle bg-background/95 px-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Button ref={menuButtonRef} type="button" variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation" aria-expanded={mobileOpen} aria-controls="mobile-dashboard-navigation"><Menu size={19} aria-hidden="true" /></Button>
            <div className="lg:hidden"><BrandLockup className="size-7" /></div>
            <div className="hidden items-center gap-2 font-mono text-[0.6875rem] text-text-muted sm:flex"><Activity size={13} className="text-success" aria-hidden="true" /> APPLICATION WORKSPACE</div>
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <label htmlFor="active-project" className="sr-only">Active project</label>
            <select id="active-project" value={selectedProject?.id ?? ""} onChange={(event) => selectProject(event.target.value)} disabled={projectsStatus === "loading" || projects.length === 0} className="h-9 max-w-[9.5rem] truncate rounded-md border border-border bg-surface px-2.5 font-mono text-[0.6875rem] text-text-secondary outline-none focus:border-brand-steel sm:max-w-[14rem]">
              {projects.length === 0 ? <option value="">{projectsStatus === "loading" ? "Loading projects…" : "No projects"}</option> : projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[92rem] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">{children}</main>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Application navigation" id="mobile-dashboard-navigation">
          <button type="button" className="absolute inset-0 bg-black/70" onClick={closeMobileNavigation} aria-label="Close navigation overlay" tabIndex={-1} />
          <aside ref={drawerRef} className="relative flex h-full w-[min(19rem,88vw)] flex-col border-r border-border bg-surface-inset shadow-2xl">
            <div className="flex h-16 items-center justify-between border-b border-border-subtle px-4"><BrandLockup className="size-8" /><Button type="button" variant="ghost" size="icon" autoFocus onClick={closeMobileNavigation} aria-label="Close navigation"><X size={19} aria-hidden="true" /></Button></div>
            <Navigation onNavigate={closeMobileNavigation} />
            <Account onLogout={handleLogout} />
          </aside>
        </div>
      ) : null}

      {loggingOut ? <div className="fixed inset-x-0 bottom-4 z-[60] mx-auto w-fit rounded-md border border-border bg-surface-elevated px-4 py-2 text-xs text-text-secondary" role="status">Signing out…</div> : null}
    </div>
  );
}
