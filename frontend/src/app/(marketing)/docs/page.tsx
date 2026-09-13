import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ArrowRight, BookOpen, Check, CircleAlert, ExternalLink, ShieldCheck } from "lucide-react";

import { absoluteUrl } from "@/lib/site";

const githubSdkUrl = "https://github.com/yasir-mrwt/inflowAPM/tree/main/sdks/node";
const description =
  "Integrate the InflowAPM Node.js SDK with Express, configure environments, and understand telemetry reliability and privacy.";

export const metadata: Metadata = {
  title: "Node.js SDK documentation",
  description,
  alternates: { canonical: "/docs" },
  openGraph: {
    type: "article",
    url: "/docs",
    siteName: "InflowAPM",
    title: "Node.js SDK documentation · InflowAPM",
    description,
    images: [{ url: "/brand/inflowapm-logo.png", alt: "InflowAPM" }],
  },
  twitter: {
    card: "summary",
    title: "Node.js SDK documentation · InflowAPM",
    description,
    images: ["/brand/inflowapm-logo.png"],
  },
};

const navigation = [
  ["getting-started", "Getting started"],
  ["configuration", "Configuration"],
  ["express", "Express integration"],
  ["automatic-monitoring", "Automatic monitoring"],
  ["manual-events", "Manual events"],
  ["development", "Local development"],
  ["deployment", "Deployment"],
  ["reliability", "Reliability"],
  ["privacy", "Security & privacy"],
  ["architecture", "Architecture"],
  ["troubleshooting", "Troubleshooting"],
] as const;

const quickstart = `import express from "express";
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
app.get("/health", (_request, response) => response.send("ok"));

app.listen(3000);`;

const environmentExample = `INFLOWAPM_API_KEY=iapm_project_key
INFLOWAPM_ENDPOINT=http://127.0.0.1:5002
INFLOWAPM_SERVICE=checkout-api
INFLOWAPM_ENVIRONMENT=development
INFLOWAPM_SERVICE_VERSION=1.4.0`;

const projectApiExample = `# You can create a project in the dashboard or through the API.
curl -X POST http://127.0.0.1:5002/api/v1/auth/register \\
  -H "Content-Type: application/json" \\
  -d '{"email":"dev@example.com","password":"replace-me","first_name":"Developer","last_name":"Example"}'

curl -X POST http://127.0.0.1:5002/api/v1/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"dev@example.com","password":"replace-me"}'

curl -X POST http://127.0.0.1:5002/api/v1/projects \\
  -H "Authorization: Bearer USER_ACCESS_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Checkout API"}'`;

const manualEventExample = `const result = inflow.captureEvent({
  type: "event",
  route: "query",
  durationMs: 87,
  metadata: { operation: "load_checkout" },
});

if (!result.accepted) {
  console.warn(result.reason);
}`;

const routerExample = `const api = express.Router();

api.use(inflow.express({ routePrefix: "/api" }));
api.get("/orders/:orderId", getOrder);
app.use("/api", api);`;

const shutdownExample = `process.once("SIGTERM", async () => {
  await inflow.shutdown();
  server.close();
});`;

const configuration = [
  ["apiKey", "required", "Project API key. Keep it on the server."],
  ["endpoint", "required", "HTTP(S) InflowAPM base URL; the SDK appends the ingestion path."],
  ["service", "required", "Stable service name, such as checkout-api."],
  ["environment", "required", "Deployment name, such as development, staging, or production."],
  ["serviceVersion", "optional", "Release version attached to telemetry."],
  ["enabled", "true", "Disable capture without removing instrumentation."],
  ["batchSize", "100", "Maximum events in one backend-compatible batch."],
  ["maxBufferSize", "1000", "Bounded in-memory event capacity."],
  ["flushThreshold", "batch size", "Buffered event count that schedules delivery."],
  ["flushIntervalMs", "5000", "Background delivery interval."],
  ["requestTimeoutMs", "5000", "Timeout for each ingestion request."],
  ["maxAttempts", "3", "Total delivery attempts for retryable failures."],
  ["shutdownTimeoutMs", "5000", "Bound for the final shutdown drain."],
  ["debug", "false", "Safe lifecycle diagnostics without payloads or keys."],
] as const;

function CodeBlock({
  label,
  language = "Node.js",
  children,
}: {
  label: string;
  language?: string;
  children: string;
}) {
  return (
    <div className="my-6 min-w-0 border border-border-subtle bg-surface-inset">
      <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
        <span className="font-mono text-[0.6875rem] text-text-muted">{label}</span>
        <span className="font-mono text-[0.625rem] text-brand-steel">{language}</span>
      </div>
      <div
        className="overflow-x-auto overscroll-x-contain p-4 focus-visible:outline-offset-[-2px] sm:p-5"
        role="region"
        aria-label={`${label} code example`}
        tabIndex={0}
      >
        <pre className="min-w-max font-mono text-xs leading-6 text-text-secondary">
          <code>{children}</code>
        </pre>
      </div>
    </div>
  );
}

function DocSection({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-28 border-t border-border-subtle py-12 first:border-t-0 first:pt-0 sm:py-16">
      <p className="type-meta text-brand-steel">{eyebrow}</p>
      <h2 id={`${id}-title`} className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-text-primary sm:text-3xl">
        {title}
      </h2>
      <div className="mt-5 text-sm leading-7 text-text-secondary">{children}</div>
    </section>
  );
}

function Callout({ children, warning = false }: { children: ReactNode; warning?: boolean }) {
  const Icon = warning ? CircleAlert : ShieldCheck;
  return (
    <div className={`my-6 flex gap-3 border p-4 ${warning ? "border-warning/25 bg-warning-muted/35" : "border-brand/20 bg-brand-muted/20"}`}>
      <Icon size={16} className={`mt-1 shrink-0 ${warning ? "text-warning" : "text-brand-steel"}`} aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}

export default function DocumentationPage() {
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "TechArticle",
      headline: "InflowAPM Node.js SDK documentation",
      description,
      url: absoluteUrl("/docs"),
      author: { "@type": "Organization", name: "InflowAPM" },
      publisher: { "@type": "Organization", name: "InflowAPM" },
      about: "Server-side Node.js application performance monitoring",
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
        { "@type": "ListItem", position: 2, name: "Documentation", item: absoluteUrl("/docs") },
      ],
    },
  ];

  return (
    <main className="pt-24 sm:pt-28">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
      />
      <header className="border-b border-border-subtle">
        <div className="mx-auto w-full max-w-[var(--content-width)] px-[var(--page-gutter)] py-14 sm:py-20">
          <div className="flex items-center gap-3 text-brand-steel">
            <BookOpen size={16} aria-hidden="true" />
            <p className="type-meta">Documentation · Node.js SDK 0.1.0</p>
          </div>
          <h1 className="type-section mt-5 max-w-[50rem] text-balance text-text-primary">
            Add InflowAPM to an Express application.
          </h1>
          <p className="type-body mt-6 max-w-[43rem] text-text-secondary">
            Install the SDK, add a project key, instrument Express, and send your
            first request. Reliability and architecture details follow the quickstart.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#getting-started" className="inline-flex h-10 items-center gap-2 rounded-md bg-brand px-4 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand-hover">
              Start integrating <ArrowRight size={14} aria-hidden="true" />
            </a>
            <a href={githubSdkUrl} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-4 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary">
              Package source <ExternalLink size={13} aria-hidden="true" />
            </a>
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-[var(--content-width)] gap-12 px-[var(--page-gutter)] py-12 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-16 lg:py-16">
        <aside aria-label="Documentation table of contents" className="hidden lg:block">
          <nav className="sticky top-24 border-l border-border-subtle pl-5">
            <p className="type-meta mb-4 text-text-muted">On this page</p>
            <ul className="space-y-1">
              {navigation.map(([href, label]) => (
                <li key={href}>
                  <a href={`#${href}`} className="block rounded-sm py-1.5 text-xs text-text-muted transition-colors hover:text-text-primary">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <article className="min-w-0 max-w-[50rem]">
          <DocSection id="getting-started" eyebrow="Getting started" title="From install to first telemetry">
            <p>Use Node.js 24 or newer. Express 4.18 and Express 5 are supported. Express is an optional peer dependency, so non-Express applications can still use the manual event API.</p>
            <Callout>
              <p><strong className="font-medium text-text-primary">Available on npm:</strong> Install the public <code className="font-mono text-xs">@inflowapm/node</code> package with the command below.</p>
            </Callout>
            <CodeBlock label="terminal" language="Shell">npm install @inflowapm/node</CodeBlock>

            <h3 className="mt-9 text-lg font-semibold text-text-primary">1. Create a project key</h3>
            <p className="mt-3">Registration, sign-in, session refresh, sign-out, and password recovery are connected to the current authentication API. After signing in, create a project and copy the <code className="font-mono text-xs text-text-primary">api_key</code> from the creation response. It is returned in raw form only when the project is created.</p>
            <CodeBlock label="project-key.sh" language="Shell">{projectApiExample}</CodeBlock>

            <h3 className="mt-9 text-lg font-semibold text-text-primary">2. Configure the service</h3>
            <CodeBlock label=".env" language="Environment">{environmentExample}</CodeBlock>

            <h3 className="mt-9 text-lg font-semibold text-text-primary">3. Instrument Express</h3>
            <CodeBlock label="server.js">{quickstart}</CodeBlock>

            <h3 className="mt-9 text-lg font-semibold text-text-primary">4. Run and verify</h3>
            <p className="mt-3">Start the application, send a request with a browser, curl, or Postman, then call <code className="font-mono text-xs text-text-primary">await inflow.flush()</code> while testing. Inspect the flush result or <code className="font-mono text-xs text-text-primary">inflow.getStats()</code>. The current analytics API is <code className="break-all font-mono text-xs text-text-primary">GET /api/v1/telemetry/analytics/dashboard?project_id=PROJECT_ID&amp;range=24h</code> and uses the user access token.</p>
          </DocSection>

          <DocSection id="configuration" eyebrow="Using the SDK" title="Configuration reference">
            <p>Pass configuration explicitly at startup. The SDK validates it without throwing into application startup; invalid configuration disables telemetry and appears in <code className="font-mono text-xs text-text-primary">getStats().configurationIssue</code>.</p>
            <div className="my-6 overflow-x-auto border border-border-subtle" role="region" aria-label="SDK configuration options" tabIndex={0}>
              <table className="w-full min-w-[42rem] border-collapse text-left text-xs">
                <thead className="bg-surface-inset text-text-muted">
                  <tr><th className="px-4 py-3 font-medium">Option</th><th className="px-4 py-3 font-medium">Default</th><th className="px-4 py-3 font-medium">Purpose</th></tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {configuration.map(([option, defaultValue, purpose]) => (
                    <tr key={option}><th scope="row" className="px-4 py-3 font-mono font-medium text-text-primary">{option}</th><td className="px-4 py-3 font-mono text-text-muted">{defaultValue}</td><td className="px-4 py-3 text-text-secondary">{purpose}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>The endpoint must be an HTTP(S) base URL without credentials, query parameters, or a fragment. If it includes a path, the SDK preserves it and appends <code className="font-mono text-xs text-text-primary">/api/v1/telemetry/ingest</code>.</p>
          </DocSection>

          <DocSection id="express" eyebrow="Using the SDK" title="Express integration">
            <p>Install <code className="font-mono text-xs text-text-primary">inflow.express()</code> before the routes you want to observe. The middleware records the matched route template after the response finishes, avoiding high-cardinality raw URLs.</p>
            <CodeBlock label="mounted-router.js">{routerExample}</CodeBlock>
            <p>Mounted routers can provide <code className="font-mono text-xs text-text-primary">routePrefix</code>. Requests with no matched route are recorded as <code className="font-mono text-xs text-text-primary">/__unmatched__</code>. Supported methods are GET, POST, PUT, PATCH, DELETE, OPTIONS, and HEAD.</p>
          </DocSection>

          <DocSection id="automatic-monitoring" eyebrow="Using the SDK" title="Automatic HTTP monitoring">
            <p>The middleware records the normalized route, method, response status, duration, timestamp, service, environment, and optional service version. It also marks a response that closes before completion. It does not automatically capture thrown error objects or stack traces.</p>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {["Stable route templates", "Response status", "Request duration", "Premature close metadata"].map((item) => (
                <li key={item} className="flex gap-2 border border-border-subtle bg-surface-inset p-3"><Check size={14} className="mt-1 shrink-0 text-success" aria-hidden="true" /><span>{item}</span></li>
              ))}
            </ul>
          </DocSection>

          <DocSection id="manual-events" eyebrow="Using the SDK" title="Manual events">
            <p>Use <code className="font-mono text-xs text-text-primary">captureEvent()</code> for supported application work that is not represented by an HTTP request. Application event routes are currently <code className="font-mono text-xs text-text-primary">query</code>, <code className="font-mono text-xs text-text-primary">error</code>, and <code className="font-mono text-xs text-text-primary">timeout</code>.</p>
            <CodeBlock label="manual-event.js">{manualEventExample}</CodeBlock>
            <p>The return value reports whether the event was accepted into the local buffer. It does not claim that the backend has persisted the event.</p>
          </DocSection>

          <DocSection id="development" eyebrow="Development" title="Localhost and debugging">
            <p>Use <code className="font-mono text-xs text-text-primary">http://127.0.0.1:5002</code> when the application and InflowAPM backend run directly on the same machine. From a container, use a hostname reachable from that container instead of assuming its own localhost points to the host.</p>
            <div className="my-6 grid gap-px overflow-hidden border border-border-subtle bg-border-subtle sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-stretch">
              {[
                ["Browser / curl / Postman", "send request"],
                ["localhost:3000", "your Express app"],
                ["InflowAPM :5002", "receives telemetry"],
              ].map(([title, detail], index) => (
                <div className="contents" key={title}>
                  <div className="bg-surface-inset p-4"><p className="text-xs font-medium text-text-primary">{title}</p><p className="mt-2 font-mono text-[0.625rem] text-text-muted">{detail}</p></div>
                  {index < 2 ? <span className="hidden items-center bg-surface-inset px-2 text-text-muted sm:flex" aria-hidden="true">→</span> : null}
                </div>
              ))}
            </div>
            <p>Set <code className="font-mono text-xs text-text-primary">debug: true</code> only while diagnosing. Debug output covers lifecycle classifications and never logs the project key or event payload.</p>
          </DocSection>

          <DocSection id="deployment" eyebrow="Deployment" title="Staging, production, and self-hosting">
            <p>Keep one stable service name across deployments and change the explicit environment value. Point <code className="font-mono text-xs text-text-primary">endpoint</code> at the reachable InflowAPM base URL for each environment. Environment filtering is not yet present in the frontend, so the configuration distinction is captured in telemetry rather than advertised as a dashboard control.</p>
            <CodeBlock label="shutdown.js">{shutdownExample}</CodeBlock>
            <p>The host application owns process signals. Call <code className="font-mono text-xs text-text-primary">shutdown()</code> from its existing shutdown path; the SDK does not install signal handlers or keep the process alive solely for telemetry.</p>
          </DocSection>

          <DocSection id="reliability" eyebrow="Reliability" title="Bounded, retrying, and fail-open">
            <p>The middleware performs validation and a bounded in-memory append after the response lifecycle. Background delivery starts at the threshold, on the interval, after an explicit <code className="font-mono text-xs text-text-primary">flush()</code>, or during <code className="font-mono text-xs text-text-primary">shutdown()</code>.</p>
            <dl className="mt-6 divide-y divide-border-subtle border-y border-border-subtle">
              {[
                ["Buffering", "The default buffer holds 1,000 events. New events are dropped when it is full; memory does not grow without a bound."],
                ["Retry", "Network failures, timeouts, 408, 429, and 5xx responses retry with full-jitter backoff. Retry-After is respected."],
                ["Permanent failures", "400, 401, 403, 413, 422, and other non-retryable 4xx responses are classified without an endless retry loop."],
                ["Fail-open", "Capture and delivery errors do not throw through the application request path."],
                ["Rate limiting", "Backend 429 responses are counted and retried within the configured attempt limit; the SDK does not bypass server limits."],
              ].map(([term, detail]) => (
                <div key={term} className="grid gap-2 py-4 sm:grid-cols-[9rem_minmax(0,1fr)]"><dt className="font-medium text-text-primary">{term}</dt><dd>{detail}</dd></div>
              ))}
            </dl>
          </DocSection>

          <DocSection id="privacy" eyebrow="Security & privacy" title="Keep credentials and payload data out">
            <Callout>
              <p><strong className="font-medium text-text-primary">Server-side only.</strong> Never embed a project API key in browser, mobile, or other distributed client code. Treat it as a secret and rotate it if exposed.</p>
            </Callout>
            <p>Automatic Express instrumentation records route templates and timing data. It does not read the raw URL, query values, route parameter values, headers, authorization, cookies, or request and response bodies. It does not collect stack traces automatically. Manual identity fields and metadata are opt-in, so review them before sending sensitive or regulated data.</p>
          </DocSection>

          <DocSection id="architecture" eyebrow="Architecture" title="Request path and telemetry path">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="border border-border-subtle bg-surface-inset p-5"><h3 className="font-medium text-text-primary">Request path</h3><p className="mt-3">Client → Express middleware → route handler → application response</p></div>
              <div className="border border-brand/20 bg-brand-muted/15 p-5"><h3 className="font-medium text-text-primary">Telemetry path</h3><p className="mt-3">Lifecycle callback → bounded buffer → retrying batch delivery → ingestion API → BullMQ → PostgreSQL analytics</p></div>
            </div>
            <p className="mt-6">The SDK is responsible through authenticated ingestion. The backend accepts batches, processes them asynchronously through BullMQ, stores project-scoped events in PostgreSQL, and exposes analytics through the current API.</p>
          </DocSection>

          <DocSection id="troubleshooting" eyebrow="Reference" title="Troubleshooting and current limits">
            <div className="space-y-7">
              <div><h3 className="font-medium text-text-primary">No events are visible</h3><p className="mt-2">Inspect <code className="font-mono text-xs text-text-primary">getStats()</code>, verify the project key and server-reachable endpoint, install middleware before routes, and call <code className="font-mono text-xs text-text-primary">await inflow.flush()</code> while testing.</p></div>
              <div><h3 className="font-medium text-text-primary">Dynamic IDs appear in routes</h3><p className="mt-2">Confirm Express matched a declared route and that the middleware can observe it. Use <code className="font-mono text-xs text-text-primary">routePrefix</code> for mounted routers. Raw unmatched paths intentionally become <code className="font-mono text-xs text-text-primary">/__unmatched__</code>.</p></div>
              <div><h3 className="font-medium text-text-primary">The process exits before delivery</h3><p className="mt-2">Await <code className="font-mono text-xs text-text-primary">flush()</code> in short-lived tasks or <code className="font-mono text-xs text-text-primary">shutdown()</code> in the host shutdown path. Unreferenced timers do not guarantee delivery after a serverless runtime freezes an invocation.</p></div>
              <div><h3 className="font-medium text-text-primary">Current limitations</h3><p className="mt-2">The SDK does not patch Express globally, capture stack traces automatically, persist its local buffer to disk, install process signal handlers, or provide browser/mobile instrumentation. Python support is not implemented yet.</p></div>
            </div>
            <p className="mt-10 border-t border-border-subtle pt-6">For exact option ranges, typed return values, and package engineering notes, read the <a href={githubSdkUrl} target="_blank" rel="noreferrer" className="font-medium text-brand-steel underline decoration-border underline-offset-4 hover:text-brand">package README and source</a>.</p>
          </DocSection>
        </article>
      </div>
    </main>
  );
}
