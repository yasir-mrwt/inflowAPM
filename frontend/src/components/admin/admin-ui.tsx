"use client";

import {
  AlertTriangle,
  Inbox,
  LoaderCircle,
  RefreshCw,
  X,
} from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  refreshing,
  onRefresh,
}: {
  eyebrow: string;
  title: string;
  description: string;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  return (
    <header className="flex flex-col gap-4 border-b border-border-subtle pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="type-meta text-brand-steel">{eyebrow}</p>
        <h1 className="type-page mt-2">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
          {description}
        </p>
      </div>
      {onRefresh ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={refreshing}
          aria-busy={refreshing}
        >
          <RefreshCw
            size={14}
            className={refreshing ? "animate-spin motion-reduce:animate-none" : ""}
            aria-hidden="true"
          />
          Refresh
        </Button>
      ) : null}
    </header>
  );
}

export function AdminLoading({ label = "Loading data…" }: { label?: string }) {
  return (
    <div className="flex min-h-56 items-center justify-center gap-3 text-sm text-text-muted" role="status" aria-live="polite">
      <LoaderCircle size={17} className="animate-spin text-brand motion-reduce:animate-none" aria-hidden="true" />
      {label}
    </div>
  );
}

export function AdminError({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div role="alert" className="mt-6 flex flex-col gap-4 border border-danger/25 bg-danger-muted/30 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-3 text-sm text-danger">
        <AlertTriangle size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
        <span>{message}</span>
      </div>
      {retry ? <Button type="button" variant="outline" size="sm" onClick={retry}>Try again</Button> : null}
    </div>
  );
}

export function AdminEmpty({ title, description }: { title: string; description: string }) {
  return (
    <div className="border border-border-subtle bg-surface-inset px-5 py-12 text-center">
      <Inbox size={21} className="mx-auto text-text-muted" aria-hidden="true" />
      <h2 className="mt-4 text-sm font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-lg text-xs leading-5 text-text-muted">{description}</p>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const tone = ["active", "up", "operational", "configured", "enabled"].includes(normalized)
    ? "border-success/30 bg-success-muted/50 text-success"
    : ["disabled", "suspended", "down", "unavailable"].includes(normalized)
      ? "border-danger/30 bg-danger-muted/45 text-danger"
      : "border-warning/30 bg-warning-muted/45 text-warning";
  const label = normalized === "up" ? "Operational" : normalized === "down" ? "Unavailable" : status.replaceAll("_", " ");
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-1 font-mono text-[0.625rem] font-medium uppercase", tone)}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {label}
    </span>
  );
}

export function Pagination({
  page,
  limit,
  total,
  onPage,
}: {
  page: number;
  limit: number;
  total: number;
  onPage: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / limit));
  return (
    <div className="flex flex-col gap-3 border-t border-border-subtle px-4 py-3 text-xs text-text-muted sm:flex-row sm:items-center sm:justify-between">
      <span>{total.toLocaleString()} total · Page {page} of {pages}</span>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</Button>
        <Button type="button" variant="outline" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</Button>
      </div>
    </div>
  );
}

export function Notice({ kind, children }: { kind: "success" | "error"; children: ReactNode }) {
  return (
    <div role={kind === "error" ? "alert" : "status"} className={cn("border px-4 py-3 text-xs", kind === "success" ? "border-success/25 bg-success-muted/35 text-success" : "border-danger/25 bg-danger-muted/35 text-danger")}>
      {children}
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  destructive = false,
  busy = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    confirmRef.current?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
      if (event.key !== "Tab") return;
      const controls = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      );
      if (!controls?.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKey);
      restoreFocusRef.current?.focus();
    };
  }, [busy, onClose, open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center p-4" role="presentation">
      <button className="absolute inset-0 bg-black/75" onClick={onClose} disabled={busy} aria-label="Close confirmation" />
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="confirmation-title" aria-describedby="confirmation-description" className="relative w-full max-w-md rounded-md border border-border bg-surface-elevated p-5">
        <button type="button" onClick={onClose} disabled={busy} className="absolute top-3 right-3 grid size-9 place-items-center rounded-md text-text-muted hover:bg-surface-hover hover:text-text-primary" aria-label="Close"><X size={16} aria-hidden="true" /></button>
        <h2 id="confirmation-title" className="pr-10 text-base font-semibold">{title}</h2>
        <p id="confirmation-description" className="mt-3 text-sm leading-6 text-text-secondary">{description}</p>
        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button ref={confirmRef} type="button" variant={destructive ? "destructive" : "primary"} onClick={onConfirm} disabled={busy} aria-busy={busy}>
            {busy ? <LoaderCircle size={15} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : null}
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function formatAdminDate(value?: string | null): string {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function requestErrorMessage(error: unknown): string {
  if (error instanceof DOMException && error.name === "AbortError") return "";
  return error instanceof Error ? error.message : "The request could not be completed.";
}
