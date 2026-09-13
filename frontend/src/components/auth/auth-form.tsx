"use client";

import { AlertCircle, ArrowRight, CheckCircle2, Eye, EyeOff, LoaderCircle, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { AuthAnimation } from "@/components/auth/auth-animation";
import { useAuth } from "@/components/auth/auth-provider";
import { GitHubMark } from "@/components/icons/github-mark";
import { Button } from "@/components/ui/button";
import { forgotPasswordRequest, googleOAuthStartUrl, resetPasswordRequest, type AuthIntent } from "@/lib/auth-api";
import { cn } from "@/lib/utils";

type FieldErrors = Partial<Record<string, string>>;
type Status = { kind: "error" | "success"; message: string } | null;

const fieldClass = "h-11 w-full rounded-md border border-border bg-surface-inset px-3.5 text-sm text-text-primary outline-none transition-[border-color,box-shadow] placeholder:text-text-muted/70 focus:border-brand-steel focus:ring-2 focus:ring-brand/15 aria-invalid:border-danger aria-invalid:ring-danger/15";

function FieldMessage({ id, message }: { id: string; message?: string }) {
  return message ? <p id={id} className="mt-1.5 text-xs leading-5 text-danger">{message}</p> : null;
}

function PasswordField({ id, name, label, autoComplete, error, minLength = 5 }: { id: string; name: string; label: string; autoComplete: string; error?: string; minLength?: number }) {
  const [visible, setVisible] = useState(false);
  const errorId = `${id}-error`;
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-text-primary">{label}</label>
      <div className="relative">
        <input id={id} name={name} type={visible ? "text" : "password"} minLength={minLength} maxLength={100} autoComplete={autoComplete} required aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} className={cn(fieldClass, "pr-11")} />
        <button type="button" onClick={() => setVisible((current) => !current)} className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center rounded-r-md text-text-muted hover:text-text-primary" aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`} aria-pressed={visible}>
          {visible ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
        </button>
      </div>
      <FieldMessage id={errorId} message={error} />
    </div>
  );
}

function OAuthOptions() {
  return (
    <div className="grid grid-cols-2 gap-3" aria-label="Authentication providers">
      <a href={googleOAuthStartUrl()} className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-surface-inset px-3 text-xs font-medium text-text-secondary transition-colors hover:border-brand-steel/45 hover:bg-surface-hover hover:text-text-primary">
        <span className="font-semibold" aria-hidden="true">G</span> Continue with Google
      </a>
      <button type="button" disabled aria-disabled="true" title="GitHub authentication is coming soon" className="relative inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-surface-inset px-3 text-xs font-medium text-text-muted opacity-60">
        <GitHubMark className="size-[15px]" /> GitHub
        <span className="absolute -top-2 right-1 rounded-sm border border-border bg-surface-elevated px-1.5 py-0.5 font-mono text-[0.5rem] uppercase">Soon</span>
      </button>
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

function validate(mode: AuthIntent, data: FormData): FieldErrors {
  const errors: FieldErrors = {};
  const email = fieldValue(data, "email");
  if (mode !== "reset-password") {
    if (!email) errors.email = "Enter your email address.";
    else if (email.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Enter a valid email address of 100 characters or fewer.";
  }
  if (mode === "register") {
    for (const [name, label] of [["firstName", "First name"], ["lastName", "Last name"]]) {
      const entry = fieldValue(data, name);
      if (entry.length < 5 || entry.length > 100) errors[name] = `${label} must be 5 to 100 characters.`;
    }
  }
  if (mode === "login" || mode === "register" || mode === "reset-password") {
    const shouldTrim = mode !== "reset-password";
    const password = fieldValue(data, "password", shouldTrim);
    const minimum = mode === "reset-password" ? 8 : 5;
    if (password.length < minimum || password.length > 100) errors.password = `Password must be ${minimum} to 100 characters.`;
    if (mode !== "login" && password !== fieldValue(data, "confirmPassword", shouldTrim)) errors.confirmPassword = "Passwords must match.";
  }
  return errors;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

export function AuthForm({ mode, resetToken }: { mode: AuthIntent; resetToken?: string }) {
  const router = useRouter();
  const { login, register, status: authStatus } = useAuth();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<Status>(null);
  const [submitting, setSubmitting] = useState(false);
  const copy = modeCopy[mode];

  useEffect(() => {
    if ((mode === "login" || mode === "register") && authStatus === "authenticated") router.replace("/dashboard");
  }, [authStatus, mode, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setStatus(null);
    const nextErrors = validate(mode, data);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    if (mode === "reset-password" && !resetToken) {
      setStatus({ kind: "error", message: "This password reset link is missing its token. Request a new reset email." });
      return;
    }

    setSubmitting(true);
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
        const message = await resetPasswordRequest(resetToken as string, fieldValue(data, "password", false));
        setStatus({ kind: "success", message: `${message}. You can now sign in.` });
        form.reset();
      }
    } catch (error) {
      setStatus({ kind: "error", message: errorMessage(error) });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <p className="type-meta text-brand-steel">{copy.eyebrow}</p>
      <h1 className="type-page mt-4 text-text-primary">{copy.title}</h1>
      <p className="mt-3 text-sm leading-6 text-text-secondary">{copy.description}</p>

      {(mode === "login" || mode === "register") ? (
        <div className="mt-7"><OAuthOptions /><div className="my-6 flex items-center gap-3" aria-hidden="true"><span className="h-px flex-1 bg-border-subtle" /><span className="font-mono text-[0.625rem] text-text-muted uppercase">Email</span><span className="h-px flex-1 bg-border-subtle" /></div></div>
      ) : null}

      <form onSubmit={handleSubmit} noValidate className="mt-7 space-y-5">
        {mode === "register" ? (
          <div className="grid gap-5 sm:grid-cols-2">
            {[["firstName", "first-name", "First name", "given-name"], ["lastName", "last-name", "Last name", "family-name"]].map(([name, id, label, autoComplete]) => (
              <div key={name}><label htmlFor={id} className="mb-2 block text-sm font-medium text-text-primary">{label}</label><input id={id} name={name} type="text" minLength={5} maxLength={100} autoComplete={autoComplete} required aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? `${id}-error` : undefined} className={fieldClass} /><FieldMessage id={`${id}-error`} message={errors[name]} /></div>
            ))}
          </div>
        ) : null}

        {mode !== "reset-password" ? (
          <div><label htmlFor={`${mode}-email`} className="mb-2 block text-sm font-medium text-text-primary">Email address</label><div className="relative"><Mail size={16} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-text-muted" aria-hidden="true" /><input id={`${mode}-email`} name="email" type="email" inputMode="email" maxLength={100} autoComplete="email" required aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? `${mode}-email-error` : undefined} className={cn(fieldClass, "pl-10")} placeholder="you@company.com" /></div><FieldMessage id={`${mode}-email-error`} message={errors.email} /></div>
        ) : null}

        {(mode === "login" || mode === "register" || mode === "reset-password") ? <PasswordField id={`${mode}-password`} name="password" label={mode === "reset-password" ? "New password" : "Password"} autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={mode === "reset-password" ? 8 : 5} error={errors.password} /> : null}
        {(mode === "register" || mode === "reset-password") ? <PasswordField id={`${mode}-confirm-password`} name="confirmPassword" label="Confirm password" autoComplete="new-password" minLength={mode === "reset-password" ? 8 : 5} error={errors.confirmPassword} /> : null}

        {mode === "login" ? <div className="flex justify-end"><Link href="/forgot-password" className="text-xs font-medium text-brand-steel hover:text-brand">Forgot password?</Link></div> : null}

        {status ? <div role={status.kind === "error" ? "alert" : "status"} className={cn("flex gap-3 rounded-md border p-3.5 text-xs leading-5", status.kind === "error" ? "border-danger/25 bg-danger-muted/45 text-danger" : "border-success/25 bg-success-muted/45 text-success")}>
          {status.kind === "error" ? <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" /> : <CheckCircle2 size={16} className="mt-0.5 shrink-0" aria-hidden="true" />}<span>{status.message}</span></div> : null}

        <Button type="submit" size="lg" disabled={submitting} aria-busy={submitting} className="w-full">
          {submitting ? (mode === "register" ? <AuthAnimation compact src="/animations/register-loading.lottie" className="size-5" /> : <LoaderCircle size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />) : null}
          {submitting ? "Submitting…" : copy.submit}
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
