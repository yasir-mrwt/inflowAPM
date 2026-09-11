import type { CSSProperties } from "react";
import { Code2, Database, Inbox, Route, Workflow } from "lucide-react";

const flowStages = [
  {
    label: "Source",
    title: "Your application",
    detail: "Requests, errors, and latency",
    meta: "HTTP telemetry",
    icon: Code2,
  },
  {
    label: "Ingest",
    title: "InflowAPM",
    detail: "Authenticated event batches",
    meta: "202 Accepted",
    icon: Inbox,
    featured: true,
  },
  {
    label: "Process",
    title: "BullMQ worker",
    detail: "Asynchronous processing",
    meta: "Retry + backoff",
    icon: Workflow,
  },
  {
    label: "Analyze",
    title: "PostgreSQL",
    detail: "Project-scoped telemetry",
    meta: "Windowed queries",
    icon: Database,
  },
  {
    label: "Understand",
    title: "Route visibility",
    detail: "Latency, errors, throughput",
    meta: "Find the failing route",
    icon: Route,
  },
];

const architectureFacts = [
  { label: "Authentication", value: "Project API key" },
  { label: "Batch limit", value: "1 to 100 events" },
  { label: "Queue", value: "BullMQ" },
  { label: "Analytics", value: "PostgreSQL" },
];

function FlowConnector({ index }: { index: number }) {
  const delay = { "--flow-delay": `${index}s` } as CSSProperties;

  return (
    <div
      className="relative flex h-12 items-center justify-center lg:h-auto lg:min-h-24"
      aria-hidden="true"
    >
      <span className="h-full w-px bg-border lg:h-px lg:w-full" />
      <span className="flow-signal-y absolute left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-brand shadow-[0_0_12px_color-mix(in_srgb,var(--brand)_70%,transparent)] lg:hidden" style={delay} />
      <span className="flow-signal-x absolute top-1/2 hidden size-1.5 -translate-y-1/2 rounded-full bg-brand shadow-[0_0_12px_color-mix(in_srgb,var(--brand)_70%,transparent)] lg:block" style={delay} />
    </div>
  );
}

export function TelemetryFlow() {
  return (
    <section
      id="how-it-works"
      aria-labelledby="telemetry-flow-title"
      className="relative overflow-hidden border-b border-border-subtle"
    >
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 -z-10 h-[32rem] w-[70rem] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(ellipse_at_center,color-mix(in_srgb,var(--brand)_4%,transparent),transparent_70%)]"
        aria-hidden="true"
      />

      <div className="mx-auto w-full max-w-[var(--content-width)] px-[var(--page-gutter)] py-[var(--section-space)]">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.78fr)_minmax(24rem,0.52fr)] lg:items-end lg:justify-between">
          <div className="max-w-[44rem]">
            <p className="type-meta text-brand-steel">From signal to visibility</p>
            <h2
              id="telemetry-flow-title"
              className="type-section mt-5 text-balance text-text-primary"
            >
              Follow telemetry from your application to the route that needs attention.
            </h2>
          </div>
          <p className="type-body max-w-[32rem] text-text-secondary lg:justify-self-end">
            InflowAPM accepts small event batches quickly, processes them outside the
            request path, and turns stored telemetry into route, latency, and error
            visibility.
          </p>
        </div>

        <div
          className="mt-12 border-y border-border-subtle py-8 lg:mt-14 lg:py-10"
          aria-label="Telemetry processing flow"
        >
          <div className="grid lg:grid-cols-[minmax(0,1fr)_2.25rem_minmax(0,1fr)_2.25rem_minmax(0,1fr)_2.25rem_minmax(0,1fr)_2.25rem_minmax(0,1fr)]">
            {flowStages.map((stage, index) => {
              const Icon = stage.icon;

              return (
                <div key={stage.title} className="contents">
                  <article
                    className={`relative min-h-44 border p-5 lg:min-h-52 ${
                      stage.featured
                        ? "border-brand/35 bg-brand-muted/35"
                        : "border-border-subtle bg-surface-inset"
                    }`}
                  >
                    <div
                      className={`flex size-9 items-center justify-center rounded-md border ${
                        stage.featured
                          ? "border-brand/30 bg-brand/10 text-brand"
                          : "border-border bg-surface text-brand-steel"
                      }`}
                    >
                      <Icon size={16} strokeWidth={1.8} aria-hidden="true" />
                    </div>
                    <p className="type-meta mt-6 text-text-muted">{stage.label}</p>
                    <h3 className="type-card mt-2 text-text-primary">{stage.title}</h3>
                    <p className="mt-2 text-sm leading-5 text-text-secondary">
                      {stage.detail}
                    </p>
                    <p className="absolute right-5 bottom-5 left-5 font-mono text-[0.625rem] leading-4 text-text-muted">
                      {stage.meta}
                    </p>
                  </article>
                  {index < flowStages.length - 1 ? (
                    <FlowConnector index={index} />
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <dl className="grid grid-cols-2 border-b border-border-subtle sm:grid-cols-4">
          {architectureFacts.map((fact, index) => (
            <div
              key={fact.label}
              className={`py-5 ${index % 2 === 0 ? "pr-4" : "pl-4"} ${
                index < 2 ? "border-b border-border-subtle sm:border-b-0" : ""
              } ${index > 0 ? "sm:border-l sm:border-border-subtle sm:px-5" : ""}`}
            >
              <dt className="type-meta text-[0.5625rem] text-text-muted">
                {fact.label}
              </dt>
              <dd className="mt-2 font-mono text-xs text-text-primary">
                {fact.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
