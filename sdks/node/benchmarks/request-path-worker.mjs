import { createServer } from "node:http";
import { Agent, request } from "node:http";
import express from "express";
import { InflowAPM } from "@inflowapm/node";

const mode = process.argv[2];
if (mode !== "baseline" && mode !== "instrumented") {
  throw new Error("mode must be baseline or instrumented");
}
const requestCount = Number(process.env.SDK4_BENCH_REQUESTS ?? 8_000);
const concurrency = Number(process.env.SDK4_BENCH_CONCURRENCY ?? 50);
const warmupCount = Math.min(2_000, Math.max(1_000, Math.floor(requestCount / 4)));
const benchmarkBufferSize = Math.min(100_000, Math.max(10_000, requestCount));
if (requestCount > benchmarkBufferSize) {
  throw new Error("request count exceeds the SDK's maximum bounded benchmark buffer");
}

function memory() {
  const usage = process.memoryUsage();
  return { rssBytes: usage.rss, heapUsedBytes: usage.heapUsed };
}

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("server has no port");
  return address.port;
}

function close(server) {
  return new Promise((resolve) => server.close(resolve));
}

let deliveredEvents = 0;
const collector = createServer((incoming, response) => {
  const chunks = [];
  incoming.on("data", (chunk) => chunks.push(chunk));
  incoming.on("end", () => {
    deliveredEvents += JSON.parse(Buffer.concat(chunks).toString("utf8")).length;
    response.statusCode = 202;
    response.end();
  });
});
const collectorPort = mode === "instrumented" ? await listen(collector) : undefined;

const inflow =
  mode === "instrumented"
    ? new InflowAPM({
        apiKey: "benchmark-key",
        endpoint: `http://127.0.0.1:${collectorPort}`,
        service: "sdk4-benchmark",
        environment: "benchmark",
        batchSize: 100,
        maxBufferSize: benchmarkBufferSize,
        flushThreshold: benchmarkBufferSize,
        flushIntervalMs: 3_600_000,
        requestTimeoutMs: 2_000,
        maxAttempts: 1,
        shutdownTimeoutMs: 2_000,
      })
    : undefined;

const app = express();
app.disable("x-powered-by");
if (inflow) app.use(inflow.express());
app.get("/benchmark/:id", (_incoming, response) => response.status(204).end());
const applicationServer = createServer(app);
const applicationPort = await listen(applicationServer);
const agent = new Agent({ keepAlive: true, maxSockets: concurrency });

function oneRequest(index, recordLatency, latencies) {
  const startedAt = performance.now();
  return new Promise((resolve, reject) => {
    const outgoing = request(
      {
        host: "127.0.0.1",
        port: applicationPort,
        path: `/benchmark/${index}`,
        method: "GET",
        agent,
      },
      (response) => {
        response.resume();
        response.once("end", () => {
          if (response.statusCode !== 204) {
            reject(new Error(`unexpected status ${response.statusCode}`));
            return;
          }
          if (recordLatency) latencies.push(performance.now() - startedAt);
          resolve();
        });
      },
    );
    outgoing.once("error", reject);
    outgoing.end();
  });
}

async function runLoad(total, recordLatency) {
  const latencies = [];
  let nextIndex = 0;
  async function worker() {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= total) return;
      await oneRequest(index, recordLatency, latencies);
    }
  }
  const startedAt = performance.now();
  await Promise.all(Array.from({ length: concurrency }, worker));
  return { latencies, durationMs: performance.now() - startedAt };
}

function percentile(sorted, fraction) {
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1);
  return sorted[index];
}

await runLoad(warmupCount, false);
if (inflow) await inflow.flush();
deliveredEvents = 0;
global.gc?.();
const before = memory();
const measured = await runLoad(requestCount, true);
const afterRequestPath = memory();
measured.latencies.sort((left, right) => left - right);

let delivery;
if (inflow) {
  const deliveryStartedAt = performance.now();
  const result = await inflow.flush();
  const durationMs = performance.now() - deliveryStartedAt;
  if (!result.ok || result.sentEvents !== requestCount) {
    throw new Error(`delivery accounting failed: ${JSON.stringify(result)}`);
  }
  delivery = {
    events: deliveredEvents,
    batches: result.batches,
    durationMs,
    eventsPerSecond: deliveredEvents / (durationMs / 1_000),
  };
  await inflow.shutdown();
}
agent.destroy();
applicationServer.closeAllConnections?.();
await close(applicationServer);
if (collectorPort !== undefined) {
  collector.closeAllConnections?.();
  await close(collector);
}
global.gc?.();
const afterCleanup = memory();

console.log(
  JSON.stringify({
    mode,
    node: process.version,
    requestCount,
    concurrency,
    warmupCount,
    durationMs: measured.durationMs,
    requestsPerSecond: requestCount / (measured.durationMs / 1_000),
    latencyMs: {
      p50: percentile(measured.latencies, 0.5),
      p95: percentile(measured.latencies, 0.95),
      p99: percentile(measured.latencies, 0.99),
    },
    memory: { before, afterRequestPath, afterCleanup },
    ...(delivery ? { delivery } : {}),
  }),
);
