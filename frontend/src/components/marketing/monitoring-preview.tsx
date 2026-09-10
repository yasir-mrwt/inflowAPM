import { Activity, Clock3, Server } from "lucide-react";

const metrics = [
  { label: "Requests", value: "2,481", unit: "/ min", tone: "text-text-primary" },
  { label: "Error rate", value: "1.7", unit: "%", tone: "text-danger" },
  { label: "P95 latency", value: "842", unit: "ms", tone: "text-warning" },
  { label: "Throughput", value: "41.3", unit: "req/s", tone: "text-text-primary" },
];

const routes = [
  {
    method: "POST",
    route: "/checkout",
    status: "500",
    duration: "1.24s",
    statusTone: "text-danger",
    durationTone: "text-danger",
  },
  {
    method: "GET",
    route: "/api/products",
    status: "200",
    duration: "128ms",
    statusTone: "text-success",
    durationTone: "text-text-secondary",
  },
];

export function MonitoringPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[42rem] lg:max-w-none">
      <div
        className="absolute -inset-8 -z-10 bg-[radial-gradient(circle_at_center,color-mix(in_srgb,var(--brand)_8%,transparent),transparent_68%)]"
        aria-hidden="true"
      />

      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-[0_28px_90px_rgba(0,0,0,0.42)]">
        <div className="flex min-h-14 items-center justify-between gap-4 border-b border-border-subtle px-4 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border-subtle bg-surface-elevated text-brand-steel">
              <Server size={14} strokeWidth={1.8} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-text-primary">
                checkout-api
              </p>
              <p className="type-meta mt-0.5 text-[0.5625rem] text-text-muted">
                Demo workspace · illustrative
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2.5">
            <span className="hidden items-center gap-1.5 font-mono text-[0.6875rem] text-text-muted sm:flex">
              <Clock3 size={12} strokeWidth={1.8} aria-hidden="true" />
              Last 15 min
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-sm border border-success/20 bg-success-muted px-2 py-1 font-mono text-[0.625rem] font-medium text-success uppercase">
              <span
                className="live-indicator size-1.5 rounded-full bg-success"
                aria-hidden="true"
              />
              Live
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 border-b border-border-subtle lg:grid-cols-4">
          {metrics.map((metric, index) => (
            <div
              key={metric.label}
              className={`px-4 py-4 sm:px-5 ${
                index % 2 === 0 ? "border-r border-border-subtle" : ""
              } ${index < 2 ? "border-b border-border-subtle lg:border-b-0" : ""} ${
                index === 1 ? "lg:border-r" : ""
              }`}
            >
              <p className="type-meta text-[0.5625rem] text-text-muted">
                {metric.label}
              </p>
              <p
                className={`mt-2 font-mono text-xl font-medium tracking-[-0.04em] sm:text-2xl ${metric.tone}`}
              >
                {metric.value}{" "}
                <span className="text-[0.625rem] font-normal tracking-normal text-text-muted">
                  {metric.unit}
                </span>
              </p>
            </div>
          ))}
        </div>

        <div className="border-b border-border-subtle px-4 pt-5 sm:px-5 sm:pt-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="type-card text-text-primary">Request volume</p>
              <p className="mt-1 text-xs text-text-muted">
                Requests accepted per minute
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-text-muted">
              <Activity size={13} strokeWidth={1.8} aria-hidden="true" />
              15 min window
            </div>
          </div>

          <div className="relative mt-4 h-40 w-full sm:h-44">
            <svg
              viewBox="0 0 620 176"
              preserveAspectRatio="none"
              className="absolute inset-0 size-full overflow-visible"
              role="img"
              aria-labelledby="request-volume-title request-volume-description"
            >
              <title id="request-volume-title">Request volume trend</title>
              <desc id="request-volume-description">
                Illustrative request traffic that rises and falls over a fifteen
                minute period.
              </desc>
              <g className="text-border-subtle" aria-hidden="true">
                <line x1="0" y1="24" x2="620" y2="24" stroke="currentColor" />
                <line x1="0" y1="74" x2="620" y2="74" stroke="currentColor" />
                <line x1="0" y1="124" x2="620" y2="124" stroke="currentColor" />
                <line x1="0" y1="174" x2="620" y2="174" stroke="currentColor" />
              </g>
              <path
                d="M0 145 C38 143 52 120 86 123 C121 126 126 91 162 97 C198 103 209 112 241 89 C276 63 290 79 323 72 C358 65 367 30 405 45 C438 58 450 92 485 76 C521 60 538 26 570 38 C590 45 605 39 620 28 L620 176 L0 176 Z"
                fill="color-mix(in srgb, var(--brand) 6%, transparent)"
                aria-hidden="true"
              />
              <path
                d="M0 145 C38 143 52 120 86 123 C121 126 126 91 162 97 C198 103 209 112 241 89 C276 63 290 79 323 72 C358 65 367 30 405 45 C438 58 450 92 485 76 C521 60 538 26 570 38 C590 45 605 39 620 28"
                fill="none"
                stroke="color-mix(in srgb, var(--brand) 24%, transparent)"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
                aria-hidden="true"
              />
              <path
                pathLength="1"
                d="M0 145 C38 143 52 120 86 123 C121 126 126 91 162 97 C198 103 209 112 241 89 C276 63 290 79 323 72 C358 65 367 30 405 45 C438 58 450 92 485 76 C521 60 538 26 570 38 C590 45 605 39 620 28"
                fill="none"
                stroke="var(--brand)"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
                className="telemetry-trace"
                aria-hidden="true"
              />
              <circle
                cx="620"
                cy="28"
                r="3.5"
                fill="var(--brand)"
                stroke="var(--surface)"
                strokeWidth="3"
                vectorEffect="non-scaling-stroke"
                aria-hidden="true"
              />
            </svg>
          </div>
        </div>

        <div>
          <div className="grid grid-cols-[minmax(0,1fr)_3rem_3.75rem] gap-3 border-b border-border-subtle px-4 py-2.5 sm:grid-cols-[5rem_minmax(0,1fr)_3rem_4.5rem] sm:px-5">
            <span className="type-meta hidden text-[0.5625rem] text-text-muted sm:block">
              Method
            </span>
            <span className="type-meta text-[0.5625rem] text-text-muted">Route</span>
            <span className="type-meta text-[0.5625rem] text-text-muted">Status</span>
            <span className="type-meta text-right text-[0.5625rem] text-text-muted">
              P95
            </span>
          </div>
          {routes.map((route) => (
            <div
              key={`${route.method}-${route.route}`}
              className="grid grid-cols-[minmax(0,1fr)_3rem_3.75rem] items-center gap-3 border-b border-border-subtle px-4 py-3.5 last:border-b-0 sm:grid-cols-[5rem_minmax(0,1fr)_3rem_4.5rem] sm:px-5"
            >
              <span className="hidden font-mono text-[0.6875rem] font-medium text-text-muted sm:block">
                {route.method}
              </span>
              <span className="min-w-0 truncate font-mono text-xs text-text-primary">
                <span className="mr-2 text-text-muted sm:hidden">{route.method}</span>
                {route.route}
              </span>
              <span className={`font-mono text-xs font-medium ${route.statusTone}`}>
                {route.status}
              </span>
              <span className={`text-right font-mono text-xs ${route.durationTone}`}>
                {route.duration}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between px-1 font-mono text-[0.625rem] text-text-muted">
        <span>Updated 18:42:17 UTC</span>
        <span>Project-scoped telemetry</span>
      </div>
    </div>
  );
}
