# InflowAPM Node SDK Architecture

This document records SDK-0 through SDK-4 decisions against the actual backend implementation and tests. It is the protocol baseline for Node now and Python later.

## Audited backend contract

### Request

| Property | Contract |
| --- | --- |
| Endpoint | `POST /api/v1/telemetry/ingest` |
| Authentication | `Authorization: Bearer <project API key>` |
| Content type | `application/json` |
| Body | A JSON array, not an envelope |
| Batch count | Minimum 1, maximum 100 events |
| Body size | Express JSON parser default: 100 KiB |

Authentication runs before rate limiting and validation. The API key maps the request to a project; clients never submit `project_id`.

### HTTP event

```ts
{
  type: "http";
  route: string; // must start with "/"
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS" | "HEAD";
  status: number; // integer, 100 through 599
  duration_ms: number; // non-negative
  metadata?: Record<string, unknown>; // defaults to {}
  user_id?: string; // maximum 255 characters
  anonymous_id?: string; // maximum 255 characters
  email?: string; // validated email
  ip?: string; // IPv4 or IPv6
  occurred_at: string; // ISO datetime
}
```

### Application event

```ts
{
  type: "event";
  route: "query" | "error" | "timeout";
  duration_ms?: number; // non-negative when set
  metadata?: Record<string, unknown>; // defaults to {}
  user_id?: string;
  anonymous_id?: string;
  email?: string;
  ip?: string;
  occurred_at: string;
}
```

Zod object parsing strips unknown top-level event properties. The SDK emits only known fields and canonicalizes timestamps with `Date.toISOString()`.

### Responses

| Situation | Status and behavior |
| --- | --- |
| Accepted | `202` JSON: `success: true`; the batch has entered BullMQ, not necessarily PostgreSQL |
| Missing, malformed, or invalid API key | `401` JSON error |
| Invalid or empty/oversized event batch | `400` JSON error |
| JSON body over parser limit | `413` |
| Project rate limit exceeded | `429` JSON error plus `Retry-After` |
| Unexpected backend dependency/error | `5xx` |

The rate limit is 120 ingestion requests per 60 seconds per authenticated project, backed by Redis. `standardHeaders: true` currently produces draft-6 `RateLimit-*` headers; legacy `X-RateLimit-*` headers are disabled. Rate limiting is skipped in the backend test environment.

The backend's BullMQ job performs up to three database-processing attempts with exponential backoff. That is separate from client-to-backend delivery: a network failure before `202` still requires SDK-side policy.

## Backend change decision

No backend change is required for SDK-0 through SDK-4.

The existing metadata JSON object can carry protocol, service, environment, runtime, and SDK identity without changing the database or breaking manual producers. Route, method, status, duration, timestamp, and optional user identity already have first-class fields.

A future backend change may become worthwhile when dashboards need efficient filtering or grouping across service and environment. At that point, promoting selected identity values to indexed columns should be proposed as a backward-compatible migration. The current SDK does not make that unauthorized change.

## Protocol design

Protocol version 1 keeps the existing top-level event schema and reserves `metadata.inflow`:

```text
metadata.inflow.protocol_version
metadata.inflow.service.name
metadata.inflow.service.version
metadata.inflow.environment
metadata.inflow.runtime.name
metadata.inflow.runtime.version
metadata.inflow.runtime.platform
metadata.inflow.runtime.architecture
metadata.inflow.sdk.name
metadata.inflow.sdk.version
```

These names are language-neutral. A future Python SDK can send the same structure while changing only runtime and SDK identity values.

Service, environment, and service version are low-cardinality configuration values applied to every event. Per-request values, user IDs, raw URLs, query strings, and unique deployment IDs must not be used as service identity.

## Environment model

One package supports every server environment through configuration:

- **localhost:** explicit `http://localhost:<port>` endpoint and environment such as `development`;
- **development/test/staging/production:** stable service name plus the corresponding environment value;
- **self-hosted:** explicit HTTP/HTTPS base URL, including an optional reverse-proxy base path;
- **hosted:** explicit HTTPS base URL until InflowAPM has a real production default.

There is no environment-specific SDK build and no special hard-coded localhost behavior.

## Package boundaries

```text
Public InflowAPM client
  |
  +-- one-time configuration resolution
  +-- event builder and protocol serialization
  +-- fixed-capacity ring buffer
  +-- automatic flush scheduler
  +-- bounded retry and shutdown lifecycle
  +-- count/byte-aware batch assembly
  +-- narrow native-fetch transport
  +-- framework adapters
        |
        +-- Express finish/close observer
```

Framework adapters call the same public capture boundary. Express owns only request lifecycle observation, safe route naming, and duration measurement. It does not own buffering, transport, retries, or process lifecycle.

### Implemented ownership

- `config.ts`: validation, normalization, safe defaults, endpoint construction;
- `protocol.ts`: language-neutral wire types and protocol constants;
- `event-builder.ts`: input validation, JSON-safe metadata cloning, wire serialization;
- `buffer.ts`: fixed-capacity FIFO ring buffer;
- `transport.ts`: authentication, serialization, timeout, result classification;
- `scheduler.ts`: unref'd interval and coalesced background flush requests;
- `retry.ts`: failure policy, bounded exponential full jitter, and retry ownership;
- `integrations/express.ts`: isolated Express lifecycle and route adapter;
- `client.ts`: public API, capture orchestration, flush/shutdown lifecycle, stats;
- `index.ts`: the only published public boundary.

### Deferred boundaries

- SDK-5 activation: the first npm release and tokenless trusted-publisher setup;
- SDK-6: developer documentation expansion and real homepage integration.

## Delivery and backpressure semantics

`captureEvent()` never awaits ingestion. It does bounded validation, appends to a preallocated ring buffer, and may request a coalesced background flush when the threshold is reached.

The buffer and scheduler have five independent concepts:

- capacity: total events held in memory;
- batch size: maximum events sent in one HTTP request;
- flush threshold: buffered count that requests automatic delivery;
- flush interval: maximum normal wait before time-based delivery;
- request body budget: maximum approximate serialized bytes in one request.

When full, the buffer rejects the newest event. A flush removes one count/byte-bounded batch and becomes its sole owner. Success counts it as sent. A retryable failure keeps that same batch in the active flush for at most `maxAttempts`; it never creates a second retry queue. A permanent failure or retry exhaustion drops and counts it. Unattempted events stay in the primary buffer. Shutdown either drains within its deadline or aborts and drops all remaining owned/buffered events. Host memory wins over telemetry retention.

Timer, threshold, manual, and shutdown flush requests share one active promise. This single-owner model prevents duplicate delivery, double removal, and uncontrolled parallel ingestion requests.

## Failure isolation

Network errors, timeouts, 408, 429, 5xx, authentication failures, validation failures, and unexpected responses become typed `FlushResult` values. They do not become uncaught host errors. Network errors, timeouts, 408, 429, and 5xx retry with fixed limits. Validation, authentication, oversized payload, and other permanent 4xx results do not retry. Invalid runtime configuration creates a disabled client with a sanitized issue instead of throwing.

Request timeout, retry-wait, and flush interval timers are unref'd and cleared or stopped by lifecycle transitions. Internal scheduled promises contain their own failures. The SDK installs no process signal listener, worker, queue connection, or persistent socket of its own.

## Express adapter semantics

The public `inflow.express()` adapter is installed before routes. It records a wall-clock `Date` at request entry and a monotonic `performance.now()` start value. On response `finish`, or `close` when completion is premature, it records exactly one small HTTP event. It never awaits delivery, patches response methods, sends a response, or consumes an application error.

After routing, Express exposes the matched route template through `request.route.path`; that value produces `/users/:id` rather than a high-cardinality raw URL. Unknown routes use `/__unmatched__`. Mounted routers accept an explicit static `routePrefix`. The adapter intentionally does not copy `request.originalUrl` or `request.baseUrl`: the former includes query data and the latter can include resolved mount parameter values.

Automatic HTTP telemetry contains method, normalized route, actual response status, duration, occurrence time, and protocol identity only. Headers, cookies, authorization, body content, raw query/path values, exception messages, and stacks remain outside the automatic adapter.

## Package compatibility

- minimum runtime: Node.js 24;
- primary compatibility targets: Node.js 24 LTS and Node.js 26 Current;
- runtime dependencies: zero;
- optional framework peer: Express 4.18+ or 5.x;
- ESM: `dist/esm/index.js`;
- CommonJS: `dist/cjs/index.js`;
- declarations: `dist/esm/index.d.ts`;
- exports: one explicit package root, keeping internals private;
- target: ES2022.

Node.js 24 was selected as the modern production LTS baseline; Node 26 compatibility is retained without requiring Node 26-only APIs. Native fetch and performance timing avoid runtime helper packages. SDK-5 confirmed MIT licensing and `@inflowapm` scope ownership. The public package now publishes only through the guarded GitHub Actions trusted-publisher workflow.

## SDK-4 integration evidence

The real example consumes the package root and sends localhost traffic through the SDK to the existing API. The validation creates a normal user and project, receives `202` from authenticated ingestion, then polls PostgreSQL rather than treating queue acceptance as persistence. Six HTTP rows were observed after BullMQ worker processing: 200 health, normalized parameter, 201 checkout, slow 200, 500 error, and privacy-safe 404 fallback. The existing analytics API returned the same six requests, one error, latency aggregation, route performance, and the recent `/error` response. Protocol, service, environment, runtime, and SDK metadata survived unchanged. No backend code or schema change was required.

Failure injection uses the real Express example with offline/refused transport, timeout, slow ingestion, 500, 429, 401, and invalid configuration. Responses remain application-owned while delivery retries, buffers, or drops in the background. A 300-request pressure run with a 25-event buffer stayed within the configured bound. A separate 200-request test combined threshold, interval, and manual flushes and observed 200 captured and 200 delivered events without accidental duplication.

The SDK provides best-effort delivery, not exactly-once delivery. Exclusive in-process ownership prevents SDK-created duplicates during normal concurrency. A remote server could still accept a request while the client loses the response and retries; downstream idempotency would require a future event identifier/protocol decision.

## Client/mobile security boundary

Normal project API keys are server credentials. They must never be embedded in browser bundles, React Native, Android, iOS, desktop binaries distributed to untrusted users, or other inspectable client code.

Future client telemetry needs a restricted public ingestion credential with reduced permissions and abuse controls, or a customer-controlled backend relay. The current server API-key model must not be weakened to make a client SDK convenient.
