import { AlertTriangle, Search, TrendingUp } from "lucide-react";

const incidentEvents = [
  {
    time: "14:31:08",
    route: "POST /checkout",
    signal: "P95",
    value: "312 ms",
    tone: "text-text-secondary",
  },
  {
    time: "14:32:41",
    route: "POST /checkout",
    signal: "P95",
    value: "847 ms",
    tone: "text-warning",
  },
  {
    time: "14:33:09",
    route: "POST /checkout",
    signal: "HTTP",
    value: "500",
    tone: "text-danger",
  },
  {
    time: "14:33:14",
    route: "POST /checkout",
    signal: "HTTP",
    value: "500",
    tone: "text-danger",
  },
];

const uncertaintySignals = [
  { label: "Latency", value: "2.7×", tone: "text-warning" },
  { label: "5xx errors", value: "+18", tone: "text-danger" },
  { label: "Affected route", value: "/checkout", tone: "text-text-primary" },
];

export function ProductionProblem() {
  return (
    <section
      id="production-problem"
      aria-labelledby="production-problem-title"
      className="relative border-b border-border-subtle bg-surface-inset"
    >
      <div className="mx-auto w-full max-w-[var(--content-width)] px-[var(--page-gutter)] py-[var(--section-space)]">
        <div className="grid items-end gap-8 border-b border-border-subtle pb-10 md:grid-cols-[minmax(0,1fr)_minmax(18rem,0.58fr)] md:pb-12">
          <div className="max-w-[46rem]">
            <p className="type-meta text-brand-steel">The production problem</p>
            <h2
              id="production-problem-title"
              className="type-section mt-5 max-w-[42rem] text-balance text-text-primary"
            >
              Production tells you something broke. It rarely tells you where.
            </h2>
          </div>
          <p className="type-body max-w-[34rem] text-text-secondary md:justify-self-end">
            A healthy route can become slow, then fail, in minutes. Without the
            telemetry between those moments, the first useful signal often arrives
            from an affected user.
          </p>
        </div>

        <div className="grid lg:grid-cols-[minmax(0,1.08fr)_minmax(20rem,0.72fr)]">
          <div className="relative border-border-subtle py-10 lg:border-r lg:py-14 lg:pr-14">
            <div className="mb-7 flex items-center justify-between gap-4">
              <div>
                <p className="type-card text-text-primary">Incident progression</p>
                <p className="mt-1 text-sm text-text-muted">
                  checkout-api · production
                </p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-sm border border-danger/20 bg-danger-muted px-2.5 py-1.5 font-mono text-[0.625rem] font-medium text-danger uppercase">
                <AlertTriangle size={12} strokeWidth={1.9} aria-hidden="true" />
                Degraded
              </span>
            </div>

            <div className="relative">
              <div
                className="absolute top-4 bottom-4 left-[0.3125rem] w-px bg-border-subtle"
                aria-hidden="true"
              >
                <span className="incident-progression absolute inset-0 origin-top bg-gradient-to-b from-brand-steel via-warning to-danger" />
              </div>

              <ol className="space-y-2">
                {incidentEvents.map((event, index) => (
                  <li
                    key={`${event.time}-${event.value}`}
                    className="grid grid-cols-[0.6875rem_minmax(0,1fr)] gap-4"
                  >
                    <span
                      className={`relative z-10 mt-[1.15rem] size-[0.6875rem] rounded-full border-2 border-surface-inset ${
                        index < 2 ? "bg-warning" : "bg-danger"
                      }`}
                      aria-hidden="true"
                    />
                    <div className="grid gap-3 border-b border-border-subtle py-3.5 last:border-b-0 sm:grid-cols-[5.25rem_minmax(0,1fr)_3rem_4.5rem] sm:items-center">
                      <time className="font-mono text-[0.6875rem] text-text-muted">
                        {event.time}
                      </time>
                      <code className="font-mono text-xs text-text-primary">
                        {event.route}
                      </code>
                      <span className="font-mono text-[0.625rem] text-text-muted uppercase">
                        {event.signal}
                      </span>
                      <span className={`font-mono text-sm font-medium sm:text-right ${event.tone}`}>
                        {event.value}
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <aside className="py-10 lg:py-14 lg:pl-14" aria-label="Developer uncertainty">
            <div className="flex size-10 items-center justify-center rounded-md border border-border bg-surface text-brand-steel">
              <Search size={18} strokeWidth={1.7} aria-hidden="true" />
            </div>
            <p className="type-meta mt-7 text-text-muted">Signal without context</p>
            <p className="mt-3 max-w-sm text-2xl leading-tight font-medium tracking-[-0.03em] text-text-primary sm:text-3xl">
              Something broke. Where did it start?
            </p>

            <dl className="mt-8 divide-y divide-border-subtle border-y border-border-subtle">
              {uncertaintySignals.map((signal) => (
                <div key={signal.label} className="flex items-center justify-between gap-4 py-3.5">
                  <dt className="text-sm text-text-muted">{signal.label}</dt>
                  <dd className={`font-mono text-xs font-medium ${signal.tone}`}>
                    {signal.value}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="mt-7 flex items-start gap-3 text-sm leading-6 text-text-secondary">
              <TrendingUp
                size={15}
                strokeWidth={1.8}
                className="mt-1 shrink-0 text-warning"
                aria-hidden="true"
              />
              <p>
                The symptom is visible. The route, timing, and failure pattern still
                need to become one investigation trail.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
