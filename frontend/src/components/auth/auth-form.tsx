"use client";

import { AlertCircle, ArrowRight, CheckCircle2, Eye, EyeOff, LoaderCircle, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";

import { AuthAnimation } from "@/components/auth/auth-animation";
import { AuthFormSkeleton } from "@/components/auth/auth-form-skeleton";
import { useAuth } from "@/components/auth/auth-provider";
import { GoogleMark } from "@/components/icons/google-mark";
import { GitHubMark } from "@/components/icons/github-mark";
import { Button } from "@/components/ui/button";
import { ApiError, forgotPasswordRequest, googleOAuthStartUrl, resetPasswordRequest, type AuthIntent } from "@/lib/auth-api";
import {
  PASSWORD_MAX_LENGTH,
  RESET_PASSWORD_MIN_LENGTH,
  STANDARD_PASSWORD_MIN_LENGTH,
  validateAuthFields,
  type AuthFieldErrors,
} from "@/lib/auth-validation";
import { cn } from "@/lib/utils";

type Status = { kind: "error" | "success"; message: string } | null;

const fieldClass = "h-11 w-full rounded-md border border-border bg-surface-inset px-3.5 text-sm text-text-primary outline-none transition-[border-color,box-shadow] placeholder:text-text-muted/70 focus:border-brand-steel focus:ring-2 focus:ring-brand/15 aria-invalid:border-danger aria-invalid:ring-danger/15";

function FieldMessage({ id, message }: { id: string; message?: string }) {
  return message ? <p id={id} className="mt-1.5 text-xs leading-5 text-danger">{message}</p> : null;
}

function PasswordField({ id, name, label, autoComplete, error, minLength = 5, disabled = false }: { id: string; name: string; label: string; autoComplete: string; error?: string; minLength?: number; disabled?: boolean }) {
  const [visible, setVisible] = useState(false);
  const errorId = `${id}-error`;
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-text-primary">{label}</label>
      <div className="relative">
        <input id={id} name={name} type={visible ? "text" : "password"} minLength={minLength} maxLength={PASSWORD_MAX_LENGTH} autoComplete={autoComplete} required disabled={disabled} aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} className={cn(fieldClass, "pr-11")} />
        <button type="button" disabled={disabled} onClick={() => setVisible((current) => !current)} className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center rounded-r-md text-text-muted hover:text-text-primary disabled:opacity-45" aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`} aria-pressed={visible}>
          {visible ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
        </button>
      </div>
      <FieldMessage id={errorId} message={error} />
    </div>
  );
}

function OAuthOptions() {
  return (
    <div className="grid gap-3 sm:grid-cols-2" role="group" aria-label="Authentication providers">
      <a href={googleOAuthStartUrl()} className="inline-flex min-h-11 items-center justify-center gap-2.5 rounded-md border border-brand-steel/50 bg-brand-muted/55 px-3 text-xs font-semibold text-text-primary transition-[background-color,border-color,transform] hover:border-brand-steel hover:bg-brand-muted active:translate-y-px active:bg-brand-muted/75">
        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-white" aria-hidden="true"><GoogleMark className="size-4" /></span>
        Continue with Google
      </a>
      <button type="button" disabled aria-disabled="true" aria-describedby="github-provider-status" title="GitHub authentication is coming soon" className="inline-flex min-h-11 cursor-not-allowed items-center justify-center gap-2.5 rounded-md border border-border bg-surface-inset px-3 text-xs font-medium text-text-muted opacity-65 disabled:pointer-events-none">
        <GitHubMark className="size-[17px] shrink-0" />
        <span>Continue with GitHub</span>
        <span className="rounded-sm border border-border-strong bg-surface-elevated px-1.5 py-0.5 font-mono text-[0.5rem] tracking-[0.08em] uppercase">Soon</span>
      </button>
      <span id="github-provider-status" className="sr-only">GitHub authentication is unavailable and coming soon.</span>
    </div>
  );
}

const modeCopy: Record<AuthIntent, { eyebrow: string; title: string; description: string; submit: string }> = {
  login: { eyebrow: "Workspace access", title: "Welcome back", description: "Sign in to continue investigating application health.", submit: "Sign in" },
  register: { eyebrow: "Create workspace", title: "Start monitoring", description: "Create an account and continue directly to your workspace.", submit: "Create account" },
  "forgot-password": { eyebrow: "Account recovery", title: "Reset your password", description: "Enter the email associated with your InflowAPM account.", submit: "Send reset instructions" },
  "reset-password": { eyebrow: "Secure recovery", title: "Choose a new password", description: "Use 8 to 100 characters and confirm the new password.", submit: "Update password" },
};

function fieldValue(data: FormData, name: string, trim = true): string {
  const value = String(data.get(name) ?? "");
  return trim ? value.trim() : value;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

function resetErrorMessage(error: unknown): string {
  if (error instanceof ApiError && (error.status === 400 || error.status === 404)) {
    return "This password reset link is invalid or has expired.";
  }
  if (error instanceof ApiError && error.status === null) {
    return "Unable to reach InflowAPM. Check your connection and try again.";
  }
  return "The password could not be reset. Please try again.";
}

const focusIds: Record<string, string> = {
  email: "email",
  firstName: "first-name",
  lastName: "last-name",
  password: "password",
  confirmPassword: "confirm-password",
};

export function AuthForm({ mode, resetToken, resetSuccess = false }: { mode: AuthIntent; resetToken?: string; resetSuccess?: boolean }) {
  const router = useRouter();
  const { login, register, status: authStatus } = useAuth();
  const [errors, setErrors] = useState<AuthFieldErrors>({});
  const [status, setStatus] = useState<Status>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const copy = modeCopy[mode];
  const resetTokenMissing = mode === "reset-password" && !resetToken;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setStatus(null);
    const nextErrors = validateAuthFields(mode, {
      email: fieldValue(data, "email", false),
      firstName: fieldValue(data, "firstName", false),
      lastName: fieldValue(data, "lastName", false),
      password: fieldValue(data, "password", false),
      confirmPassword: fieldValue(data, "confirmPassword", false),
    });
    setErrors(nextErrors);
    const firstInvalid = Object.keys(nextErrors)[0];
    if (firstInvalid) {
      const id = focusIds[firstInvalid];
      const fieldId = firstInvalid === "firstName" || firstInvalid === "lastName" ? id : `${mode}-${id}`;
      document.getElementById(fieldId)?.focus();
      return;
    }
    if (mode === "reset-password" && !resetToken) {
      setStatus({ kind: "error", message: "This password reset link is invalid or has expired." });
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    let redirectingAfterReset = false;
    try {
      if (mode === "login") {
        await login({ email: fieldValue(data, "email"), password: fieldValue(data, "password") });
        router.replace("/dashboard");
      } else if (mode === "register") {
        await register({
          email: fieldValue(data, "email"),
          password: fieldValue(data, "password"),
          first_name: fieldValue(data, "firstName"),
          last_name: fieldValue(data, "lastName"),
        });
        router.replace("/dashboard");
      } else if (mode === "forgot-password") {
        const message = await forgotPasswordRequest(fieldValue(data, "email"));
        setStatus({ kind: "success", message });
        form.reset();
      } else {
        await resetPasswordRequest(resetToken as string, fieldValue(data, "password", false));
        form.reset();
        redirectingAfterReset = true;
        router.replace("/login?reset=success");
      }
    } catch (error) {
      setStatus({ kind: "error", message: mode === "reset-password" ? resetErrorMessage(error) : errorMessage(error) });
    } finally {
      if (!redirectingAfterReset) {
        submittingRef.current = false;
        setSubmitting(false);
      }
    }
  }

  if (mode === "login" && authStatus === "initializing") {
    return <AuthFormSkeleton mode="login" />;
  }

  return (
    <div>
      <p className="type-meta text-brand-steel">{copy.eyebrow}</p>
      <h1 className="type-page mt-4 text-text-primary">{copy.title}</h1>
      <p className="mt-3 text-sm leading-6 text-text-secondary">{copy.description}</p>

      {mode === "login" && resetSuccess ? <div role="status" aria-live="polite" className="mt-6 flex gap-3 rounded-md border border-success/25 bg-success-muted/40 p-3.5 text-xs leading-5 text-success"><CheckCircle2 size={16} className="mt-0.5 shrink-0" aria-hidden="true" /><span><strong className="font-semibold">Password updated successfully.</strong><span className="block text-text-secondary">Sign in with your new password.</span></span></div> : null}
      {resetTokenMissing ? <div role="alert" className="mt-6 flex gap-3 rounded-md border border-danger/25 bg-danger-muted/40 p-3.5 text-xs leading-5 text-danger"><AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" /><span><span className="block">This password reset link is invalid or has expired.</span><Link href="/forgot-password" className="mt-1 inline-flex font-medium text-brand-steel hover:text-brand">Request a new password reset link</Link></span></div> : null}

      {(mode === "login" || mode === "register") ? (
        <div className="mt-7"><OAuthOptions /><div className="my-6 flex items-center gap-3" aria-hidden="true"><span className="h-px flex-1 bg-border-subtle" /><span className="font-mono text-[0.625rem] text-text-muted uppercase">Email</span><span className="h-px flex-1 bg-border-subtle" /></div></div>
      ) : null}

      <form onSubmit={handleSubmit} noValidate className="mt-7 space-y-5">
        {mode === "register" ? (
          <div className="grid gap-5 sm:grid-cols-2">
            {[["firstName", "first-name", "First name", "given-name"], ["lastName", "last-name", "Last name", "family-name"]].map(([name, id, label, autoComplete]) => (
              <div key={name}><label htmlFor={id} className="mb-2 block text-sm font-medium text-text-primary">{label}</label><input id={id} name={name} type="text" minLength={5} maxLength={100} autoComplete={autoComplete} required disabled={submitting} aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? `${id}-error` : undefined} className={fieldClass} /><FieldMessage id={`${id}-error`} message={errors[name]} /></div>
            ))}
          </div>
        ) : null}

        {mode !== "reset-password" ? (
          <div><label htmlFor={`${mode}-email`} className="mb-2 block text-sm font-medium text-text-primary">Email address</label><div className="relative"><Mail size={16} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-text-muted" aria-hidden="true" /><input id={`${mode}-email`} name="email" type="email" inputMode="email" maxLength={100} autoComplete="email" required disabled={submitting} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? `${mode}-email-error` : undefined} className={cn(fieldClass, "pl-10")} placeholder="you@company.com" /></div><FieldMessage id={`${mode}-email-error`} message={errors.email} /></div>
        ) : null}

        {(mode === "login" || mode === "register" || mode === "reset-password") ? <PasswordField id={`${mode}-password`} name="password" label={mode === "reset-password" ? "New password" : "Password"} autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={mode === "reset-password" ? RESET_PASSWORD_MIN_LENGTH : STANDARD_PASSWORD_MIN_LENGTH} error={errors.password} disabled={submitting || resetTokenMissing} /> : null}
        {(mode === "register" || mode === "reset-password") ? <PasswordField id={`${mode}-confirm-password`} name="confirmPassword" label="Confirm password" autoComplete="new-password" minLength={mode === "reset-password" ? RESET_PASSWORD_MIN_LENGTH : STANDARD_PASSWORD_MIN_LENGTH} error={errors.confirmPassword} disabled={submitting || resetTokenMissing} /> : null}

        {mode === "login" ? <div className="flex justify-end"><Link href="/forgot-password" className="text-xs font-medium text-brand-steel hover:text-brand">Forgot password?</Link></div> : null}

        {status ? <div role={status.kind === "error" ? "alert" : "status"} className={cn("flex gap-3 rounded-md border p-3.5 text-xs leading-5", status.kind === "error" ? "border-danger/25 bg-danger-muted/45 text-danger" : "border-success/25 bg-success-muted/45 text-success")}>
          {status.kind === "error" ? <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" /> : <CheckCircle2 size={16} className="mt-0.5 shrink-0" aria-hidden="true" />}<span>{status.message}</span></div> : null}
        {mode === "reset-password" && status?.kind === "error" ? <Link href="/forgot-password" className="inline-flex text-xs font-medium text-brand-steel hover:text-brand">Request a new password reset link</Link> : null}

        <Button type="submit" size="lg" disabled={submitting || resetTokenMissing} aria-busy={submitting} className="w-full">
          {submitting ? (mode === "register" ? <AuthAnimation compact src="/animations/register-loading.lottie" className="size-5" /> : <LoaderCircle size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />) : null}
          {submitting ? mode === "reset-password" ? "Resetting password…" : mode === "login" ? "Signing in…" : mode === "forgot-password" ? "Sending instructions…" : "Creating account…" : copy.submit}
          {!submitting ? <ArrowRight size={15} aria-hidden="true" /> : null}
        </Button>
      </form>

      <div className="mt-7 border-t border-border-subtle pt-6 text-center text-sm text-text-secondary">
        {mode === "login" ? <>New to InflowAPM? <Link href="/register" className="font-medium text-brand-steel hover:text-brand">Create an account</Link></> : null}
        {mode === "register" ? <>Already have an account? <Link href="/login" className="font-medium text-brand-steel hover:text-brand">Sign in</Link></> : null}
        {(mode === "forgot-password" || mode === "reset-password") ? <Link href="/login" className="inline-flex items-center gap-2 font-medium text-brand-steel hover:text-brand">Return to sign in <ArrowRight size={14} aria-hidden="true" /></Link> : null}
      </div>
    </div>
  );
}
