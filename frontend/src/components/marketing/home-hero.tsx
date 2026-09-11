import {
  Activity,
  ArrowRight,
  DatabaseZap,
  GitBranch,
  Layers3,
} from "lucide-react";
import Link from "next/link";

import { GitHubMark } from "@/components/icons/github-mark";
import { MonitoringPreview } from "@/components/marketing/monitoring-preview";
import { Button } from "@/components/ui/button";

const productFacts = [
  { label: "Async ingestion", icon: DatabaseZap },
  { label: "Project-scoped telemetry", icon: GitBranch },
  { label: "PostgreSQL analytics", icon: Layers3 },
];

export function HomeHero() {
  return (
    <section
      id="product-overview"
      className="relative isolate overflow-hidden border-b border-border-subtle pt-16"
    >
      <div
        className="pointer-events-none absolute top-0 left-1/2 -z-10 h-[42rem] w-[64rem] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,color-mix(in_srgb,var(--brand)_5%,transparent),transparent_68%)]"
        aria-hidden="true"
      />

      <div className="mx-auto grid min-h-[calc(100svh-4rem)] w-full max-w-[var(--content-width)] items-center gap-14 px-[var(--page-gutter)] py-16 lg:grid-cols-[minmax(0,0.83fr)_minmax(34rem,1.17fr)] lg:gap-12 lg:py-20 xl:gap-20">
        <div className="max-w-[38rem]">
          <p className="inline-flex items-center gap-2 font-mono text-[0.6875rem] font-medium tracking-[0.12em] text-brand-steel uppercase">
            <Activity size={14} strokeWidth={1.8} aria-hidden="true" />
            Open-source application monitoring
          </p>

          <h1 className="type-hero mt-6 text-balance text-text-primary">
            Know where your API breaks.
          </h1>

          <p className="type-body mt-6 max-w-[35rem] text-pretty text-text-secondary">
            InflowAPM turns request telemetry into clear answers about errors,
            latency, P95, throughput, and route performance. Find what changed
            before your users have to explain it.
          </p>

          <div className="mt-8 grid w-fit grid-cols-[auto_auto] items-center gap-2.5 sm:flex sm:flex-wrap sm:gap-3">
            <Button
              size="lg"
              className="col-span-2 h-10 justify-self-start px-4 text-xs sm:h-11 sm:px-5 sm:text-sm"
              asChild
            >
              <Link href="/register" prefetch={false}>
                Start monitoring
                <ArrowRight
                  className="size-3.5 sm:size-[15px]"
                  strokeWidth={1.9}
                  aria-hidden="true"
                />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="secondary"
              className="h-10 px-4 text-xs sm:h-11 sm:px-5 sm:text-sm"
              asChild
            >
              <Link href="/#how-it-works">
                <span className="sm:hidden">Architecture</span>
                <span className="hidden sm:inline">View architecture</span>
              </Link>
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className="h-10 px-4 text-xs sm:h-11 sm:px-5 sm:text-sm"
              asChild
            >
              <a
                href="https://github.com/yasir-mrwt/inflowAPM"
                target="_blank"
                rel="noreferrer"
              >
                <GitHubMark className="size-3.5 sm:size-4" />
                GitHub
              </a>
            </Button>
          </div>

          <ul className="mt-10 grid gap-3 border-t border-border-subtle pt-6 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            {productFacts.map((fact) => {
              const Icon = fact.icon;
              return (
                <li
                  key={fact.label}
                  className="flex items-center gap-2 text-xs leading-5 text-text-muted"
                >
                  <Icon
                    size={14}
                    strokeWidth={1.8}
                    className="shrink-0 text-brand-steel"
                    aria-hidden="true"
                  />
                  {fact.label}
                </li>
              );
            })}
          </ul>
        </div>

        <div className="w-full lg:py-8">
          <MonitoringPreview />
        </div>
      </div>
    </section>
  );
}
