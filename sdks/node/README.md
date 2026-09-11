# @inflowapm/node

The official server-side Node.js SDK for InflowAPM. It instruments Express requests, builds privacy-conscious telemetry, buffers it within a fixed memory limit, and sends bounded batches without placing telemetry network calls directly on your application response path.

`@inflowapm/node` is release-ready at version `0.1.0`, but it is **not published to npm yet**. The final install command will be:

```bash
npm install @inflowapm/node
```

Until the controlled first release, install from a local checkout:

```bash
npm install /absolute/path/to/InflowAPM/sdks/node
```

The package is MIT licensed. Its manifest is activated for the controlled first release, while the exact-tag, clean-tree release guard still blocks unreviewed publication. No publish command has been run.

## Requirements

- Node.js 24 or newer
- A trusted server-side Node.js process; never use a project API key in browser or mobile code
- Express 4.18+ or Express 5 when using automatic HTTP instrumentation
- An InflowAPM project API key
- The base URL of a local, hosted, or self-hosted InflowAPM API

The package exposes ESM, CommonJS, and TypeScript declarations. Express is an optional peer dependency, so the core client has no required runtime dependencies.

## Quickstart

### 1. Create an InflowAPM project

The authentication and project APIs exist today. The connected project dashboard UI is planned but not implemented, so local developers currently register, log in, and create projects through the API.

Start the local API and infrastructure from the repository root:

```bash
docker compose up -d api
```

Register at `POST http://127.0.0.1:5002/api/v1/auth/register`, then log in at `POST http://127.0.0.1:5002/api/v1/auth/login`. Create a project with the returned user access token:

```bash
curl -X POST http://127.0.0.1:5002/api/v1/projects \
  -H "Authorization: Bearer $INFLOWAPM_USER_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Checkout API"}'
```

The creation response returns the project `id` and `api_key`. Save the key securely when it is created; normal project-list responses omit it.

### 2. Configure the server process

```bash
INFLOWAPM_API_KEY=replace-with-project-key
INFLOWAPM_ENDPOINT=http://127.0.0.1:5002
INFLOWAPM_SERVICE=checkout-api
INFLOWAPM_ENVIRONMENT=development
INFLOWAPM_SERVICE_VERSION=1.0.0
```

`INFLOWAPM_ENDPOINT` is the InflowAPM API base URL, not the ingestion path. The SDK appends `/api/v1/telemetry/ingest`.

### 3. Initialize and instrument Express

Install the middleware before application routes:

```ts
import express from "express";
import { InflowAPM } from "@inflowapm/node";

const inflow = new InflowAPM({
  apiKey: process.env.INFLOWAPM_API_KEY!,
  endpoint: process.env.INFLOWAPM_ENDPOINT!,
  service: process.env.INFLOWAPM_SERVICE ?? "checkout-api",
  environment: process.env.INFLOWAPM_ENVIRONMENT ?? "development",
  serviceVersion: process.env.INFLOWAPM_SERVICE_VERSION ?? "1.0.0",
});

const app = express();
app.use(inflow.express());

app.post("/checkout", (_request, response) => {
  response.status(201).json({ accepted: true });
});

const server = app.listen(3000);

process.once("SIGTERM", async () => {
  await inflow.shutdown();
  server.close();
});
```

### 4. Run and verify

Run your application normally, then generate traffic from a browser, frontend, curl, or Postman:

```bash
curl -X POST http://127.0.0.1:3000/checkout
```

Postman sends and tests the request. InflowAPM observes how the server handled it after it reached Express: the method, normalized route, status, duration, and configured service identity.

Telemetry ingestion is asynchronous. The current analytics API is available at `GET /api/v1/telemetry/analytics/dashboard?project_id=...&range=24h` with the user access token. The repository's `npm run test:e2e` harness also verifies the complete application-to-analytics flow. Do not wait for a nonexistent dashboard UI during local setup.

## API key and endpoint

`apiKey` is the secret key returned when a project is created. It authenticates telemetry ingestion for exactly that project. Keep it in a server-side secret store or environment variable; do not commit it, log it, send it to the browser, or place it in public frontend configuration.

`endpoint` is the base address of the InflowAPM API:

```ts
// Local InflowAPM
endpoint: "http://127.0.0.1:5002"

// Hosted InflowAPM, when a hosted URL is supplied
endpoint: "https://apm.example.com"

// Self-hosted behind a reverse-proxy base path
endpoint: "https://observability.example.com/inflow"
```

HTTP and HTTPS are supported. Credentials, query strings, and fragments are not accepted in the endpoint URL. A reverse-proxy path is preserved before the SDK appends the ingestion route.

## Configuration

The four required options identify where telemetry goes and which application produced it:

| Option | Meaning | Constraint |
| --- | --- | --- |
| `apiKey` | Project-scoped ingestion secret | Non-empty token without whitespace, at most 512 characters |
| `endpoint` | Local, hosted, or self-hosted API base URL | HTTP(S), at most 2,048 characters |
| `service` | Stable application/service name, such as `checkout-api` | 1–100 characters |
| `environment` | Deployment label, such as `development`, `staging`, or `production` | 1–64 characters |
| `serviceVersion` | Optional deployed version | 1–100 characters when set |

Reliability options have bounded defaults:

| Option | Default | Constraint |
| --- | ---: | --- |
| `enabled` | `true` | Boolean; disabled clients do not attach response listeners or send telemetry |
| `batchSize` | `100` | Integer from 1 through 100 |
| `maxBufferSize` | `1000` | Integer from `batchSize` through 100,000 |
| `flushThreshold` | `batchSize` | Integer from 1 through `maxBufferSize` |
| `flushIntervalMs` | `5000` | Integer from 1 through 3,600,000 |
| `requestTimeoutMs` | `5000` | Integer from 1 through 60,000 |
| `maxAttempts` | `3` | Total attempts, from 1 through 10 |
| `retryBaseDelayMs` | `200` | Positive integer, no greater than the retry maximum |
| `retryMaxDelayMs` | `5000` | Positive integer, at most 300,000 |
| `shutdownTimeoutMs` | `5000` | Integer from 1 through 60,000 |
| `debug` | `false` | Boolean; logs lifecycle diagnostics without payloads or the API key |

Invalid configuration disables telemetry and is exposed through `getStats().configurationIssue`; construction does not throw into application startup.

## Development, staging, and production

Use the same integration everywhere. Change configuration, not SDK architecture:

```ts
const inflow = new InflowAPM({
  apiKey: process.env.INFLOWAPM_API_KEY!,
  endpoint: process.env.INFLOWAPM_ENDPOINT!,
  service: "checkout-api",
  environment: process.env.NODE_ENV ?? "development",
  ...(process.env.APP_VERSION
    ? { serviceVersion: process.env.APP_VERSION }
    : {}),
});
```

Keep `service` stable when the same logical service moves through environments. Set `environment` to the deployment label and `serviceVersion` to the deployed build. These values are attached to telemetry; the current frontend does not yet provide environment filtering.

## Express instrumentation

`inflow.express()` returns standard Express middleware. Install it before routes so it can observe response completion and then read the matched route template:

```ts
app.use(inflow.express());
app.get("/products/:id", handler);
```

The recorded route is `/products/:id`, not a real product identifier. An unmatched request is recorded as `/__unmatched__`, never as its raw URL.

For a mounted router, provide a static normalized prefix:

```ts
const api = express.Router();
api.use(inflow.express({ routePrefix: "/api" }));
api.get("/users/:id", handler);
app.use("/api", api);
```

This records `/api/users/:id`. Do not derive `routePrefix` from request input. Install one SDK middleware on each request path; repeated use of the same middleware instance is deduplicated.

The middleware observes `finish` and premature `close`, calls `next()`, never sends a response, and does not replace error middleware. An application-generated `500` is recorded as HTTP status telemetry, but automatic exception objects and stack traces are outside the current SDK scope.

## Manual capture

Use `captureEvent()` when instrumentation is not appropriate or when recording supported application events:

```ts
const httpResult = inflow.captureEvent({
  type: "http",
  route: "/checkout",
  method: "POST",
  status: 503,
  durationMs: 812.4,
  metadata: { region: "pk-1" },
});

const queryResult = inflow.captureEvent({
  type: "event",
  route: "query", // query | error | timeout
  durationMs: 18.2,
});
```

Manual HTTP methods are `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`, and `HEAD`. Metadata must be JSON-safe and bounded. Optional identity fields are `userId`, `anonymousId`, `email`, and `ip`; adding them is an application privacy decision.

Both calls return a structured acceptance result. They do not throw for ordinary validation, buffer, shutdown, or disabled-client outcomes.

## Request path and telemetry path

Telemetry delivery is not an awaited HTTP call inside Express request handling:

```text
REQUEST PATH                    TELEMETRY PATH

request                         completed HTTP event
   ↓                                  ↓
Express application             @inflowapm/node
   ↓                                  ↓
response to caller              bounded memory buffer
                                      ↓
                                    batch
                                      ↓
                              InflowAPM ingestion
```

The response lifecycle callback performs bounded validation and an in-memory append. Delivery begins independently when the threshold is reached, the interval expires, `flush()` is called, or `shutdown()` performs its final drain.

SDK performance has been benchmarked under local load. Results show measurable overhead and are environment-specific; see [`benchmarks/README.md`](./benchmarks/README.md) and run the benchmark on representative hardware before drawing capacity conclusions.

## Batching, retries, and fail-open behavior

- Batches contain at most 100 events and stay near a 90 KiB request-body budget.
- Individual events above 16 KiB are rejected.
- The fixed-capacity buffer defaults to 1,000 events and drops the newest event when full.
- Only one flush owns delivery at a time; concurrent triggers share it.
- Network failures, timeouts, HTTP 408, 429, and 5xx responses are retryable.
- Authentication, validation, and other permanent 4xx responses are not retried.
- Retry uses bounded exponential full jitter. A valid `Retry-After` response is honored within the configured maximum.
- The default three attempts are total attempts, not three retries after the first request.

Telemetry failures return structured results and do not reject into the application's normal request flow. “Fail open” means monitoring failure does not intentionally fail the host request; it does not mean telemetry is guaranteed during process crashes or sustained outages.

Use `getStats()` for cumulative captured, buffered, sent, dropped, retry, failed-batch, and rate-limited counts. Debug logging is quiet by default and never logs event payloads or the project key.

## Flush and graceful shutdown

`await inflow.flush()` drains a snapshot of currently buffered events. It returns counts and an optional classified failure.

The host owns signals and process lifecycle. The SDK does not register `SIGINT`, `SIGTERM`, or exit handlers:

```ts
process.once("SIGTERM", async () => {
  const result = await inflow.shutdown();
  if (!result.ok) {
    console.warn("Telemetry shutdown was incomplete", result.failure);
  }
  server.close();
});
```

`shutdown()` is idempotent. It stops scheduled work, rejects new captures, attempts a final bounded drain, aborts delivery at `shutdownTimeoutMs`, clears retained events, and releases control.

Short-lived scripts should await `flush()` or `shutdown()` before exit. Serverless runtimes should use a bounded flush when their lifecycle permits it; unref'd timers do not guarantee delivery after an invocation is frozen.

## Localhost, hosted, and self-hosted operation

A local application and local InflowAPM instance are separate processes:

```text
Browser / frontend / Postman
             ↓
   your API on localhost:3000
             ↓ observed by
      @inflowapm/node
             ↓ batched telemetry
 InflowAPM API on localhost:5002
```

The caller interacts with your API exactly as before. The SDK observes the Express response and independently sends telemetry to the configured InflowAPM endpoint.

For hosted operation, use the supplied HTTPS InflowAPM base URL. For self-hosting, use the reachable API or reverse-proxy base URL and ensure the server process can connect to it. Do not use a browser-only URL when the Node process runs inside a container; use the container-network address that is reachable from that process.

The complete repository example lives in [`examples/express`](./examples/express). With local infrastructure running:

```bash
cd sdks/node
npm run build
INFLOWAPM_API_KEY="your-local-project-key" \
INFLOWAPM_ENDPOINT="http://127.0.0.1:5002" \
node examples/express/server.mjs
```

## Privacy defaults

Automatic Express instrumentation collects:

- HTTP method
- normalized matched route or `/__unmatched__`
- response status
- request duration
- event timestamp
- configured service, environment, service version, runtime, protocol, and SDK identity

It does **not** read or transmit raw URLs, query strings, route parameter values, headers, authorization, cookies, request or response bodies, API keys, exception objects, or stack traces.

Manual metadata and optional identity fields are application-supplied data. Review them before capture and avoid secrets, credentials, payment data, or unnecessary personal data.

## Current limitations

- Automatic instrumentation is available for Express; other Node frameworks require manual capture today.
- Automatic exception and stack-trace capture is not implemented.
- Buffering is in memory and best effort; it is not a durable application queue.
- The package targets server-side Node.js, not browsers, React clients, or mobile applications.
- The connected dashboard and authentication frontend are not implemented yet. Use the current backend APIs and repository E2E harness during development.
- Environment identity is captured, but the current frontend does not expose environment filtering.
- Publication to npm has not occurred; use a local package path until the controlled release.

## Troubleshooting

### No telemetry appears

Check `inflow.getStats()` first. Confirm the project key, endpoint base URL, server-to-InflowAPM network access, and that the middleware is installed before routes. Call `await inflow.flush()` while diagnosing so you do not wait for the interval.

### `configurationIssue` is present

The client disabled itself because an option was invalid. Inspect the issue code and correct the input. The API key is never included in the diagnostic.

### Routes appear as `/__unmatched__`

The request did not match a route after the middleware was installed, or the middleware ran where Express could not expose a string route template. Install it before the routes it should observe. For mounted routers, provide `routePrefix` inside the router.

### Requests succeed but delivery fails

This is expected fail-open behavior. Inspect `flush()` results or `getStats()`. HTTP 401/403 usually means the project key is invalid; 400/413/422 indicates a payload contract issue; 429 and 5xx responses are retried within configured limits.

### Localhost works outside Docker but not inside it

Inside a container, `127.0.0.1` refers to that container. Configure `endpoint` with the InflowAPM API service name or a host address reachable from the application container.

### The process exits before telemetry is sent

Await `shutdown()` in the application's existing signal handler, or call `flush()` in a short-lived task. The SDK intentionally does not keep the process alive just to deliver telemetry.

## Package development and release safety

```bash
npm install
npm run release:check
npm run test:e2e
npm run benchmark
npm audit --audit-level=high
```

`npm run release:check` covers linting, type checking, 47 isolated tests, ESM/CommonJS imports, declarations, open handles, and a clean packed consumer. The real E2E harness additionally verifies queue-to-PostgreSQL persistence and analytics against the local backend.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for protocol and ownership decisions, [ENGINEERING_NOTES.md](./ENGINEERING_NOTES.md) for engineering tradeoffs, [RELEASING.md](./RELEASING.md) for the controlled first-release procedure, and [SECURITY.md](./SECURITY.md) for private vulnerability reporting.
