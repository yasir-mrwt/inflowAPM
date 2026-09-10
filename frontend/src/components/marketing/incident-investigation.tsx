import { Activity, ArrowRight, Clock3, Route, ServerCrash } from "lucide-react";

const investigationSteps = [
  { number: "01", title: "Confirm health", detail: "P95 and error rate" },
  { number: "02", title: "Find the onset", detail: "Time-windowed metrics" },
  { number: "03", title: "Compare routes", detail: "Route performance" },
  { number: "04", title: "Read the failure", detail: "Recent server errors" },
  { number: "05", title: "Inspect next", detail: "Follow the failing path" },
];

const routes = [
  {
    method: "POST",
    route: "/checkout",
    requests: "486",
    errors: "40",
    p95: "1.24s",
    tone: "text-danger",
  },
  {
    method: "GET",
    route: "/api/products",
    requests: "1,242",
    errors: "0",
    p95: "128ms",
    tone: "text-success",
  },
  {
    method: "GET",
    route: "/api/cart",
    requests: "753",
    errors: "2",
    p95: "214ms",
    tone: "text-text-secondary",
  },
];

export function IncidentInvestigation() {
  return (
    <section
      id="incident-investigation"
      aria-labelledby="incident-investigation-title"
      className="border-b border-border-subtle bg-surface-inset"
    >
      <div className="mx-auto w-full max-w-[var(--content-width)] px-[var(--page-gutter)] py-[var(--section-space)]">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(22rem,0.5fr)] lg:items-end">
          <div className="max-w-[46rem]">
            <p className="type-meta text-brand-steel">From visibility to investigation</p>
            <h2
              id="incident-investigation-title"
              className="type-section mt-5 text-balance text-text-primary"
            >
              Move from a degraded signal to the route and error behind it.
            </h2>
          </div>
          <p className="type-body max-w-[32rem] text-text-secondary lg:justify-self-end">
            Start with application health, narrow the time window, compare route
            performance, then inspect the latest server failure. Every step uses
            telemetry the backend already records.
          </p>
        </div>

        <div className="mt-12 border-y border-border lg:mt-14">
          <header className="flex flex-col gap-4 border-b border-border-subtle bg-surface px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-danger/25 bg-danger-muted text-danger">
                <ServerCrash size={15} strokeWidth={1.8} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-text-primary">
                  checkout-api · incident review
                </p>
                <p className="type-meta mt-1 text-[0.5625rem] text-text-muted">
                  Demo workspace · illustrative
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 font-mono text-[0.6875rem] text-text-muted">
              <span className="inline-flex items-center gap-1.5">
                <Clock3 size={12} strokeWidth={1.8} aria-hidden="true" />
                Last 15 min
              </span>
              <span className="rounded-sm border border-danger/25 bg-danger-muted px-2 py-1 text-[0.625rem] font-medium text-danger uppercase">
                Incident detected
              </span>
            </div>
          </header>

          <div className="grid lg:grid-cols-[17rem_minmax(0,1fr)]">
            <aside className="border-border-subtle bg-background p-5 sm:p-6 lg:border-r">
              <p className="type-meta text-text-muted">Investigation path</p>
              <ol className="mt-6 space-y-1">
                {investigationSteps.map((step, index) => (
                  <li
                    key={step.number}
                    className={`grid grid-cols-[2rem_minmax(0,1fr)] gap-3 border-l py-3 pl-4 ${
                      index === 2
                        ? "border-brand bg-brand-muted/20"
                        : "border-border-subtle"
                    }`}
                  >
                    <span
                      className={`font-mono text-[0.625rem] ${
                        index === 2 ? "text-brand" : "text-text-muted"
                      }`}
                    >
                      {step.number}
                    </span>
                    <span>
                      <span className="block text-sm font-medium text-text-primary">
                        {step.title}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-text-muted">
                        {step.detail}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </aside>

            <div className="min-w-0 bg-surface">
              <div className="grid grid-cols-2 border-b border-border-subtle sm:grid-cols-3">
                <div id="p95-latency" className="border-r border-border-subtle p-4 sm:p-5">
                  <p className="type-meta text-[0.5625rem] text-text-muted">P95 latency</p>
                  <p className="mt-3 font-mono text-2xl font-medium tracking-[-0.04em] text-warning">
                    842 <span className="text-[0.625rem] font-normal text-text-muted">ms</span>
                  </p>
                  <p className="mt-2 font-mono text-[0.625rem] text-warning">↑ 174%</p>
                </div>
                <div className="p-4 sm:border-r sm:border-border-subtle sm:p-5">
                  <p className="type-meta text-[0.5625rem] text-text-muted">Error rate</p>
                  <p className="mt-3 font-mono text-2xl font-medium tracking-[-0.04em] text-danger">
                    4.7 <span className="text-[0.625rem] font-normal text-text-muted">%</span>
                  </p>
                  <p className="mt-2 font-mono text-[0.625rem] text-danger">↑ 3.0 pts</p>
                </div>
                <div className="col-span-2 border-t border-border-subtle p-4 sm:col-span-1 sm:border-t-0 sm:p-5">
                  <p className="type-meta text-[0.5625rem] text-text-muted">Started</p>
                  <p className="mt-3 font-mono text-base font-medium text-text-primary">
                    14:32:41 UTC
                  </p>
                  <p className="mt-2 text-xs text-text-muted">Within selected range</p>
                </div>
              </div>

              <div className="grid xl:grid-cols-[minmax(0,1.15fr)_minmax(19rem,0.75fr)]">
                <div className="min-w-0 border-border-subtle p-4 sm:p-6 xl:border-r">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="type-card text-text-primary">When did it start?</p>
                      <p className="mt-1 text-xs text-text-muted">P95 latency · five-minute view</p>
                    </div>
                    <Activity size={15} strokeWidth={1.8} className="text-warning" aria-hidden="true" />
                  </div>

                  <svg
                    viewBox="0 0 560 142"
                    preserveAspectRatio="none"
                    className="mt-6 h-32 w-full"
                    role="img"
                    aria-labelledby="investigation-chart-title investigation-chart-desc"
                  >
                    <title id="investigation-chart-title">Checkout latency increase</title>
                    <desc id="investigation-chart-desc">
                      P95 latency rises sharply after 14:32 and remains degraded.
                    </desc>
                    <g stroke="var(--border-subtle)" aria-hidden="true">
                      <line x1="0" y1="20" x2="560" y2="20" />
                      <line x1="0" y1="70" x2="560" y2="70" />
                      <line x1="0" y1="120" x2="560" y2="120" />
                    </g>
                    <path
                      d="M0 113 C70 111 92 105 142 107 C191 109 216 100 252 96 C288 91 303 52 342 46 C386 39 414 23 452 31 C493 40 518 28 560 22"
                      fill="none"
                      stroke="var(--warning)"
                      strokeWidth="2"
                      vectorEffect="non-scaling-stroke"
                      aria-hidden="true"
                    />
                    <line
                      x1="292"
                      y1="8"
                      x2="292"
                      y2="128"
                      stroke="var(--danger)"
                      strokeDasharray="3 5"
                      vectorEffect="non-scaling-stroke"
                      aria-hidden="true"
                    />
                    <circle cx="292" cy="61" r="4" fill="var(--danger)" aria-hidden="true" />
                  </svg>
                  <div className="mt-2 flex justify-between font-mono text-[0.5625rem] text-text-muted">
                    <span>14:30</span>
                    <span className="text-danger">14:32 onset</span>
                    <span>14:35</span>
                  </div>
                </div>

                <div id="errors" className="border-t border-border-subtle p-4 sm:p-6 xl:border-t-0">
                  <p className="type-card text-text-primary">Recent server error</p>
                  <p className="mt-1 text-xs text-text-muted">Most recent in selected range</p>
                  <div className="mt-6 border-l-2 border-danger bg-danger-muted/35 p-4">
                    <div className="flex items-center justify-between gap-4 font-mono text-xs">
                      <span className="text-text-primary">POST /checkout</span>
                      <span className="font-medium text-danger">500</span>
                    </div>
                    <p className="mt-4 font-mono text-xs leading-5 text-text-secondary">
                      Payment provider timeout
                    </p>
                    <div className="mt-4 flex items-center justify-between gap-4 font-mono text-[0.625rem] text-text-muted">
                      <time>14:33:14 UTC</time>
                      <span>1.24s</span>
                    </div>
                  </div>
                  <p className="mt-5 text-xs leading-5 text-text-muted">
                    Error context is read from the event metadata attached by the
                    producing application.
                  </p>
                </div>
              </div>

              <div id="route-performance" className="border-t border-border-subtle">
                <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6">
                  <div>
                    <p className="type-card text-text-primary">Which route is affected?</p>
                    <p className="mt-1 text-xs text-text-muted">Route performance · last 15 min</p>
                  </div>
                  <Route size={15} strokeWidth={1.8} className="text-brand-steel" aria-hidden="true" />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[38rem] border-collapse text-left">
                    <thead>
                      <tr className="border-y border-border-subtle font-mono text-[0.5625rem] tracking-[0.12em] text-text-muted uppercase">
                        <th className="px-4 py-2.5 font-medium sm:px-6">Route</th>
                        <th className="px-4 py-2.5 font-medium">Requests</th>
                        <th className="px-4 py-2.5 font-medium">Errors</th>
                        <th className="px-4 py-2.5 text-right font-medium sm:px-6">P95</th>
                      </tr>
                    </thead>
                    <tbody>
                      {routes.map((route, index) => (
                        <tr
                          key={`${route.method}-${route.route}`}
                          className={`border-b border-border-subtle last:border-b-0 ${
                            index === 0 ? "bg-danger-muted/20" : ""
                          }`}
                        >
                          <td className="px-4 py-3.5 font-mono text-xs text-text-primary sm:px-6">
                            <span className="mr-3 text-text-muted">{route.method}</span>
                            {route.route}
                          </td>
                          <td className="px-4 py-3.5 font-mono text-xs text-text-secondary">
                            {route.requests}
                          </td>
                          <td className={`px-4 py-3.5 font-mono text-xs ${route.tone}`}>
                            {route.errors}
                          </td>
                          <td className={`px-4 py-3.5 text-right font-mono text-xs sm:px-6 ${route.tone}`}>
                            {route.p95}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-border-subtle bg-background px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div>
                  <p className="type-meta text-[0.5625rem] text-text-muted">Inspect next</p>
                  <p className="mt-1 text-sm text-text-secondary">
                    Checkout handler → payment-provider call path
                  </p>
                </div>
                <span className="inline-flex items-center gap-2 font-mono text-[0.625rem] text-brand-steel">
                  Evidence, not guesswork
                  <ArrowRight size={12} strokeWidth={1.8} aria-hidden="true" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
