"use client";

import { AlertCircle, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";

export function OAuthCallback({ code }: { code?: string }) {
  const { completeOAuth } = useAuth();
  const router = useRouter();
  const started = useRef(false);
  const [error, setError] = useState(code ? "" : "Google did not return a valid sign-in code. Please start again.");

  useEffect(() => {
    if (!code || started.current) return;
    started.current = true;
    completeOAuth(code)
      .then(() => router.replace("/dashboard"))
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Google sign-in could not be completed."));
  }, [code, completeOAuth, router]);

  if (error) {
    return (
      <div>
        <div role="alert" className="flex gap-3 rounded-md border border-danger/25 bg-danger-muted/45 p-4 text-sm leading-6 text-danger"><AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" /><span>{error}</span></div>
        <Link href="/login" className="mt-6 inline-flex text-sm font-medium text-brand-steel hover:text-brand">Return to sign in</Link>
      </div>
    );
  }

  return <div className="flex items-center gap-3 text-sm text-text-secondary" role="status" aria-live="polite"><LoaderCircle size={18} className="animate-spin text-brand motion-reduce:animate-none" aria-hidden="true" />Completing Google sign-in…</div>;
}
