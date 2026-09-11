import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import request from "supertest";
import { InflowAPM } from "../dist/esm/index.js";
import { createExampleApplication } from "../examples/express/app.mjs";

async function startCollector(responder = () => ({ status: 202 })) {
  const requests = [];
  const server = createServer((incoming, response) => {
    const chunks = [];
    incoming.on("data", (chunk) => chunks.push(chunk));
    incoming.on("end", async () => {
      requests.push(Buffer.concat(chunks));
      const result = await responder(requests.length, response);
      if (response.writableEnded || response.destroyed) return;
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
  if (!address || typeof address === "string") throw new Error("collector has no port");
  return {
    endpoint: `http://127.0.0.1:${address.port}`,
    requests,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

function options(endpoint, overrides = {}) {
  return {
    apiKey: "sdk4-hardening-key",
    endpoint,
    service: "sdk4-hardening",
    environment: "test",
    batchSize: 10,
    maxBufferSize: 100,
    flushThreshold: 1,
    flushIntervalMs: 60_000,
    requestTimeoutMs: 100,
    maxAttempts: 2,
    retryBaseDelayMs: 1,
    retryMaxDelayMs: 2,
    shutdownTimeoutMs: 200,
    ...overrides,
  };
}

async function waitUntil(predicate, timeoutMs = 2_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error("condition not reached before timeout");
}

test("real Express responses stay fail-open across ingestion failures", async (t) => {
  const cases = [
    {
      name: "HTTP 500",
      responder: () => ({ status: 500 }),
      expectedRequests: 2,
    },
    {
      name: "HTTP 429",
      responder: () => ({ status: 429, headers: { "Retry-After": "0" } }),
      expectedRequests: 2,
    },
    {
      name: "invalid API key / HTTP 401",
      responder: () => ({ status: 401 }),
      expectedRequests: 1,
    },
    {
      name: "network timeout",
      responder: async () => {
        await new Promise((resolve) => setTimeout(resolve, 80));
        return { status: 202 };
      },
      expectedRequests: 2,
      overrides: { requestTimeoutMs: 15 },
    },
    {
      name: "slow successful ingestion",
      responder: async () => {
        await new Promise((resolve) => setTimeout(resolve, 80));
        return { status: 202 };
      },
      expectedRequests: 1,
      overrides: { requestTimeoutMs: 200 },
      success: true,
    },
  ];

  for (const scenario of cases) {
    await t.test(scenario.name, async () => {
      const collector = await startCollector(scenario.responder);
      const inflow = new InflowAPM(options(collector.endpoint, scenario.overrides));
      const app = createExampleApplication(inflow);
      const startedAt = performance.now();
      await request(app).get("/health").expect(200, { status: "ok" });
      const responseMs = performance.now() - startedAt;
      assert.ok(responseMs < 250, `host response waited ${responseMs}ms`);
      await waitUntil(() =>
        scenario.success
          ? inflow.getStats().sentEvents === 1
          : inflow.getStats().failedBatches === 1,
      );
      assert.equal(collector.requests.length, scenario.expectedRequests);
      await inflow.shutdown();
      await collector.close();
    });
  }

  await t.test("connection refused / backend offline", async () => {
    const temporary = await startCollector();
    const endpoint = temporary.endpoint;
    await temporary.close();
    const inflow = new InflowAPM(options(endpoint, { requestTimeoutMs: 50 }));
    const app = createExampleApplication(inflow);
    await request(app).get("/health").expect(200, { status: "ok" });
    await waitUntil(() => inflow.getStats().failedBatches === 1);
    assert.equal(inflow.getStats().droppedEvents, 1);
    await inflow.shutdown();
  });

  await t.test("invalid endpoint disables telemetry but not the app", async () => {
    const inflow = new InflowAPM(options("ftp://invalid.example"));
    const app = createExampleApplication(inflow);
    await request(app).get("/health").expect(200, { status: "ok" });
    assert.equal(inflow.getStats().configurationIssue.code, "invalid_endpoint");
    assert.equal(inflow.getStats().capturedEvents, 0);
    await inflow.shutdown();
  });
});

test("sustained slow delivery keeps the buffer and retry ownership bounded", async () => {
  const collector = await startCollector(async () => {
    await new Promise((resolve) => setTimeout(resolve, 250));
    return { status: 202 };
  });
  const inflow = new InflowAPM(
    options(collector.endpoint, {
      batchSize: 1,
      maxBufferSize: 25,
      requestTimeoutMs: 500,
      maxAttempts: 1,
      shutdownTimeoutMs: 30,
    }),
  );
  const app = createExampleApplication(inflow);
  const rssBefore = process.memoryUsage().rss;
  const responses = await Promise.all(
    Array.from({ length: 300 }, () => request(app).get("/health").expect(200)),
  );
  assert.equal(responses.length, 300);
  await waitUntil(() => collector.requests.length === 1);
  const stats = inflow.getStats();
  assert.ok(stats.bufferedEvents <= 25);
  assert.ok(stats.droppedEvents > 0);
  assert.equal(stats.capturedEvents + stats.droppedEvents, 300);
  const rssGrowthBytes = process.memoryUsage().rss - rssBefore;
  assert.ok(rssGrowthBytes < 128 * 1024 * 1024);
  const shutdown = await inflow.shutdown();
  assert.equal(shutdown.timedOut, true);
  assert.equal(inflow.getStats().bufferedEvents, 0);
  await collector.close();
});

test("threshold, interval, and manual flush pressure does not duplicate events", async () => {
  const collector = await startCollector();
  const inflow = new InflowAPM(
    options(collector.endpoint, {
      batchSize: 10,
      maxBufferSize: 500,
      flushThreshold: 10,
      flushIntervalMs: 2,
      maxAttempts: 1,
    }),
  );
  const app = createExampleApplication(inflow);
  const load = Promise.all(
    Array.from({ length: 200 }, () => request(app).get("/health").expect(200)),
  );
  const manualFlushes = Promise.all([inflow.flush(), inflow.flush(), inflow.flush()]);
  await Promise.all([load, manualFlushes]);
  await waitUntil(() => inflow.getStats().sentEvents === 200);
  await inflow.flush();
  const deliveredEvents = collector.requests.reduce(
    (count, body) => count + JSON.parse(body.toString("utf8")).length,
    0,
  );
  assert.equal(deliveredEvents, 200);
  assert.deepEqual(
    {
      captured: inflow.getStats().capturedEvents,
      sent: inflow.getStats().sentEvents,
      dropped: inflow.getStats().droppedEvents,
    },
    { captured: 200, sent: 200, dropped: 0 },
  );
  await inflow.shutdown();
  await collector.close();
});

test("development, staging, and production use the same validated client", async () => {
  for (const environment of ["development", "staging", "production"]) {
    const inflow = new InflowAPM(
      options("https://self-hosted.example/inflow", { environment, enabled: false }),
    );
    assert.equal(inflow.getStats().configurationIssue, undefined);
    assert.equal(inflow.getStats().enabled, false);
    await inflow.shutdown();
  }
});

test("the real example performs bounded signal-driven shutdown with no hang", async () => {
  const fixture = fileURLToPath(new URL("../examples/express/server.mjs", import.meta.url));
  const child = spawn(process.execPath, [fixture], {
    env: {
      ...process.env,
      PORT: "0",
      INFLOWAPM_API_KEY: "shutdown-test-key",
      INFLOWAPM_ENDPOINT: "http://127.0.0.1:1",
      INFLOWAPM_FLUSH_THRESHOLD: "100",
      INFLOWAPM_FLUSH_INTERVAL_MS: "60000",
      INFLOWAPM_REQUEST_TIMEOUT_MS: "1000",
      INFLOWAPM_SHUTDOWN_TIMEOUT_MS: "100",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    stdout += chunk;
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });
  await waitUntil(() => stdout.includes('"event":"ready"'));
  const readyLine = stdout
    .split("\n")
    .find((line) => line.includes('"event":"ready"'));
  const { port } = JSON.parse(readyLine);
  await fetch(`http://127.0.0.1:${port}/health`);
  const shutdownStartedAt = performance.now();
  child.kill("SIGTERM");
  const exit = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("example process did not exit"));
    }, 1_500);
    child.once("exit", (code, signal) => {
      clearTimeout(timer);
      resolve({ code, signal });
    });
  });
  assert.deepEqual(exit, { code: 0, signal: null }, stderr);
  assert.ok(performance.now() - shutdownStartedAt < 1_500);
  assert.match(stdout, /"event":"stopped"/u);
});
