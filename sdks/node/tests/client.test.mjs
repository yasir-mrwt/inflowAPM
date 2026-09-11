import assert from "node:assert/strict";
import { createServer } from "node:http";
import { test } from "node:test";
import { InflowAPM, MAX_BACKEND_BATCH_SIZE } from "../dist/esm/index.js";

async function startCollector(responder = () => ({ status: 202 })) {
  const requests = [];
  const server = createServer((request, response) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", async () => {
      const body = Buffer.concat(chunks);
      requests.push({
        body,
        headers: request.headers,
        method: request.method,
        url: request.url,
      });
      const result = await responder(requests.length, request, response);
      if (response.writableEnded) return;
      for (const [name, value] of Object.entries(result.headers ?? {})) {
        response.setHeader(name, value);
      }
      response.statusCode = result.status;
      response.end(result.body ?? "");
    });
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("collector did not bind to a TCP port");
  }
  return {
    endpoint: `http://127.0.0.1:${address.port}`,
    requests,
    close: () => new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    }),
  };
}

function options(endpoint, overrides = {}) {
  return {
    apiKey: "project-key-for-tests",
    endpoint,
    service: "checkout-api",
    environment: "test",
    serviceVersion: "1.4.2",
    requestTimeoutMs: 500,
    ...overrides,
  };
}

function httpEvent(index = 1, metadata = {}) {
  return {
    type: "http",
    route: "/products/:id",
    method: "GET",
    status: 200,
    durationMs: index + 0.25,
    metadata,
    userId: `user-${index}`,
    occurredAt: "2026-09-10T12:00:00.000Z",
  };
}

test("serializes the exact backend batch contract and protocol identity", async (t) => {
  const collector = await startCollector();
  t.after(collector.close);
  const metadata = { region: "pk-1" };
  const client = new InflowAPM(options(collector.endpoint));

  assert.deepEqual(client.captureEvent(httpEvent(1, metadata)), {
    accepted: true,
    bufferedEvents: 1,
  });
  metadata.region = "changed-after-capture";

  const flush = await client.flush();
  assert.deepEqual(flush, {
    ok: true,
    sentEvents: 1,
    droppedEvents: 0,
    pendingEvents: 0,
    batches: 1,
  });
  assert.equal(collector.requests.length, 1);
  const request = collector.requests[0];
  assert.equal(request.method, "POST");
  assert.equal(request.url, "/api/v1/telemetry/ingest");
  assert.equal(request.headers.authorization, "Bearer project-key-for-tests");
  assert.equal(request.headers["content-type"], "application/json");

  const batch = JSON.parse(request.body.toString("utf8"));
  assert.equal(batch.length, 1);
  assert.deepEqual(batch[0], {
    type: "http",
    route: "/products/:id",
    method: "GET",
    status: 200,
    duration_ms: 1.25,
    metadata: {
      region: "pk-1",
      inflow: {
        protocol_version: "1",
        service: { name: "checkout-api", version: "1.4.2" },
        environment: "test",
        runtime: {
          name: "node",
          version: process.versions.node,
          platform: process.platform,
          architecture: process.arch,
        },
        sdk: { name: "@inflowapm/node", version: "0.1.0" },
      },
    },
    user_id: "user-1",
    occurred_at: "2026-09-10T12:00:00.000Z",
  });
});

test("supports application events and creates a canonical UTC timestamp", async (t) => {
  const collector = await startCollector();
  t.after(collector.close);
  const client = new InflowAPM(options(collector.endpoint));
  const captured = client.captureEvent({
    type: "event",
    route: "timeout",
    durationMs: 50,
    occurredAt: "2026-09-10T17:00:00+05:00",
  });
  assert.equal(captured.accepted, true);
  assert.equal((await client.flush()).ok, true);
  const [event] = JSON.parse(collector.requests[0].body.toString("utf8"));
  assert.equal(event.occurred_at, "2026-09-10T12:00:00.000Z");
  assert.deepEqual(event.metadata.inflow.service, {
    name: "checkout-api",
    version: "1.4.2",
  });
});

test("validates configuration once, disables safely, and redacts the API key", async () => {
  const apiKey = "super-secret-project-key";
  const messages = [];
  const originalWarn = console.warn;
  console.warn = (...values) => messages.push(values);
  try {
    const client = new InflowAPM({
      apiKey,
      endpoint: "ftp://bad.example",
      service: "checkout-api",
      environment: "test",
      debug: true,
    });
    assert.equal(client.enabled, false);
    assert.deepEqual(client.captureEvent(httpEvent()), {
      accepted: false,
      reason: "invalid_configuration",
      code: "invalid_endpoint",
      bufferedEvents: 0,
    });
    assert.equal((await client.flush()).failure.kind, "invalid_configuration");
    assert.equal(client.getStats().configurationIssue.code, "invalid_endpoint");
  } finally {
    console.warn = originalWarn;
  }
  assert.equal(JSON.stringify(messages).includes(apiKey), false);
});

test("rejects non-boolean feature flags instead of coercing them", () => {
  const client = new InflowAPM({
    ...options("http://127.0.0.1:1"),
    enabled: "false",
  });
  assert.equal(client.enabled, false);
  assert.equal(client.getStats().configurationIssue.code, "invalid_enabled");
});

test("disabled clients never buffer or perform network work", async (t) => {
  const collector = await startCollector();
  t.after(collector.close);
  const client = new InflowAPM(options(collector.endpoint, { enabled: false }));
  assert.deepEqual(client.captureEvent(httpEvent()), {
    accepted: false,
    reason: "disabled",
    bufferedEvents: 0,
  });
  assert.equal((await client.flush()).ok, true);
  assert.equal(collector.requests.length, 0);
});

test("rejects invalid events without throwing or buffering", () => {
  const client = new InflowAPM(options("http://127.0.0.1:1"));
  const cyclic = {};
  cyclic.self = cyclic;
  const invalidEvents = [
    { ...httpEvent(), route: "products/123" },
    { ...httpEvent(), status: 700 },
    { ...httpEvent(), durationMs: Number.NaN },
    { ...httpEvent(), metadata: cyclic },
    { ...httpEvent(), metadata: { inflow: {} } },
  ];
  for (const event of invalidEvents) {
    const result = client.captureEvent(event);
    assert.equal(result.accepted, false);
    assert.equal(result.reason, "invalid_event");
  }
  assert.equal(client.getStats().bufferedEvents, 0);
});

test("uses a fixed-capacity buffer and drops newest events on overflow", () => {
  const client = new InflowAPM(
    options("http://127.0.0.1:1", { batchSize: 2, maxBufferSize: 2 }),
  );
  assert.equal(client.captureEvent(httpEvent(1)).accepted, true);
  assert.equal(client.captureEvent(httpEvent(2)).accepted, true);
  assert.deepEqual(client.captureEvent(httpEvent(3)), {
    accepted: false,
    reason: "buffer_full",
    bufferedEvents: 2,
  });
  assert.deepEqual(client.getStats(), {
    enabled: true,
    capturedEvents: 2,
    bufferedEvents: 2,
    sentEvents: 0,
    droppedEvents: 1,
    retryAttempts: 0,
    failedBatches: 0,
    rateLimitedEvents: 0,
  });
});

test("splits explicit flushes at the backend maximum of 100 events", async (t) => {
  const collector = await startCollector();
  t.after(collector.close);
  const client = new InflowAPM(
    options(collector.endpoint, {
      batchSize: MAX_BACKEND_BATCH_SIZE,
      maxBufferSize: 250,
    }),
  );
  for (let index = 0; index < 205; index += 1) {
    assert.equal(client.captureEvent(httpEvent(index)).accepted, true);
  }
  const result = await client.flush();
  assert.deepEqual(result, {
    ok: true,
    sentEvents: 205,
    droppedEvents: 0,
    pendingEvents: 0,
    batches: 3,
  });
  assert.deepEqual(
    collector.requests.map(({ body }) => JSON.parse(body.toString("utf8")).length),
    [100, 100, 5],
  );
});

test("splits batches below the backend JSON body limit", async (t) => {
  const collector = await startCollector();
  t.after(collector.close);
  const client = new InflowAPM(
    options(collector.endpoint, { batchSize: 100, maxBufferSize: 100 }),
  );
  for (let index = 0; index < 12; index += 1) {
    assert.equal(
      client.captureEvent(httpEvent(index, { sample: "x".repeat(9_000) })).accepted,
      true,
    );
  }
  const result = await client.flush();
  assert.equal(result.ok, true);
  assert.equal(result.sentEvents, 12);
  assert.ok(result.batches > 1);
  for (const request of collector.requests) {
    assert.ok(request.body.byteLength <= 90 * 1024);
  }
});

test("classifies permanent and retryable HTTP failures without retrying", async (t) => {
  const statuses = [400, 401, 429, 500];
  const collector = await startCollector((count) => ({
    status: statuses[count - 1],
    headers: statuses[count - 1] === 429 ? { "Retry-After": "2" } : {},
  }));
  t.after(collector.close);
  const expected = [
    ["validation_error", 400],
    ["authentication_error", 401],
    ["rate_limited", 429],
    ["server_error", 500],
  ];
  for (const [kind, statusCode] of expected) {
    const client = new InflowAPM(
      options(collector.endpoint, { maxAttempts: 1 }),
    );
    client.captureEvent(httpEvent(statusCode));
    const result = await client.flush();
    assert.equal(result.ok, false);
    assert.equal(result.failure.kind, kind);
    assert.equal(result.failure.statusCode, statusCode);
    assert.equal(result.droppedEvents, 1);
    assert.equal(result.pendingEvents, 0);
  }
  assert.equal(collector.requests.length, 4);
  assert.equal(
    (new InflowAPM(options(collector.endpoint))).getStats().droppedEvents,
    0,
  );
});

test("honors Retry-After seconds for a 429 outcome", async (t) => {
  const collector = await startCollector(() => ({
    status: 429,
    headers: { "Retry-After": "3" },
  }));
  t.after(collector.close);
  const client = new InflowAPM(
    options(collector.endpoint, { maxAttempts: 1 }),
  );
  client.captureEvent(httpEvent());
  const result = await client.flush();
  assert.equal(result.failure.retryAfterMs, 3_000);
});

test("times out fail-open and does not leak a rejection", async (t) => {
  const collector = await startCollector(async (_count, _request, response) => {
    await new Promise((resolve) => setTimeout(resolve, 100));
    if (!response.destroyed) {
      response.statusCode = 202;
      response.end();
    }
    return { status: 202 };
  });
  t.after(collector.close);
  const client = new InflowAPM(
    options(collector.endpoint, { requestTimeoutMs: 20 }),
  );
  client.captureEvent(httpEvent());
  const result = await client.flush();
  assert.equal(result.ok, false);
  assert.equal(result.failure.kind, "timeout");
  assert.equal(result.droppedEvents, 1);
});

test("connection failure is contained and reported", async () => {
  const temporary = await startCollector();
  const endpoint = temporary.endpoint;
  await temporary.close();
  const client = new InflowAPM(options(endpoint, { requestTimeoutMs: 100 }));
  client.captureEvent(httpEvent());
  const result = await client.flush();
  assert.equal(result.ok, false);
  assert.equal(result.failure.kind, "network_error");
  assert.equal(result.droppedEvents, 1);
});

test("concurrent flush callers share one in-flight request", async (t) => {
  const collector = await startCollector(async () => {
    await new Promise((resolve) => setTimeout(resolve, 25));
    return { status: 202 };
  });
  t.after(collector.close);
  const client = new InflowAPM(options(collector.endpoint));
  client.captureEvent(httpEvent());
  const first = client.flush();
  const second = client.flush();
  assert.strictEqual(first, second);
  assert.equal((await first).ok, true);
  assert.equal(collector.requests.length, 1);
});

test("supports a self-hosted base path without hard-coded localhost behavior", async (t) => {
  const collector = await startCollector();
  t.after(collector.close);
  const client = new InflowAPM(
    options(`${collector.endpoint}/inflow`),
  );
  client.captureEvent(httpEvent());
  assert.equal((await client.flush()).ok, true);
  assert.equal(
    collector.requests[0].url,
    "/inflow/api/v1/telemetry/ingest",
  );
});
