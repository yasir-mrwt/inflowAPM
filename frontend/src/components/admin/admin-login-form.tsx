"use client";

import { AlertCircle, ArrowLeft, ArrowRight, Eye, EyeOff, LoaderCircle, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { useAdmin } from "@/components/admin/admin-provider";
import { BrandLockup } from "@/components/brand/brand-mark";
import { Button } from "@/components/ui/button";
import { AdminApiError } from "@/lib/admin-api";
import { cn } from "@/lib/utils";

const fieldClass = "h-11 w-full rounded-md border border-border bg-surface-inset px-3.5 text-sm outline-none placeholder:text-text-muted/70 focus:border-brand-steel focus:ring-2 focus:ring-brand/15 aria-invalid:border-danger";

export function AdminLoginForm({ notice }: { notice?: "password" | "denied" }) {
  const { login, status } = useAdmin();
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "authenticated") router.replace("/admin");
  }, [router, status]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const email = String(data.get("email") ?? "").trim().toLowerCase();
    const password = String(data.get("password") ?? "");
    setError("");
    if (email.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid administrator email address.");
      return;
    }
    if (password.length < 5 || password.length > 100) {
      setError("Password must be 5 to 100 characters.");
      return;
    }
    setSubmitting(true);
    try {
      await login({ email, password });
      router.replace("/admin");
    } catch (reason) {
      setError(
        reason instanceof AdminApiError && reason.status === 403
          ? "This account does not have Super Admin access."
          : reason instanceof AdminApiError && reason.status === 401
            ? "Invalid email or password."
            : reason instanceof Error
              ? reason.message
              : "Sign in could not be completed.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="relative grid min-h-svh place-items-center overflow-hidden bg-background px-4 py-10 sm:px-6">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,var(--border-subtle)_1px,transparent_1px),linear-gradient(to_bottom,var(--border-subtle)_1px,transparent_1px)] bg-[size:48px_48px] opacity-20" aria-hidden="true" />
      <section className="relative w-full max-w-md rounded-lg border border-border bg-surface p-5 sm:p-7" aria-labelledby="admin-login-title">
        <div className="flex items-center justify-between gap-4 border-b border-border-subtle pb-5">
          <BrandLockup className="size-8" priority />
          <span className="inline-flex items-center gap-2 rounded-full border border-brand/25 bg-brand-muted/40 px-2.5 py-1 font-mono text-[0.625rem] uppercase tracking-[0.1em] text-brand-steel"><ShieldCheck size={12} aria-hidden="true" />Super Admin</span>
        </div>
        <div className="mt-7">
          <p className="type-meta text-brand-steel">Restricted access</p>
          <h1 id="admin-login-title" className="type-page mt-3">Platform control</h1>
          <p className="mt-3 text-sm leading-6 text-text-secondary">Sign in with an authorized Super Admin account. There is no public administrator registration.</p>
        </div>

        {notice === "password" ? <div role="status" className="mt-5 border border-success/25 bg-success-muted/35 px-4 py-3 text-xs text-success">Password changed successfully. Sign in again with your new password.</div> : null}
        {notice === "denied" ? <div role="alert" className="mt-5 border border-warning/25 bg-warning-muted/35 px-4 py-3 text-xs text-warning">Use an account with Super Admin access.</div> : null}

        <form onSubmit={submit} noValidate className="mt-7 space-y-5">
          <div>
            <label htmlFor="admin-email" className="mb-2 block text-sm font-medium">Email address</label>
            <div className="relative"><Mail size={16} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-text-muted" aria-hidden="true" /><input id="admin-email" name="email" type="email" autoComplete="username" required maxLength={100} aria-invalid={Boolean(error)} aria-describedby={error ? "admin-login-error" : undefined} className={cn(fieldClass, "pl-10")} placeholder="admin@company.com" /></div>
          </div>
          <div>
            <label htmlFor="admin-password" className="mb-2 block text-sm font-medium">Password</label>
            <div className="relative"><LockKeyhole size={16} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-text-muted" aria-hidden="true" /><input id="admin-password" name="password" type={visible ? "text" : "password"} autoComplete="current-password" required minLength={5} maxLength={100} aria-invalid={Boolean(error)} aria-describedby={error ? "admin-login-error" : undefined} className={cn(fieldClass, "px-10")} /><button type="button" onClick={() => setVisible((value) => !value)} className="absolute inset-y-0 right-0 grid w-11 place-items-center text-text-muted hover:text-text-primary" aria-label={`${visible ? "Hide" : "Show"} password`} aria-pressed={visible}>{visible ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}</button></div>
          </div>
          {error ? <div id="admin-login-error" role="alert" className="flex gap-3 border border-danger/25 bg-danger-muted/35 p-3.5 text-xs leading-5 text-danger"><AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />{error}</div> : null}
          <Button type="submit" size="lg" className="w-full" disabled={submitting || status === "initializing"} aria-busy={submitting}>{submitting ? <LoaderCircle size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : null}{submitting ? "Verifying…" : "Sign in securely"}{!submitting ? <ArrowRight size={15} aria-hidden="true" /> : null}</Button>
        </form>
        <div className="mt-7 border-t border-border-subtle pt-5 text-center"><Link href="/" className="inline-flex items-center gap-2 text-xs font-medium text-text-secondary hover:text-text-primary"><ArrowLeft size={14} aria-hidden="true" />Back to InflowAPM</Link></div>
      </section>
    </main>
  );
}
