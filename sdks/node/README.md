# @inflowapm/node

The fail-open server-side Node.js telemetry SDK for InflowAPM. SDK-0 through SDK-5 are implemented: the package provides a bounded core client, automatic delivery with bounded retry, graceful shutdown, Express HTTP instrumentation, a real localhost example validated through PostgreSQL and analytics, and a guarded npm release pipeline.

The package is MIT licensed under [LICENSE](./LICENSE), and the project owner has confirmed control of the `@inflowapm` npm organization scope. It is not published to npm yet and intentionally retains `private: true` as the final hard lock until publication is explicitly authorized. During development, install it from a local checkout:

```bash
npm install /absolute/path/to/InflowAPM/sdks/node
```

Node.js 24 or newer is required. Node 24 LTS is the minimum production baseline and Node 26 is the current compatibility target. The package exposes ESM, CommonJS, and TypeScript declarations.

## Release readiness

`npm run release:check` runs linting, type checking, the complete isolated test suite, the open-handle regression test, and a clean tarball installation through both ESM and CommonJS. The package whitelist includes only compiled output plus npm's required metadata and documentation files.

CI repeats that release check and a dependency audit on Node 24 and Node 26. Publishing is restricted to the `Node SDK Release` workflow, an exact `node-vX.Y.Z` GitHub Release tag, and the protected `npm-production` environment. The workflow is prepared for npm trusted publishing with OIDC and provenance; it contains no npm write token. Actual publication remains disabled. See [RELEASING.md](./RELEASING.md) for the owner-only activation and release procedure and [SECURITY.md](./SECURITY.md) for private vulnerability reporting.

## Express setup

Install the middleware before application routes so it can observe every response while reading the matched route template after the response completes:

```ts
import express from "express";
import { InflowAPM } from "@inflowapm/node";

const inflow = new InflowAPM({
  apiKey: process.env.INFLOWAPM_API_KEY!,
  endpoint: "http://localhost:5002",
  service: "checkout-api",
  environment: "development",
  serviceVersion: "1.4.2",
});

const app = express();
app.use(inflow.express());

app.get("/products/:id", (_request, response) => {
  response.json({ ok: true });
});
```

The middleware records the wall-clock start time separately from monotonic `performance.now()` duration. It observes `finish` and premature `close`, never sends a response, and does not replace error middleware. A `500` is captured as HTTP telemetry with status 500; exception and stack capture are intentionally deferred rather than intercepting application errors.

Matched parameter routes stay normalized, such as `/products/:id`. An unmatched request uses `/__unmatched__`, never its raw URL. For a mounted router, supply its static, normalized mount prefix:

```ts
const api = express.Router();
api.use(inflow.express({ routePrefix: "/api" }));
api.get("/users/:id", handler);
app.use("/api", api);
```

This produces `/api/users/:id`. The prefix is explicit because Express mount values can contain resolved request parameters; copying `request.baseUrl` automatically could leak those values. Install one InflowAPM middleware per request path. Reusing the same middleware instance more than once is deduplicated.

Express is an optional peer dependency, not a required SDK runtime dependency. The adapter uses the stable middleware/response lifecycle surface shared by supported Express 4.18+ and Express 5 releases. SDK-4 exercises Express 4.22.2 and Express 5.2.1. Because the current Express 4 package declares an affected transitive `qs` range, its test-only dependency is overridden to patched `qs` 6.16.0; consumer applications remain responsible for maintaining their framework dependency tree.

## Real localhost example

The repository's consumer-style application in `examples/express` imports only the public package API and includes health, checkout, slow, error, nested parameter, and unmatched routes.

Start the existing InflowAPM backend services from the repository root, create a project through the normal API, then run the example with that project key:

```bash
docker compose up -d api

cd sdks/node
npm run build
INFLOWAPM_API_KEY="your-local-project-key" \
INFLOWAPM_ENDPOINT="http://127.0.0.1:5002" \
node examples/express/server.mjs
```

The repeatable SDK-4 end-to-end harness creates disposable user/project data, sends six real application requests, requires queue-to-PostgreSQL persistence, checks dashboard analytics and privacy, and removes its database data afterward:

```bash
npm run test:e2e
```

This requires the repository's PostgreSQL, Redis, API, and telemetry worker to be running. A `202` response alone does not pass the harness.

## Automatic delivery

`captureEvent()` and Express completion callbacks only validate and append to the bounded in-memory buffer. They do not wait for ingestion. Delivery begins when the independent flush threshold is reached, the interval expires, `flush()` is called, or `shutdown()` performs its final drain.

```ts
const inflow = new InflowAPM({
  apiKey: process.env.INFLOWAPM_API_KEY!,
  endpoint: "https://inflow.example.com",
  service: "checkout-api",
  environment: "production",
  batchSize: 100,
  maxBufferSize: 1000,
  flushThreshold: 100,
  flushIntervalMs: 5000,
  maxAttempts: 3,
});
```

The endpoint is the InflowAPM API base URL; the SDK appends `/api/v1/telemetry/ingest`. Explicit configuration supports localhost, hosted, and self-hosted deployments, including reverse-proxy base paths.

Only one flush owns delivery at a time. Timer, threshold, manual, and shutdown callers share that work. A removed batch is owned exclusively by the active flush until it succeeds or is dropped, so it cannot be double-removed or delivered by a second queue.

Retryable outcomes are network errors, request timeouts, HTTP 408, 429, and 5xx. HTTP 400, 401, 413, and other permanent client failures are not retried. The default maximum is three total attempts. Retry delays use bounded exponential full jitter; a valid `Retry-After` on 429 takes precedence but is still bounded. Randomized delay prevents many application instances from retrying in lockstep after an outage.

There is no secondary retry queue. The in-flight batch and primary fixed-capacity buffer are the complete memory bound. If producers outrun delivery, the buffer drops the newest event. Losing best-effort telemetry is safer than allowing monitoring code to exhaust host memory.

## Configuration

| Option | Default | Constraint |
| --- | ---: | --- |
| `enabled` | `true` | Disabled clients do not attach request listeners or send telemetry |
| `batchSize` | `100` | Integer from 1 through the backend maximum of 100 |
| `maxBufferSize` | `1000` | Integer from `batchSize` through 100000 |
| `flushThreshold` | `batchSize` | Integer from 1 through `maxBufferSize` |
| `flushIntervalMs` | `5000` | Positive integer; timer is unref'd |
| `requestTimeoutMs` | `5000` | Positive integer |
| `maxAttempts` | `3` | Total bounded delivery attempts |
| `retryBaseDelayMs` | `200` | Positive integer |
| `retryMaxDelayMs` | `5000` | At least the base delay |
| `shutdownTimeoutMs` | `5000` | Maximum shutdown drain time |
| `debug` | `false` | Quiet and payload-free by default |

Invalid runtime configuration disables the client instead of throwing into the host application. `getStats()` provides cheap cumulative captured, buffered, sent, dropped, retry, failed-batch, and rate-limited counts.

## Manual events and flush

Manual HTTP and application events remain available:

```ts
inflow.captureEvent({
  type: "http",
  route: "/checkout",
  method: "POST",
  status: 503,
  durationMs: 812.4,
  metadata: { region: "pk-1" },
});

inflow.captureEvent({
  type: "event",
  route: "query", // "query" | "error" | "timeout"
  durationMs: 18.2,
});

const result = await inflow.flush();
```

Batches contain at most 100 events, stay near a 90 KiB body budget, and reject individual events above 16 KiB. Public operations return structured outcomes; telemetry transport failures do not reject into normal application flow.

## Graceful shutdown

The host owns process signals. The SDK registers no `SIGINT`, `SIGTERM`, or exit handlers. Call shutdown from the lifecycle already used by the application:

```ts
process.once("SIGTERM", async () => {
  await inflow.shutdown();
  server.close();
});
```

`shutdown()` stops the flush interval and scheduled work, rejects new captures, tries to drain pending telemetry within `shutdownTimeoutMs`, aborts delivery when the limit expires, clears retained events, and releases control. It is idempotent.

Long-running servers and containers benefit from interval delivery plus explicit shutdown. Short-lived scripts should await `flush()` or `shutdown()` before exiting. Serverless handlers should call a bounded flush when their platform lifecycle permits; timers are unref'd and do not promise delivery after a frozen invocation.

## Privacy and security

Express instrumentation captures only method, normalized route, status, duration, timestamp, and protocol/service/runtime identity. It does not read or transmit raw URLs, query strings, route parameter values, authorization, cookies, headers, request/response bodies, API keys, or stack traces.

Manual metadata is opt-in application data and must contain bounded JSON values. The reserved `metadata.inflow` object contains protocol, service, environment, runtime, and SDK identity. Never embed the normal project API key in browser or mobile code; this package targets trusted server processes.

## Development

```bash
npm install
npm run lint
npm run typecheck
npm test
npm run test:open-handles
npm run test:e2e
npm run benchmark
npm pack --dry-run
```

The benchmark runs three isolated baseline/instrumented process pairs by default. It measures request-path capture separately from the later local telemetry flush. On the SDK-4 Apple M1/Node 26 run at concurrency 50 and 8,000 measured requests per sample, median throughput was 19,583 requests/second baseline and 17,164 instrumented; P50 was 2.318 ms and 2.588 ms, and P95 was 4.009 ms and 4.407 ms. These are local measurements, not a general performance claim. Run `benchmarks/run-request-path.mjs` on the intended deployment hardware before drawing capacity conclusions.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for ownership and protocol decisions and [ENGINEERING_NOTES.md](./ENGINEERING_NOTES.md) for reliability and instrumentation tradeoffs.
