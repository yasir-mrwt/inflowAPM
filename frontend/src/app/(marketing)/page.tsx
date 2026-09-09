import { BrandLockup } from "@/components/brand/brand-mark";
import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";

const neutralColors = [
  { name: "Background", value: "#050608", className: "bg-background" },
  { name: "Surface", value: "#0D1117", className: "bg-surface" },
  { name: "Elevated", value: "#151B23", className: "bg-surface-elevated" },
  { name: "Border", value: "#27303A", className: "bg-border" },
];

const signalColors = [
  { name: "Brand", value: "#45D5EE", className: "bg-brand" },
  { name: "Healthy", value: "#47C98B", className: "bg-success" },
  { name: "Warning", value: "#E8AE4A", className: "bg-warning" },
  { name: "Failure", value: "#EF6B73", className: "bg-danger" },
];

const statuses = [
  {
    label: "Healthy",
    value: "99.98%",
    detail: "All systems operational",
    dot: "bg-success",
    text: "text-success",
  },
  {
    label: "Elevated latency",
    value: "842 ms",
    detail: "P95 over the last 15 min",
    dot: "bg-warning",
    text: "text-warning",
  },
  {
    label: "Server errors",
    value: "2.4%",
    detail: "28 failed requests",
    dot: "bg-danger",
    text: "text-danger",
  },
];

function SectionHeading({
  index,
  title,
  description,
}: {
  index: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-6 grid gap-2 sm:grid-cols-[7rem_1fr] sm:gap-5">
      <p className="font-mono text-[0.6875rem] tracking-[0.16em] text-text-muted uppercase">
        {index}
      </p>
      <div>
        <h2 className="type-page text-text-primary">
          {title}
        </h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-text-secondary">
          {description}
        </p>
      </div>
    </div>
  );
}

function ColorSwatch({
  name,
  value,
  className,
}: {
  name: string;
  value: string;
  className: string;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-border-subtle bg-surface-inset">
      <div className={`h-16 border-b border-border-subtle ${className}`} />
      <div className="flex items-center justify-between gap-3 p-3">
        <span className="text-xs font-medium text-text-secondary">{name}</span>
        <code className="font-mono text-[0.6875rem] text-text-muted">
          {value}
        </code>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-background px-[var(--page-gutter)] pt-28 pb-12 sm:pt-32 sm:pb-16">
      <div className="mx-auto w-full max-w-[var(--content-width)]">
        <header className="flex flex-col gap-8 border-b border-border-subtle pb-10 sm:flex-row sm:items-start sm:justify-between">
          <BrandLockup className="size-11" priority />
          <div className="max-w-2xl sm:text-right">
            <p className="type-meta font-mono text-brand">
              Design system · F1
            </p>
            <h1 className="type-section mt-3 text-balance text-text-primary">
              Human interface. Machine precision.
            </h1>
            <p className="mt-3 text-sm leading-6 text-text-secondary sm:ml-auto sm:max-w-xl">
              Dark graphite surfaces keep attention on the data. Cyan identifies
              primary actions; operational states retain their own meaning.
            </p>
          </div>
        </header>

        <div className="divide-y divide-border-subtle">
          <section className="py-[var(--section-space)]">
            <SectionHeading
              index="01 / Type"
              title="Typography"
              description="Instrument Sans carries the human interface. IBM Plex Mono is reserved for measurements, routes, identifiers, timestamps, and code."
            />

            <Surface className="grid gap-8 md:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.6fr)]">
              <div>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-border-subtle pb-6">
                  <span className="type-card text-text-primary">InflowAPM</span>
                  <span className="type-nav text-text-secondary">Product</span>
                  <span className="type-nav text-text-secondary">Architecture</span>
                  <span className="type-nav text-text-secondary">Docs</span>
                  <Button size="sm" className="sm:ml-auto">
                    Start monitoring
                  </Button>
                </div>
                <p className="type-hero mt-10 max-w-4xl text-balance text-text-primary">
                  Observe what your API is actually doing.
                </p>
                <p className="type-body mt-6 max-w-2xl text-text-secondary">
                  Application performance monitoring for developers who need to
                  know where requests slow down and why failures happen.
                </p>
              </div>
              <div className="space-y-6 border-t border-border-subtle pt-6 md:border-t-0 md:border-l md:pt-0 md:pl-6">
                <div>
                  <p className="type-meta text-text-muted">P95 latency</p>
                  <code className="type-metric mt-2 block text-warning">
                    842 ms
                  </code>
                </div>
                <div>
                  <p className="type-meta text-text-muted">Requests</p>
                  <code className="type-metric mt-2 block text-text-primary">
                    2,481 / min
                  </code>
                </div>
                <div className="space-y-2 border-t border-border-subtle pt-5">
                  <code className="type-table block font-mono text-brand-steel">
                    POST /api/v1/checkout
                  </code>
                  <code className="type-table block font-mono text-danger">
                    500 INTERNAL_SERVER_ERROR
                  </code>
                  <code className="type-table block font-mono text-text-muted">
                    2026-09-09 18:42:17
                  </code>
                  <code className="type-table block overflow-x-auto rounded-sm border border-border-subtle bg-background px-3 py-2 font-mono text-text-secondary">
                    npm install @inflowapm/node
                  </code>
                </div>
              </div>
            </Surface>
          </section>

          <section className="py-[var(--section-space)]">
            <SectionHeading
              index="02 / Color"
              title="Color system"
              description="Neutral values form the product; signal colors are used only when they communicate hierarchy or telemetry state."
            />

            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <p className="mb-3 text-xs font-medium text-text-muted">
                  Neutral foundation
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
                  {neutralColors.map((color) => (
                    <ColorSwatch key={color.name} {...color} />
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-3 text-xs font-medium text-text-muted">
                  Controlled signals
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
                  {signalColors.map((color) => (
                    <ColorSwatch key={color.name} {...color} />
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="py-[var(--section-space)]">
            <SectionHeading
              index="03 / Actions"
              title="Buttons"
              description="A small action vocabulary keeps intent obvious and provides consistent keyboard, disabled, and destructive states."
            />

            <Surface tone="inset" className="flex flex-wrap items-center gap-3">
              <Button>Start monitoring</Button>
              <Button variant="secondary">View dashboard</Button>
              <Button variant="outline">Documentation</Button>
              <Button variant="ghost">Cancel</Button>
              <Button variant="destructive">Delete project</Button>
              <Button disabled>Disabled</Button>
            </Surface>
          </section>

          <section className="py-[var(--section-space)]">
            <SectionHeading
              index="04 / Surfaces"
              title="Surface hierarchy"
              description="Borders and small tonal shifts separate information. Elevation is structural, not ornamental."
            />

            <div className="grid gap-4 md:grid-cols-3">
              <Surface tone="inset">
                <p className="font-mono text-[0.6875rem] tracking-[0.14em] text-text-muted uppercase">
                  Inset
                </p>
                <p className="mt-4 text-sm font-medium text-text-primary">
                  Dense controls and data wells
                </p>
                <p className="mt-2 text-sm leading-6 text-text-secondary">
                  Used when information should sit behind the default plane.
                </p>
              </Surface>
              <Surface>
                <p className="font-mono text-[0.6875rem] tracking-[0.14em] text-text-muted uppercase">
                  Default
                </p>
                <p className="mt-4 text-sm font-medium text-text-primary">
                  Primary content regions
                </p>
                <p className="mt-2 text-sm leading-6 text-text-secondary">
                  The standard container for grouped product information.
                </p>
              </Surface>
              <Surface tone="elevated">
                <p className="font-mono text-[0.6875rem] tracking-[0.14em] text-brand-steel uppercase">
                  Elevated
                </p>
                <p className="mt-4 text-sm font-medium text-text-primary">
                  Focused or floating context
                </p>
                <p className="mt-2 text-sm leading-6 text-text-secondary">
                  Reserved for selected content, menus, and overlays.
                </p>
              </Surface>
            </div>
          </section>

          <section className="py-[var(--section-space)]">
            <SectionHeading
              index="05 / Signals"
              title="Telemetry states"
              description="Health colors preserve stable meaning across analytics, incidents, timelines, and status messaging."
            />

            <Surface padding="none" className="divide-y divide-border-subtle">
              {statuses.map((status) => (
                <div
                  key={status.label}
                  className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      className={`mt-1.5 size-2 shrink-0 rounded-full ${status.dot}`}
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-primary">
                        {status.label}
                      </p>
                      <p className="mt-0.5 text-xs text-text-muted">
                        {status.detail}
                      </p>
                    </div>
                  </div>
                  <code
                    className={`font-mono text-sm font-medium ${status.text}`}
                  >
                    {status.value}
                  </code>
                </div>
              ))}
            </Surface>
          </section>

          <section className="py-[var(--section-space)]">
            <SectionHeading
              index="06 / Logo"
              title="Logo treatment"
              description="The approved mark stays on black, without extra glow, gradients, or recoloring. The cyan wordmark accent is reserved for APM."
            />

            <Surface tone="inset" className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
              <BrandLockup className="size-14" labelClassName="text-xl" />
              <p className="max-w-md text-sm leading-6 text-text-secondary sm:text-right">
                Clear space protects the mark. On compact surfaces the square mark
                may stand alone with an accessible text label supplied by its link
                or surrounding control.
              </p>
            </Surface>
          </section>
        </div>
      </div>
    </main>
  );
}
