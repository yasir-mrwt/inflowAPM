import { Activity, DatabaseZap, ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { AuthAnimation } from "@/components/auth/auth-animation";
import { BrandLockup } from "@/components/brand/brand-mark";

export function AuthShell({
  children,
  animation,
  eyebrow,
  title,
  description,
}: {
  children: ReactNode;
  animation: "/animations/login.lottie" | "/animations/register.lottie";
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <main className="min-h-svh bg-background lg:grid lg:grid-cols-[minmax(0,0.9fr)_minmax(30rem,1.1fr)]">
      <section className="relative hidden min-h-svh overflow-hidden border-r border-border-subtle bg-surface-inset lg:flex lg:flex-col" aria-label="InflowAPM product context">
        <div className="absolute inset-0 bg-[linear-gradient(color-mix(in_srgb,var(--border-subtle)_50%,transparent)_1px,transparent_1px),linear-gradient(90deg,color-mix(in_srgb,var(--border-subtle)_50%,transparent)_1px,transparent_1px)] bg-[size:3rem_3rem] opacity-25" aria-hidden="true" />
        <div className="relative z-10 flex items-center justify-between p-8 xl:p-10">
          <Link href="/" aria-label="InflowAPM home">
            <BrandLockup priority />
          </Link>
          <span className="rounded-sm border border-border bg-surface px-2.5 py-1 font-mono text-[0.625rem] tracking-[0.12em] text-text-muted uppercase">Secure access</span>
        </div>

        <div className="relative z-10 my-auto px-8 pb-14 xl:px-14">
          <div className="mx-auto max-w-[34rem]">
            <div className="relative mx-auto aspect-square max-w-[25rem] overflow-hidden rounded-lg border border-border-subtle bg-surface/75 shadow-[0_2rem_6rem_rgba(0,0,0,0.32)]">
              <div className="absolute inset-x-0 top-0 flex h-10 items-center gap-2 border-b border-border-subtle px-4" aria-hidden="true">
                <span className="size-1.5 rounded-full bg-danger/70" />
                <span className="size-1.5 rounded-full bg-warning/70" />
                <span className="size-1.5 rounded-full bg-success/70" />
                <span className="ml-auto font-mono text-[0.5625rem] text-text-muted">identity.flow</span>
              </div>
              <AuthAnimation src={animation} className="absolute inset-10 top-14" />
            </div>

            <p className="type-meta mt-9 text-brand-steel">{eyebrow}</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-text-primary">{title}</h2>
            <p className="mt-4 max-w-[31rem] text-sm leading-6 text-text-secondary">{description}</p>
            <ul className="mt-7 grid gap-3 sm:grid-cols-3">
              {[
                [Activity, "Route health"],
                [DatabaseZap, "Async telemetry"],
                [ShieldCheck, "Project scoped"],
              ].map(([Icon, label]) => {
                const ItemIcon = Icon as typeof Activity;
                return (
                  <li key={label as string} className="flex items-center gap-2 text-xs text-text-muted">
                    <ItemIcon size={13} className="text-brand-steel" aria-hidden="true" />
                    {label as string}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </section>

      <section className="flex min-h-svh flex-col bg-surface lg:bg-background">
        <header className="flex h-16 items-center border-b border-border-subtle px-5 sm:px-8 lg:hidden">
          <Link href="/" aria-label="InflowAPM home">
            <BrandLockup className="size-8" />
          </Link>
        </header>
        <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8 lg:px-12 lg:py-16">
          <div className="w-full max-w-[28rem]">{children}</div>
        </div>
        <footer className="px-5 pb-6 text-center font-mono text-[0.625rem] text-text-muted sm:px-8">Open-source observability · Built for API teams</footer>
      </section>
    </main>
  );
}
