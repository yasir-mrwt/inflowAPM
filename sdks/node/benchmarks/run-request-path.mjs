import { spawnSync } from "node:child_process";
import os from "node:os";
import { fileURLToPath } from "node:url";

const worker = fileURLToPath(new URL("./request-path-worker.mjs", import.meta.url));
const samples = Number(process.env.SDK4_BENCH_SAMPLES ?? 3);
const requestCount = Number(process.env.SDK4_BENCH_REQUESTS ?? 8_000);
const concurrency = Number(process.env.SDK4_BENCH_CONCURRENCY ?? 50);
const results = [];

for (let sample = 0; sample < samples; sample += 1) {
  const modes = sample % 2 === 0
    ? ["baseline", "instrumented"]
    : ["instrumented", "baseline"];
  for (const mode of modes) {
    const run = spawnSync(process.execPath, ["--expose-gc", worker, mode], {
      encoding: "utf8",
      env: {
        ...process.env,
        SDK4_BENCH_REQUESTS: String(requestCount),
        SDK4_BENCH_CONCURRENCY: String(concurrency),
      },
      timeout: 120_000,
    });
    if (run.status !== 0) {
      throw new Error(`${mode} sample ${sample + 1} failed: ${run.stderr}`);
    }
    results.push({ sample: sample + 1, ...JSON.parse(run.stdout.trim()) });
  }
}

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function summary(mode) {
  const selected = results.filter((result) => result.mode === mode);
  return {
    requestsPerSecond: median(selected.map((result) => result.requestsPerSecond)),
    durationMs: median(selected.map((result) => result.durationMs)),
    latencyMs: {
      p50: median(selected.map((result) => result.latencyMs.p50)),
      p95: median(selected.map((result) => result.latencyMs.p95)),
      p99: median(selected.map((result) => result.latencyMs.p99)),
    },
    rssAfterRequestPathBytes: median(
      selected.map((result) => result.memory.afterRequestPath.rssBytes),
    ),
    heapAfterRequestPathBytes: median(
      selected.map((result) => result.memory.afterRequestPath.heapUsedBytes),
    ),
    rssAfterCleanupBytes: median(
      selected.map((result) => result.memory.afterCleanup.rssBytes),
    ),
    heapAfterCleanupBytes: median(
      selected.map((result) => result.memory.afterCleanup.heapUsedBytes),
    ),
    rssGrowthBytes: median(
      selected.map(
        (result) =>
          result.memory.afterRequestPath.rssBytes - result.memory.before.rssBytes,
      ),
    ),
    heapGrowthBytes: median(
      selected.map(
        (result) =>
          result.memory.afterRequestPath.heapUsedBytes -
          result.memory.before.heapUsedBytes,
      ),
    ),
    ...(mode === "instrumented"
      ? {
          delivery: {
            eventsPerSecond: median(
              selected.map((result) => result.delivery.eventsPerSecond),
            ),
            durationMs: median(selected.map((result) => result.delivery.durationMs)),
            batches: median(selected.map((result) => result.delivery.batches)),
          },
        }
      : {}),
  };
}

const baseline = summary("baseline");
const instrumented = summary("instrumented");
const percent = (value) => Math.round(value * 100) / 100;

console.log(
  JSON.stringify(
    {
      environment: {
        platform: process.platform,
        architecture: process.arch,
        node: process.version,
        cpu: os.cpus()[0]?.model ?? "unknown",
        logicalCpuCount: os.cpus().length,
        totalMemoryBytes: os.totalmem(),
      },
      workload: { samples, requestCountPerSample: requestCount, concurrency },
      configuration: {
        route: "GET /benchmark/:id -> 204",
        requestPathDelivery: "deferred until after the measured window",
        batchSize: 100,
        maxBufferSize: Math.min(100_000, Math.max(10_000, requestCount)),
        flushThreshold: Math.min(100_000, Math.max(10_000, requestCount)),
        flushIntervalMs: 3_600_000,
        maxAttempts: 1,
      },
      summary: {
        baseline,
        instrumented,
        differencePercent: {
          requestsPerSecond: percent(
            ((instrumented.requestsPerSecond - baseline.requestsPerSecond) /
              baseline.requestsPerSecond) *
              100,
          ),
          p50: percent(
            ((instrumented.latencyMs.p50 - baseline.latencyMs.p50) /
              baseline.latencyMs.p50) *
              100,
          ),
          p95: percent(
            ((instrumented.latencyMs.p95 - baseline.latencyMs.p95) /
              baseline.latencyMs.p95) *
              100,
          ),
          p99: percent(
            ((instrumented.latencyMs.p99 - baseline.latencyMs.p99) /
              baseline.latencyMs.p99) *
              100,
          ),
          rssAfterRequestPathBytes:
            instrumented.rssAfterRequestPathBytes - baseline.rssAfterRequestPathBytes,
          heapAfterRequestPathBytes:
            instrumented.heapAfterRequestPathBytes - baseline.heapAfterRequestPathBytes,
        },
      },
      samples: results,
    },
    null,
    2,
  ),
);
