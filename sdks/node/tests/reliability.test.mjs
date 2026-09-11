import assert from "node:assert/strict";
import { createServer } from "node:http";
import { test } from "node:test";
import { InflowAPM } from "../dist/esm/index.js";

async function startCollector(responder = () => ({ status: 202 })) {
  const requests = [];
  const server = createServer((request, response) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", async () => {
      requests.push({
        body: Buffer.concat(chunks),
        receivedAt: performance.now(),
      });
      const result = await responder(requests.length, response);
      if (response.writableEnded) return;
      for (const [name, value] of Object.entries(result.headers ?? {})) {
        response.setHeader(name, value);
      }
      response.statusCode = result.status;
      response.end();
    });
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("no test port");
  return {
    endpoint: `http://127.0.0.1:${address.port}`,
    requests,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

function options(endpoint, overrides = {}) {
  return {
    apiKey: "sdk-2-project-key",
    endpoint,
    service: "reliability-test",
    environment: "test",
    batchSize: 10,
    maxBufferSize: 20,
    flushThreshold: 10,
    flushIntervalMs: 60_000,
    requestTimeoutMs: 250,
    maxAttempts: 3,
    retryBaseDelayMs: 1,
    retryMaxDelayMs: 5,
    shutdownTimeoutMs: 250,
    ...overrides,
  };
}

function event(index = 1) {
  return {
    type: "http",
    route: "/reliability/:id",
    method: "GET",
    status: 200,
    durationMs: index,
  };
}

async function waitUntil(predicate, timeoutMs = 1_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error("condition was not reached before timeout");
}

test("flushes automatically when the independent threshold is reached", async () => {
  const collector = await startCollector();
  const client = new InflowAPM(
    options(collector.endpoint, {
      batchSize: 5,
      flushThreshold: 2,
    }),
  );
  client.captureEvent(event(1));
  assert.equal(collector.requests.length, 0);
  client.captureEvent(event(2));
  await waitUntil(() => client.getStats().sentEvents === 2);
  assert.equal(JSON.parse(collector.requests[0].body.toString()).length, 2);
  assert.equal(client.getStats().sentEvents, 2);
  await client.shutdown();
  await collector.close();
});

test("flushes automatically when the interval expires", async () => {
  const collector = await startCollector();
  const client = new InflowAPM(
    options(collector.endpoint, {
      flushThreshold: 10,
      flushIntervalMs: 20,
    }),
  );
  client.captureEvent(event());
  await waitUntil(() => collector.requests.length === 1);
  assert.equal(client.getStats().bufferedEvents, 0);
  await client.shutdown();
  await collector.close();
});

test("threshold, timer, and manual callers share one delivery owner", async () => {
  const collector = await startCollector(async () => {
    await new Promise((resolve) => setTimeout(resolve, 25));
    return { status: 202 };
  });
  const client = new InflowAPM(
    options(collector.endpoint, {
      flushThreshold: 1,
      flushIntervalMs: 5,
    }),
  );
  client.captureEvent(event());
  const first = client.flush();
  const second = client.flush();
  assert.strictEqual(first, second);
  assert.equal((await first).ok, true);
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(collector.requests.length, 1);
  await client.shutdown();
  await collector.close();
});

test("retries retryable failures and preserves one logical batch", async () => {
  const collector = await startCollector((count) => ({
    status: count === 1 ? 500 : 202,
  }));
  const client = new InflowAPM(options(collector.endpoint));
  client.captureEvent(event());
  const result = await client.flush();
  assert.equal(result.ok, true);
  assert.equal(result.sentEvents, 1);
  assert.equal(result.batches, 1);
  assert.equal(collector.requests.length, 2);
  assert.deepEqual(client.getStats(), {
    enabled: true,
    capturedEvents: 1,
    bufferedEvents: 0,
    sentEvents: 1,
    droppedEvents: 0,
    retryAttempts: 1,
    failedBatches: 0,
    rateLimitedEvents: 0,
  });
  await client.shutdown();
  await collector.close();
});

test("retries an HTTP 408 response", async () => {
  const collector = await startCollector((count) => ({
    status: count === 1 ? 408 : 202,
  }));
  const client = new InflowAPM(options(collector.endpoint));
  client.captureEvent(event());
  const result = await client.flush();
  assert.equal(result.ok, true);
  assert.equal(collector.requests.length, 2);
  assert.equal(client.getStats().retryAttempts, 1);
  await client.shutdown();
  await collector.close();
});

test("does not retry permanent authentication failures", async () => {
  const collector = await startCollector(() => ({ status: 401 }));
  const client = new InflowAPM(options(collector.endpoint));
  client.captureEvent(event());
  const result = await client.flush();
  assert.equal(result.failure.kind, "authentication_error");
  assert.equal(collector.requests.length, 1);
  assert.equal(client.getStats().retryAttempts, 0);
  assert.equal(client.getStats().failedBatches, 1);
  await client.shutdown();
  await collector.close();
});

test("bounds retry attempts and drops only after exhaustion", async () => {
  const collector = await startCollector(() => ({ status: 500 }));
  const client = new InflowAPM(
    options(collector.endpoint, { maxAttempts: 3 }),
  );
  client.captureEvent(event());
  const result = await client.flush();
  assert.equal(result.ok, false);
  assert.equal(result.failure.kind, "server_error");
  assert.equal(result.droppedEvents, 1);
  assert.equal(collector.requests.length, 3);
  assert.equal(client.getStats().retryAttempts, 2);
  assert.equal(client.getStats().failedBatches, 1);
  await client.shutdown();
  await collector.close();
});

test("retries 429 responses and records rate-limited events", async () => {
  const collector = await startCollector((count) => ({
    status: count === 1 ? 429 : 202,
    headers: count === 1 ? { "Retry-After": "0" } : {},
  }));
  const client = new InflowAPM(
    options(collector.endpoint, {
      retryBaseDelayMs: 1,
      retryMaxDelayMs: 1,
    }),
  );
  client.captureEvent(event());
  const result = await client.flush();
  assert.equal(result.ok, true);
  assert.equal(collector.requests.length, 2);
  assert.equal(client.getStats().rateLimitedEvents, 1);
  await client.shutdown();
  await collector.close();
});

test("falls back to bounded backoff for malformed Retry-After", async () => {
  const collector = await startCollector((count) => ({
    status: count === 1 ? 429 : 202,
    headers: count === 1 ? { "Retry-After": "not-a-delay" } : {},
  }));
  const client = new InflowAPM(options(collector.endpoint));
  client.captureEvent(event());
  assert.equal((await client.flush()).ok, true);
  assert.equal(collector.requests.length, 2);
  await client.shutdown();
  await collector.close();
});

test("keeps the primary buffer bounded while a batch is retrying", async () => {
  const collector = await startCollector(() => ({
    status: 429,
    headers: { "Retry-After": "1" },
  }));
  const client = new InflowAPM(
    options(collector.endpoint, {
      batchSize: 1,
      maxBufferSize: 3,
      flushThreshold: 1,
      retryBaseDelayMs: 1_000,
      retryMaxDelayMs: 1_000,
      shutdownTimeoutMs: 20,
    }),
  );
  client.captureEvent(event(1));
  await waitUntil(() => collector.requests.length === 1);
  assert.equal(client.captureEvent(event(2)).accepted, true);
  assert.equal(client.captureEvent(event(3)).accepted, true);
  assert.equal(client.captureEvent(event(4)).accepted, true);
  assert.equal(client.captureEvent(event(5)).reason, "buffer_full");
  assert.equal(client.getStats().bufferedEvents, 3);
  const shutdown = await client.shutdown();
  assert.equal(shutdown.timedOut, true);
  assert.equal(client.getStats().bufferedEvents, 0);
  assert.equal(client.getStats().droppedEvents, 5);
  await collector.close();
});

test("shutdown performs a bounded final flush and closes the client", async () => {
  const collector = await startCollector();
  const client = new InflowAPM(options(collector.endpoint));
  client.captureEvent(event());
  const result = await client.shutdown();
  assert.deepEqual(result, {
    ok: true,
    timedOut: false,
    sentEvents: 1,
    droppedEvents: 0,
    pendingEvents: 0,
  });
  assert.equal(client.enabled, false);
  assert.equal(client.captureEvent(event()).reason, "shutdown");
  assert.equal((await client.flush()).failure.kind, "lifecycle_closed");
  await new Promise((resolve) => setTimeout(resolve, 25));
  assert.equal(collector.requests.length, 1);
  await collector.close();
});

test("shutdown aborts an active retry without waiting indefinitely", async () => {
  const collector = await startCollector(() => ({
    status: 429,
    headers: { "Retry-After": "30" },
  }));
  const client = new InflowAPM(
    options(collector.endpoint, {
      retryBaseDelayMs: 1_000,
      retryMaxDelayMs: 1_000,
      shutdownTimeoutMs: 20,
    }),
  );
  client.captureEvent(event());
  const flush = client.flush();
  await waitUntil(() => collector.requests.length === 1);
  const startedAt = performance.now();
  const shutdown = await client.shutdown();
  const elapsed = performance.now() - startedAt;
  assert.equal(shutdown.ok, false);
  assert.equal(shutdown.timedOut, true);
  assert.ok(elapsed < 250);
  assert.equal((await flush).failure.kind, "cancelled");
  assert.equal(client.getStats().droppedEvents, 1);
  await collector.close();
});
