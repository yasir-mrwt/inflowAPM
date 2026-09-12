# SDK-0 through SDK-4 Engineering Notes

These notes explain why the Node SDK is shaped this way and how each decision is verified.

## Instrumentation boundary

**Problem:** Monitoring code runs inside someone else's application. If it waits on InflowAPM or throws unexpectedly, observability becomes an application outage.

**How it works:** `captureEvent()` performs local bounded work only. Network I/O happens later through the automatic scheduler or explicit `flush()`/`shutdown()`.

**Tradeoff:** In-memory best-effort telemetry can be lost before delivery or under pressure. Durability is deliberately weaker than host safety.

**Failure mode:** Invalid data or a full buffer returns a rejected capture result. It does not throw.

**Test:** Tests prove capture is synchronous and bounded, while network work remains asynchronous and failure-isolated.

## Wall clock and monotonic time

Wall clock answers “when did this event happen?” and is stored as `occurred_at`. Wall clock can jump when the system clock changes.

Monotonic time answers “how long did this operation take?” and is unaffected by wall-clock adjustment. Express instrumentation uses `performance.now()` for duration and creates a separate `Date` for occurrence time.

Manual events still accept `durationMs` and canonicalize `occurredAt`.

## Route normalization

**Problem:** Raw paths such as `/users/18372` create one time series per identifier and can leak sensitive values.

**How it works:** The response completion callback reads `request.route.path` after routing. It produces forms such as `/users/:id`. Mounted routers use an explicit static `routePrefix`, such as `/api`, rather than copying `baseUrl`, which can contain resolved parameter values.

**Tradeoff:** Unknown routes need a conservative fallback. Guessing identifiers with broad regular expressions can merge unrelated routes and still leak values.

**Failure mode:** Reading route information too early finds no match. Reading `originalUrl` would expose raw path and query values. The adapter waits for completion and uses `/__unmatched__` when no route template exists.

**Test:** Real Express tests cover mounted routers, parameters, queries, 404s, async errors, normal finish, premature close, and response preservation.

## Express lifecycle and hot path

The adapter attaches one-time `finish` and `close` listeners, calls `next()` immediately, and records at most once. `finish` means Node handed the complete response to the operating system; `close` provides the premature-disconnect path. Whichever fires first removes the other listener. The adapter never patches `send`/`end`, creates a Promise on the request path, performs serialization, or initiates network work.

The disabled branch calls `next()` without listeners or timing work. The enabled path does a method check, a WeakSet deduplication check, one wall-clock allocation, and one monotonic read before registering listeners. SDK-4 must measure this rather than claiming a benchmark result now. Likely risks to measure are listener/allocation cost, event building at response completion, automatic flush contention, and memory/drop behavior under sustained concurrency.

Thrown exceptions remain owned by Express and the application's error middleware. The SDK observes only the final HTTP status. Capturing exception values or stacks safely needs a dedicated future design with explicit privacy controls.

## Bounded buffering and backpressure

**Problem:** During a slow or unavailable network, event production can exceed delivery and an unbounded array can exhaust customer memory.

**How it works:** A preallocated FIFO ring buffer has a fixed capacity. Buffer capacity and network batch size are separate.

**Tradeoff:** The newest event is dropped when full. This preserves already-buffered ordering but loses the latest view during sustained pressure.

**Failure mode:** Telemetry loss is possible and expected under pressure.

**Test:** A two-slot buffer accepts two events, rejects the third, remains size two, and increments the drop counter.

## Batching and body size

**Problem:** One request per application event is expensive, while count-only batching can exceed the backend JSON parser's 100 KiB limit.

**How it works:** A flush respects both the backend's 100-event maximum and a 90 KiB body budget. Individual events and metadata also have byte/depth/value bounds.

**Tradeoff:** Serialization adds local CPU work. The benefit is predictable memory and request behavior.

**Failure mode:** Oversized or non-JSON metadata is rejected locally.

**Test:** Separate tests verify 205 events become 100/100/5 and large events split below the body budget.

## Fail-open transport

**Problem:** DNS, refusal, timeout, 429, 5xx, and invalid credentials are normal operational possibilities.

**How it works:** Native fetch is wrapped with an AbortController and unref'd timeout. Outcomes are classified and returned as data.

**Tradeoff:** Retryable failures retain the one active batch for a bounded number of attempts. Permanent failures and exhausted retries drop it. Unattempted batches remain in the bounded primary buffer.

**Failure mode:** A transport bug could still throw internally, so the public flush boundary includes a final catch and returns `internal_error`.

**Test:** Local HTTP servers exercise 400, 401, 429 with Retry-After, 500, delayed response, and connection refusal.

## Retry and jitter

Automatic flushing is needed because applications should not need a manual network call for every event, and buffered telemetry should not wait indefinitely. Threshold flushing limits normal batch growth; interval flushing limits normal age. Manual flush and shutdown remain explicit lifecycle controls.

Retries have a fixed attempt limit because an unavailable monitoring backend must not create endless traffic or hold memory forever. Exponential delay spaces attempts. Full jitter randomly selects within the bounded delay window so many application instances recovering from the same outage do not form a thundering herd.

A valid 429 `Retry-After` takes precedence but is capped by the configured maximum. Missing or malformed values fall back to normal jitter. Permanent validation, authentication, oversized payload, and other non-retryable client failures drop immediately. Stats make retry and loss visible without exposing internal queues.

There is no retry queue. The active flush exclusively owns its current batch; new events continue using the same bounded primary ring buffer. Telemetry loss is safer than unlimited retry memory because exhausting the monitored process would turn an observability outage into an application outage.

## Graceful shutdown

The scheduler interval, request timeout, and retry waits are unref'd. `shutdown()` changes the client to a non-accepting state, stops scheduling, attempts one bounded drain, aborts when its configured deadline expires, clears retained telemetry, and resolves a structured result. Repeated shutdown callers share the same operation.

The SDK does not own SIGINT/SIGTERM. A library registering global handlers could conflict with the host's ordering, graceful server close, orchestrator deadline, tests, or other libraries. The application should call `shutdown()` from its own lifecycle handler.

Traditional servers and containers can use periodic flushing and graceful shutdown. Short-lived scripts should await shutdown explicitly. Serverless runtimes may freeze after a handler completes, so future serverless-specific guidance can change scheduling behavior without changing the core capture boundary.

## Privacy

Express automatic collection is deliberately narrow: method, matched route template, status, duration, occurrence time, and protocol identity. It never reads authorization, cookies, request/response bodies, raw URLs, full query strings, API keys, exception messages, or stack traces.

Manual metadata is cloned and constrained to JSON values, but the application remains responsible for not adding secrets. Debug logs contain only event codes and counts, never the API key or payload.

## Package exports and dependencies

The package compiles to ESM and CommonJS so consumers do not need to change module systems. The `exports` map exposes only the package root, which makes accidental imports of internals impossible through normal package resolution.

There are zero required runtime dependencies. Express is an optional peer used only when the consumer enables that adapter. Native Node capabilities cover HTTP, cancellation, IP validation, byte measurement, performance timing, and timers. TypeScript, ESLint, Express, Supertest, and Node types are development-only and excluded from the tarball.

Public exports are compatibility commitments. Framework internals, transport classes, buffer classes, and retry details remain private so they can evolve without forcing a major version.

## What SDK-4 real testing added

Unit tests can prove deterministic classification, buffer rules, and lifecycle state transitions, but they cannot prove that independently configured application, API, queue worker, database, and analytics layers agree. The SDK-4 harness seeds a disposable local login row without triggering registration email, then uses the public login/project APIs, drives a real localhost Express server, waits for PostgreSQL rows, and checks the analytics API. Queue `202 Accepted` is only evidence that BullMQ accepted work; observing database rows proves the worker completed persistence.

Fail-open testing must inspect the monitored response, not merely the SDK result. Refusal, timeout, slow ingestion, 500, 429, 401, and invalid configuration all left the health response intact. The pressure test demonstrated the intended loss boundary: the buffer stayed at or below 25 while drop counters increased. No secondary retry collection appeared.

Package consumer testing matters because source-relative imports can hide export-map, module-format, declaration, or packaged-file mistakes. SDK-4 continues to import the package root from the real example and verifies the packed artifact independently through ESM and CommonJS.

Privacy must be verified after persistence, not only before transport. Deliberate authorization, cookie, query, route-parameter, request-body, API-key, and exception secrets were absent from the stored PostgreSQL metadata and routes.

The request-path benchmark uses equal Express routes in isolated processes, fixed request counts, the same native client and concurrency, alternating run order, and multiple samples. Delivery is deferred until after the measured request window so middleware capture cost is not confused with ingestion throughput. The measured Node 26/Apple M1 median showed roughly 12% lower throughput and roughly 10% higher P95 latency at concurrency 50. This is an investigation result, not a universal product claim.

Memory interpretation requires more than one RSS snapshot. RSS may remain reserved by the allocator after objects are reclaimed. Across instrumented samples, heap grew while 8,000 events were retained and returned close to its pre-load level after flush, shutdown, and forced collection. Together with the hard buffer limit and repeated isolated samples, this supports bounded behavior but does not replace a longer production soak test.

The example exposed an important host-lifecycle detail: unref'd SDK timers correctly avoid keeping applications alive, but a host that closes its final server handle inside an async signal callback must keep its own shutdown task referenced until `shutdown()` resolves. The example now holds a bounded host deadline while awaiting the SDK and then releases it.

## Semantic versioning and publishing

At `0.1.0`, the API is still pre-1.0, but changes should still be deliberate:

- patch: compatible bug fix;
- minor: backward-compatible capability;
- major: incompatible public API or protocol change.

SDK-5 supplies MIT package metadata and license text, exact tarball verification, Node 24/26 CI, release identity checks, and a tokenless GitHub Actions publishing path with provenance. The owner confirmed control of the `@inflowapm` npm organization, and `@inflowapm/node@0.1.0` is now public on npm. Future releases are restricted to the trusted-publisher workflow.
