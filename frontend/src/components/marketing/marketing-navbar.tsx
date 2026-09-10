"use client";

import {
  Activity,
  ArrowLeftRight,
  ArrowUpRight,
  Blocks,
  BookOpen,
  ChevronDown,
  CircleAlert,
  Gauge,
  Map,
  Menu,
  RadioTower,
  Route,
  Waves,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type RefObject } from "react";

import { BrandLockup } from "@/components/brand/brand-mark";
import { GitHubMark } from "@/components/icons/github-mark";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const githubUrl = "https://github.com/yasir-mrwt/inflowAPM";

type NavigationItem = {
  label: string;
  description: string;
  href: string;
  icon: LucideIcon | typeof GitHubMark;
  external?: boolean;
};

type NavigationGroup = {
  label: string;
  items: NavigationItem[];
};

const productGroups: NavigationGroup[] = [
  {
    label: "Observe",
    items: [
      {
        label: "Overview",
        description: "A clear view of application health",
        href: "/#product-overview",
        icon: Activity,
      },
      {
        label: "Requests",
        description: "Follow traffic, volume, and behavior",
        href: "/#product-overview",
        icon: ArrowLeftRight,
      },
      {
        label: "Errors",
        description: "Find failed requests and regressions",
        href: "/#incident-investigation",
        icon: CircleAlert,
      },
      {
        label: "Route performance",
        description: "Compare latency route by route",
        href: "/#route-performance",
        icon: Route,
      },
    ],
  },
  {
    label: "Understand",
    items: [
      {
        label: "P95 latency",
        description: "See the slow experience averages hide",
        href: "/#incident-investigation",
        icon: Gauge,
      },
      {
        label: "Throughput",
        description: "Measure request flow over time",
        href: "/#product-overview",
        icon: Waves,
      },
      {
        label: "Telemetry events",
        description: "Connect signals to application context",
        href: "/#how-it-works",
        icon: RadioTower,
      },
    ],
  },
];

const developerGroups: NavigationGroup[] = [
  {
    label: "Build with InflowAPM",
    items: [
      {
        label: "Documentation",
        description: "Setup, concepts, and API reference",
        href: `${githubUrl}#readme`,
        icon: BookOpen,
        external: true,
      },
      {
        label: "Architecture",
        description: "Understand the telemetry pipeline",
        href: "/#how-it-works",
        icon: Blocks,
      },
      {
        label: "GitHub",
        description: "Read the source and contribute",
        href: githubUrl,
        icon: GitHubMark,
        external: true,
      },
      {
        label: "Roadmap",
        description: "See what is implemented and planned",
        href: `${githubUrl}#roadmap`,
        icon: Map,
        external: true,
      },
    ],
  },
];

type MenuName = "product" | "developers";

function DropdownLink({
  item,
  onNavigate,
}: {
  item: NavigationItem;
  onNavigate: () => void;
}) {
  const Icon = item.icon;
  const content = (
    <>
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border border-border-subtle bg-background text-text-muted transition-colors group-hover:border-border group-hover:text-brand-steel">
        <Icon size={15} strokeWidth={1.8} aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 text-sm font-medium text-text-primary">
          {item.label}
          {item.external ? (
            <ArrowUpRight
              size={12}
              className="text-text-muted"
              aria-hidden="true"
            />
          ) : null}
        </span>
        <span className="mt-0.5 block text-xs leading-5 text-text-muted">
          {item.description}
        </span>
      </span>
    </>
  );

  const className =
    "group flex gap-3.5 rounded-md px-3 py-3 transition-colors hover:bg-surface-hover focus-visible:bg-surface-hover";

  if (item.external) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noreferrer"
        className={className}
        onClick={onNavigate}
      >
        {content}
      </a>
    );
  }

  return (
    <Link
      href={item.href}
      prefetch={false}
      className={className}
      onClick={onNavigate}
    >
      {content}
    </Link>
  );
}

function DesktopDropdown({
  name,
  label,
  groups,
  openMenu,
  onToggle,
  onHoverOpen,
  onHoverCancel,
  onHoverClose,
  onClose,
}: {
  name: MenuName;
  label: string;
  groups: NavigationGroup[];
  openMenu: MenuName | null;
  onToggle: (name: MenuName, trigger: HTMLButtonElement) => void;
  onHoverOpen: (name: MenuName, trigger: HTMLButtonElement) => void;
  onHoverCancel: () => void;
  onHoverClose: () => void;
  onClose: () => void;
}) {
  const isOpen = openMenu === name;
  const panelId = `${name}-navigation`;

  return (
    <div
      className="relative"
      onMouseEnter={onHoverCancel}
      onMouseLeave={onHoverClose}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          onClose();
        }
      }}
    >
      <button
        id={`${panelId}-trigger`}
        type="button"
        className="type-nav inline-flex h-9 items-center gap-1 rounded-md px-2.5 text-text-secondary transition-colors hover:bg-surface/75 hover:text-text-primary"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={(event) => onToggle(name, event.currentTarget)}
        onMouseEnter={(event) => onHoverOpen(name, event.currentTarget)}
        onKeyDown={(event) => {
          if (event.key !== "ArrowDown") return;
          event.preventDefault();
          if (!isOpen) onToggle(name, event.currentTarget);
          window.requestAnimationFrame(() => {
            document
              .getElementById(panelId)
              ?.querySelector<HTMLElement>("a[href]")
              ?.focus();
          });
        }}
      >
        {label}
        <ChevronDown
          size={14}
          strokeWidth={1.8}
          aria-hidden="true"
          className={cn(
            "transition-transform duration-150",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {isOpen ? (
        <div
          id={panelId}
          aria-labelledby={`${panelId}-trigger`}
          className={cn(
            "absolute top-[calc(100%+0.75rem)] left-0 z-50 border border-border bg-surface-elevated p-2 shadow-[0_22px_70px_rgba(0,0,0,0.42)] motion-safe:animate-[menu-in_160ms_ease-out]",
            groups.length > 1
              ? "w-[38rem] rounded-lg"
              : "w-[20rem] rounded-lg",
          )}
        >
          <div
            className={cn(
              "grid gap-2",
              groups.length > 1 && "grid-cols-2",
            )}
          >
            {groups.map((group) => (
              <div key={group.label} className="p-2">
                <p className="type-meta mb-2 px-2 text-text-muted">
                  {group.label}
                </p>
                <div>
                  {group.items.map((item) => (
                    <DropdownLink
                      key={item.label}
                      item={item}
                      onNavigate={onClose}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MobileNavigation({
  onNavigate,
  panelRef,
}: {
  onNavigate: () => void;
  panelRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      ref={panelRef}
      id="mobile-navigation"
      role="dialog"
      aria-modal="true"
      aria-label="Navigation menu"
      className="fixed inset-x-0 top-16 bottom-0 z-40 w-full overflow-y-auto overscroll-contain border-t border-border-subtle bg-background px-[var(--page-gutter)] pb-8 motion-safe:animate-[menu-in_160ms_ease-out] min-[1080px]:hidden"
    >
      <nav
        className="mx-auto flex w-full max-w-[var(--content-width)] flex-col py-5"
        aria-label="Mobile navigation"
      >
        <div className="mb-6 grid grid-cols-2 gap-3 border-b border-border-subtle pb-6">
          <Link
            href="/#how-it-works"
            className="type-nav rounded-md border border-border-subtle bg-surface px-3 py-3 text-center text-text-secondary transition-colors hover:border-border hover:text-text-primary"
            onClick={onNavigate}
          >
            How it works
          </Link>
          <Link
            href="/#how-it-works"
            className="type-nav rounded-md border border-border-subtle bg-surface px-3 py-3 text-center text-text-secondary transition-colors hover:border-border hover:text-text-primary"
            onClick={onNavigate}
          >
            Architecture
          </Link>
        </div>

        <div className="grid gap-7 sm:grid-cols-2">
          {productGroups.map((group) => (
            <div key={group.label}>
              <p className="type-meta mb-2 px-2 text-text-muted">
                Product · {group.label}
              </p>
              {group.items.map((item) => (
                <DropdownLink
                  key={item.label}
                  item={item}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          ))}
          <div>
            <p className="type-meta mb-2 px-2 text-text-muted">Developers</p>
            {developerGroups[0].items.map((item) => (
              <DropdownLink
                key={item.label}
                item={item}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>

        <div className="mt-7 grid gap-3 border-t border-border-subtle pt-6 sm:grid-cols-2">
          <Button variant="outline" asChild>
            <Link href="/login" prefetch={false} onClick={onNavigate}>
              Log in
            </Link>
          </Button>
          <Button asChild>
            <Link href="/register" prefetch={false} onClick={onNavigate}>
              Start monitoring
            </Link>
          </Button>
        </div>
      </nav>
    </div>
  );
}

export function MarketingNavbar() {
  const [openMenu, setOpenMenu] = useState<MenuName | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const mobileTriggerRef = useRef<HTMLButtonElement>(null);
  const mobilePanelRef = useRef<HTMLDivElement>(null);
  const lastDropdownTriggerRef = useRef<HTMLButtonElement | null>(null);
  const hoverCloseTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 12);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 1080px)");
    const handleBreakpointChange = (event: MediaQueryListEvent) => {
      if (event.matches) setMobileOpen(false);
    };

    desktopQuery.addEventListener("change", handleBreakpointChange);
    return () => desktopQuery.removeEventListener("change", handleBreakpointChange);
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (
        openMenu &&
        headerRef.current &&
        !headerRef.current.contains(event.target as Node)
      ) {
        setOpenMenu(null);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Tab" && mobileOpen) {
        const panelFocusables = Array.from(
          mobilePanelRef.current?.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ) ?? [],
        );
        const focusables = mobileTriggerRef.current
          ? [mobileTriggerRef.current, ...panelFocusables]
          : panelFocusables;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }

      if (event.key !== "Escape") return;

      if (mobileOpen) {
        setMobileOpen(false);
        mobileTriggerRef.current?.focus();
      } else if (openMenu) {
        setOpenMenu(null);
        lastDropdownTriggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileOpen, openMenu]);

  useEffect(() => {
    if (!mobileOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusFrame = window.requestAnimationFrame(() => {
      mobilePanelRef.current?.querySelector<HTMLElement>("a[href]")?.focus();
    });

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  useEffect(
    () => () => {
      if (hoverCloseTimerRef.current !== null) {
        window.clearTimeout(hoverCloseTimerRef.current);
      }
    },
    [],
  );

  function cancelDropdownClose() {
    if (hoverCloseTimerRef.current === null) return;
    window.clearTimeout(hoverCloseTimerRef.current);
    hoverCloseTimerRef.current = null;
  }

  function openDropdown(name: MenuName, trigger: HTMLButtonElement) {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      return;
    }
    cancelDropdownClose();
    lastDropdownTriggerRef.current = trigger;
    setOpenMenu(name);
  }

  function scheduleDropdownClose() {
    cancelDropdownClose();
    hoverCloseTimerRef.current = window.setTimeout(() => {
      setOpenMenu(null);
      hoverCloseTimerRef.current = null;
    }, 140);
  }

  function toggleDropdown(name: MenuName, trigger: HTMLButtonElement) {
    cancelDropdownClose();
    lastDropdownTriggerRef.current = trigger;
    setOpenMenu((current) => (current === name ? null : name));
  }

  function toggleMobile() {
    setOpenMenu(null);
    setMobileOpen((current) => !current);
  }

  function closeNavigation() {
    cancelDropdownClose();
    setOpenMenu(null);
    setMobileOpen(false);
  }

  return (
    <>
      <header
        ref={headerRef}
        className={cn(
          "fixed inset-x-0 top-0 z-50 h-16 border-b border-transparent transition-[background-color,border-color,box-shadow] duration-200",
          scrolled || mobileOpen
            ? "border-border-subtle bg-background/90 shadow-[0_10px_35px_rgba(0,0,0,0.24)] backdrop-blur-xl"
            : "bg-transparent",
        )}
      >
        <div className="mx-auto grid h-full w-full max-w-[var(--content-width)] grid-cols-[1fr_auto] items-center gap-4 px-[var(--page-gutter)] min-[1080px]:grid-cols-[1fr_auto_1fr] min-[1080px]:gap-5">
          <Link
            href="/"
            aria-label="InflowAPM home"
            className="inline-flex h-10 items-center justify-self-start rounded-md leading-none"
            onClick={closeNavigation}
          >
            <BrandLockup className="size-9" priority />
          </Link>

          <nav
            className="hidden items-center gap-1 justify-self-center min-[1080px]:flex"
            aria-label="Primary navigation"
          >
            <DesktopDropdown
              name="product"
              label="Product"
              groups={productGroups}
              openMenu={openMenu}
              onToggle={toggleDropdown}
              onHoverOpen={openDropdown}
              onHoverCancel={cancelDropdownClose}
              onHoverClose={scheduleDropdownClose}
              onClose={closeNavigation}
            />
            <Link
              href="/#how-it-works"
              className="type-nav rounded-md px-2.5 py-2 text-text-secondary transition-colors hover:bg-surface/75 hover:text-text-primary"
              onClick={closeNavigation}
            >
              How it works
            </Link>
            <Link
              href="/#how-it-works"
              className="type-nav rounded-md px-2.5 py-2 text-text-secondary transition-colors hover:bg-surface/75 hover:text-text-primary"
              onClick={closeNavigation}
            >
              Architecture
            </Link>
            <DesktopDropdown
              name="developers"
              label="Developers"
              groups={developerGroups}
              openMenu={openMenu}
              onToggle={toggleDropdown}
              onHoverOpen={openDropdown}
              onHoverCancel={cancelDropdownClose}
              onHoverClose={scheduleDropdownClose}
              onClose={closeNavigation}
            />
          </nav>

          <div className="hidden items-center gap-1.5 justify-self-end min-[1080px]:flex">
            <a
              href={githubUrl}
              target="_blank"
              rel="noreferrer"
              className="type-nav inline-flex h-9 items-center gap-2 rounded-md px-2.5 text-text-secondary transition-colors hover:bg-surface/75 hover:text-text-primary"
            >
              <GitHubMark className="size-[15px]" />
              GitHub
            </a>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login" prefetch={false}>
                Log in
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/register" prefetch={false}>
                Start monitoring
              </Link>
            </Button>
          </div>

          <button
            ref={mobileTriggerRef}
            type="button"
            className="inline-flex size-10 items-center justify-center justify-self-end rounded-md border border-border-subtle bg-surface/70 text-text-secondary transition-colors hover:border-border hover:text-text-primary min-[1080px]:hidden"
            aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
            onClick={toggleMobile}
          >
            {mobileOpen ? (
              <X size={19} aria-hidden="true" />
            ) : (
              <Menu size={19} aria-hidden="true" />
            )}
          </button>
        </div>
      </header>

      {mobileOpen ? (
        <MobileNavigation
          onNavigate={closeNavigation}
          panelRef={mobilePanelRef}
        />
      ) : null}
    </>
  );
}
