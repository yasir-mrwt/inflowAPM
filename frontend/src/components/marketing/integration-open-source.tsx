import {
  ArrowRight,
  Boxes,
  Container,
  Database,
  Server,
  SquareTerminal,
} from "lucide-react";
import Link from "next/link";

import { GitHubMark } from "@/components/icons/github-mark";
import { Button } from "@/components/ui/button";

const githubUrl = "https://github.com/yasir-mrwt/inflowAPM";

const ingestionExample = `curl -X POST http://localhost:5002/api/v1/telemetry/ingest \\
  -H "Authorization: Bearer $INFLOWAPM_PROJECT_KEY" \\
  -H "Content-Type: application/json" \\
  -d '[{
    "type": "http",
    "route": "/checkout",
    "method": "POST",
    "status": 500,
    "duration_ms": 1240,
    "metadata": {
      "error_message": "Payment provider timeout"
    },
    "occurred_at": "2026-09-10T14:33:14.000Z"
  }]'`;

const stack = [
  {
    layer: "Interface",
    value: "Next.js · React · TypeScript",
    detail: "Public experience and planned dashboard",
    icon: SquareTerminal,
  },
  {
    layer: "API",
    value: "Node.js · Express",
    detail: "Authentication, projects, ingestion, analytics",
    icon: Server,
  },
  {
    layer: "Data",
    value: "PostgreSQL · Redis · BullMQ",
    detail: "Telemetry storage, caching, and async work",
    icon: Database,
  },
  {
    layer: "Runtime",
    value: "Docker Compose",
    detail: "Reproducible local API infrastructure",
    icon: Container,
  },
];

export function IntegrationOpenSource() {
  return (
    <section
      id="integration"
      aria-labelledby="integration-title"
      className="border-b border-border-subtle"
    >
      <div className="mx-auto w-full max-w-[var(--content-width)] px-[var(--page-gutter)] py-[var(--section-space)]">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(22rem,0.5fr)] lg:items-end">
          <div className="max-w-[46rem]">
            <p className="type-meta text-brand-steel">Integrate on open foundations</p>
            <h2
              id="integration-title"
              className="type-section mt-5 text-balance text-text-primary"
            >
              Send real telemetry. Inspect every layer behind it.
            </h2>
          </div>
          <p className="type-body max-w-[32rem] text-text-secondary lg:justify-self-end">
            Use the supported HTTP ingestion API today. The source, processing
            pipeline, storage model, and analytics queries remain open for you to
            inspect and run locally.
          </p>
        </div>

        <div className="mt-12 grid border-y border-border lg:mt-14 lg:grid-cols-[minmax(0,1.12fr)_minmax(22rem,0.68fr)]">
          <div className="min-w-0 border-border bg-surface-inset lg:border-r">
            <div className="flex flex-col gap-3 border-b border-border-subtle px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="flex items-center gap-3">
                <span className="flex size-8 items-center justify-center rounded-md border border-border bg-surface text-brand-steel">
                  <SquareTerminal size={15} strokeWidth={1.8} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-medium text-text-primary">Direct HTTP ingestion</p>
                  <p className="mt-0.5 text-xs text-text-muted">Supported today · no SDK required</p>
                </div>
              </div>
              <span className="w-fit rounded-sm border border-success/20 bg-success-muted px-2 py-1 font-mono text-[0.625rem] font-medium text-success uppercase">
                POST · 202
              </span>
            </div>
            <div
              className="overflow-x-auto overscroll-x-contain p-4 focus-visible:outline-offset-[-2px] sm:p-6"
              role="region"
              aria-label="Scrollable telemetry ingestion example"
              tabIndex={0}
            >
              <pre
                className="min-w-[39rem] font-mono text-xs leading-6 text-text-secondary"
              >
                <code>{ingestionExample}</code>
              </pre>
            </div>
          </div>

          <div className="border-t border-border bg-surface p-4 sm:p-6 lg:border-t-0">
            <div className="flex items-center gap-3">
              <span className="flex size-8 items-center justify-center rounded-md border border-border bg-background text-brand-steel">
                <Boxes size={15} strokeWidth={1.8} aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-medium text-text-primary">Built as a full system</p>
                <p className="mt-0.5 text-xs text-text-muted">Compact technology view</p>
              </div>
            </div>

            <dl className="mt-6 divide-y divide-border-subtle border-y border-border-subtle">
              {stack.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.layer} className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-3 py-4">
                    <Icon
                      size={14}
                      strokeWidth={1.7}
                      className="mt-0.5 text-text-muted"
                      aria-hidden="true"
                    />
                    <div>
                      <dt className="type-meta text-[0.5625rem] text-text-muted">
                        {item.layer}
                      </dt>
                      <dd className="mt-1.5 font-mono text-xs text-text-primary">
                        {item.value}
                      </dd>
                      <dd className="mt-1 text-xs leading-5 text-text-muted">
                        {item.detail}
                      </dd>
                    </div>
                  </div>
                );
              })}
            </dl>
          </div>
        </div>

        <div className="grid border-b border-border-subtle py-10 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-12 md:py-12">
          <div className="max-w-[45rem]">
            <div className="flex items-center gap-3 text-text-primary">
              <GitHubMark className="size-5" />
              <p className="type-meta">Open source by design</p>
            </div>
            <h3 className="mt-5 text-2xl leading-tight font-medium tracking-[-0.03em] text-text-primary sm:text-3xl">
              Read the implementation, run it locally, or help shape what comes next.
            </h3>
            <p className="mt-4 max-w-[38rem] text-sm leading-6 text-text-secondary">
              InflowAPM exposes the same architecture described here: an Express API,
              asynchronous telemetry processing, PostgreSQL analytics, and a Next.js
              product experience.
            </p>
          </div>
          <Button variant="secondary" size="lg" className="mt-7 md:mt-0" asChild>
            <a href={githubUrl} target="_blank" rel="noreferrer">
              <GitHubMark className="size-4" />
              View source on GitHub
            </a>
          </Button>
        </div>

        <div className="flex flex-col gap-8 pt-12 md:flex-row md:items-end md:justify-between md:pt-16">
          <div className="max-w-[42rem]">
            <p className="type-meta text-brand-steel">Ready when you are</p>
            <h3 className="mt-4 text-balance text-3xl leading-[1.05] font-semibold tracking-[-0.04em] text-text-primary sm:text-4xl">
              Investigate the route before your users have to report it.
            </h3>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap md:justify-end">
            <Button size="lg" asChild>
              <Link href="/register" prefetch={false}>
                Start monitoring
                <ArrowRight size={15} strokeWidth={1.9} aria-hidden="true" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <a href={githubUrl} target="_blank" rel="noreferrer">
                <GitHubMark className="size-4" />
                GitHub
              </a>
            </Button>
            <Button variant="ghost" size="lg" asChild>
              <Link href="/#how-it-works">Read architecture</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
