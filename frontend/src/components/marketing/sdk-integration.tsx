import {
  ArrowRight,
  Braces,
  ChartNoAxesCombined,
  CirclePlay,
  KeyRound,
  Package,
  RadioTower,
  Server,
  Settings2,
  ShieldCheck,
  TerminalSquare,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

const steps = [
  { label: "Install", icon: Package },
  { label: "Configure", icon: Settings2 },
  { label: "Instrument", icon: Braces },
  { label: "Run", icon: CirclePlay },
  { label: "Observe", icon: ChartNoAxesCombined },
];

const installCommand = "npm install @inflowapm/node";

const configureExample = `INFLOWAPM_API_KEY=iapm_project_key
INFLOWAPM_ENDPOINT=http://127.0.0.1:5002
INFLOWAPM_SERVICE=checkout-api
INFLOWAPM_ENVIRONMENT=development
INFLOWAPM_SERVICE_VERSION=1.4.0`;

const instrumentExample = `import express from "express";
import { InflowAPM } from "@inflowapm/node";

const app = express();
const inflow = new InflowAPM({
  apiKey: process.env.INFLOWAPM_API_KEY,
  endpoint: process.env.INFLOWAPM_ENDPOINT,
  service: process.env.INFLOWAPM_SERVICE,
  environment: process.env.INFLOWAPM_ENVIRONMENT,
  serviceVersion: process.env.INFLOWAPM_SERVICE_VERSION ?? "1.4.0",
});

app.use(inflow.express());
app.get("/health", (_request, response) => response.send("ok"));`;

function CodePanel({
  label,
  code,
  ariaLabel,
}: {
  label: string;
  code: string;
  ariaLabel: string;
}) {
  return (
    <div className="min-w-0 border border-border-subtle bg-surface-inset">
      <div className="flex items-center gap-2 border-b border-border-subtle px-4 py-3">
        <span className="size-1.5 rounded-full bg-brand" aria-hidden="true" />
        <p className="font-mono text-[0.6875rem] text-text-muted">{label}</p>
      </div>
      <div
        className="overflow-x-auto overscroll-x-contain p-4 focus-visible:outline-offset-[-2px] sm:p-5"
        role="region"
        aria-label={ariaLabel}
        tabIndex={0}
      >
        <pre className="min-w-max font-mono text-xs leading-6 text-text-secondary">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}

function FlowArrow() {
  return (
    <span className="flex h-7 items-center justify-center text-text-muted sm:h-auto" aria-hidden="true">
      <ArrowRight className="hidden sm:block" size={14} />
      <span className="h-4 w-px bg-border sm:hidden" />
    </span>
  );
}

export function SdkIntegration() {
  return (
    <section
      id="node-sdk"
      aria-labelledby="node-sdk-title"
      className="border-b border-border-subtle"
    >
      <div className="mx-auto w-full max-w-[var(--content-width)] px-[var(--page-gutter)] py-[var(--section-space)]">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.82fr)_minmax(21rem,0.48fr)] lg:items-end">
          <div className="max-w-[47rem]">
            <p className="type-meta text-brand-steel">Node.js SDK</p>
            <h2 id="node-sdk-title" className="type-section mt-5 text-balance text-text-primary">
              Instrument once. Observe every stage.
            </h2>
          </div>
          <div className="lg:justify-self-end">
            <p className="type-body max-w-[32rem] text-text-secondary">
              Add bounded, fail-open telemetry to Express without putting network
              delivery on the application request path.
            </p>
            <div className="mt-5 inline-flex rounded-md border border-border bg-surface-inset p-1" aria-label="SDK languages">
              <span className="rounded-sm bg-surface-elevated px-3 py-1.5 text-xs font-medium text-text-primary">
                Node.js
              </span>
              <span className="px-3 py-1.5 text-xs text-text-muted">
                Python · Coming soon
              </span>
            </div>
          </div>
        </div>

        <ol className="mt-12 grid border-y border-border-subtle sm:grid-cols-5 lg:mt-14">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <li
                key={step.label}
                className="flex items-center gap-3 border-b border-border-subtle px-3 py-4 last:border-b-0 sm:border-r sm:border-b-0 sm:last:border-r-0 lg:px-5"
              >
                <span className="font-mono text-[0.625rem] text-text-muted">0{index + 1}</span>
                <Icon size={14} strokeWidth={1.8} className="text-brand-steel" aria-hidden="true" />
                <span className="text-sm font-medium text-text-primary">{step.label}</span>
              </li>
            );
          })}
        </ol>

        <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)]">
          <div className="min-w-0 space-y-4">
            <div className="border border-brand/25 bg-brand-muted/20 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <TerminalSquare size={16} className="text-brand" aria-hidden="true" />
                  <p className="text-sm font-medium text-text-primary">Install</p>
                </div>
                <span className="rounded-sm border border-warning/20 bg-warning-muted px-2 py-1 font-mono text-[0.625rem] text-warning uppercase">
                  Release ready · Publishing next
                </span>
              </div>
              <div className="mt-5 overflow-x-auto border border-border bg-background p-4" role="region" aria-label="SDK installation command" tabIndex={0}>
                <code className="whitespace-nowrap font-mono text-xs text-text-primary">{installCommand}</code>
              </div>
              <p className="mt-4 text-xs leading-5 text-text-muted">
                The package is validated but not public yet. Repository contributors
                can install the packed SDK locally until the controlled npm release.
              </p>
            </div>
            <CodePanel label=".env" code={configureExample} ariaLabel="SDK environment configuration example" />
          </div>
          <CodePanel label="server.js" code={instrumentExample} ariaLabel="Express SDK integration example" />
        </div>

        <div className="mt-4 border border-border-subtle bg-surface p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <Settings2 size={15} className="text-brand-steel" aria-hidden="true" />
            <h3 className="type-card text-text-primary">One integration, explicit environments</h3>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1.2fr] sm:items-stretch">
            {[
              ["Development", "development"],
              ["Staging", "staging"],
              ["Production", "production"],
            ].map(([title, value]) => (
              <div className="contents" key={value}>
                <div className="border border-border-subtle bg-surface-inset p-4">
                  <p className="text-xs font-medium text-text-primary">{title}</p>
                  <code className="mt-2 block font-mono text-[0.625rem] text-text-muted">{value}</code>
                </div>
                <FlowArrow />
              </div>
            ))}
            <div className="border border-brand/30 bg-brand-muted/20 p-4">
              <p className="text-xs font-medium text-text-primary">@inflowapm/node</p>
              <code className="mt-2 block font-mono text-[0.625rem] text-brand-steel">checkout-api → InflowAPM</code>
            </div>
          </div>
        </div>

        <div className="mt-4 grid border border-border-subtle lg:grid-cols-2">
          <article className="border-b border-border-subtle p-5 sm:p-6 lg:border-r lg:border-b-0">
            <div className="flex items-center gap-3">
              <Server size={15} className="text-brand-steel" aria-hidden="true" />
              <h3 className="type-card text-text-primary">Request path</h3>
            </div>
            <p className="mt-2 text-sm leading-6 text-text-secondary">
              Browser or Postman → Express middleware → route handler → response
            </p>
            <div className="mt-5 rounded-md border border-success/20 bg-success-muted/50 p-4">
              <p className="font-mono text-xs text-success">POST /checkout · 500 · 1,240 ms</p>
              <p className="mt-2 text-xs leading-5 text-text-muted">
                Postman sends the request. InflowAPM explains what happened after
                your application received it.
              </p>
            </div>
          </article>
          <article className="p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <RadioTower size={15} className="text-brand" aria-hidden="true" />
              <h3 className="type-card text-text-primary">Telemetry path</h3>
            </div>
            <p className="mt-2 text-sm leading-6 text-text-secondary">
              Middleware → bounded memory buffer → background batch → InflowAPM API
            </p>
            <div className="mt-5 flex gap-3 rounded-md border border-border-subtle bg-surface-inset p-4">
              <ShieldCheck size={16} className="mt-0.5 shrink-0 text-brand-steel" aria-hidden="true" />
              <p className="text-xs leading-5 text-text-muted">
                Delivery retries transient failures with backoff. Instrumentation
                failures stay fail-open so they do not replace your application response.
              </p>
            </div>
          </article>
        </div>

        <div className="mt-10 flex flex-col gap-6 border-t border-border-subtle pt-8 md:flex-row md:items-center md:justify-between">
          <div className="max-w-[42rem]">
            <div className="flex items-center gap-3 text-text-primary">
              <KeyRound size={15} className="text-brand-steel" aria-hidden="true" />
              <p className="type-meta">Project key required</p>
            </div>
            <p className="mt-3 text-sm leading-6 text-text-secondary">
              Read the full setup, configuration, privacy, reliability, and
              self-hosting reference before deploying the SDK.
            </p>
          </div>
          <Button variant="secondary" size="lg" asChild>
            <Link href="/docs" prefetch={false}>
              Read Node.js SDK docs
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
