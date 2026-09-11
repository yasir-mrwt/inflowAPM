import { InflowAPM } from "@inflowapm/node";
import { createExampleApplication } from "./app.mjs";

function positiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

const shutdownTimeoutMs = positiveInteger(
  process.env.INFLOWAPM_SHUTDOWN_TIMEOUT_MS,
  1_500,
);

const inflow = new InflowAPM({
  apiKey: process.env.INFLOWAPM_API_KEY ?? "missing-api-key",
  endpoint: process.env.INFLOWAPM_ENDPOINT ?? "http://127.0.0.1:5002",
  service: process.env.INFLOWAPM_SERVICE ?? "sdk-example-api",
  environment: process.env.INFLOWAPM_ENVIRONMENT ?? "development",
  serviceVersion: process.env.INFLOWAPM_SERVICE_VERSION ?? "0.1.0",
  flushThreshold: positiveInteger(process.env.INFLOWAPM_FLUSH_THRESHOLD, 5),
  flushIntervalMs: positiveInteger(process.env.INFLOWAPM_FLUSH_INTERVAL_MS, 1_000),
  requestTimeoutMs: positiveInteger(process.env.INFLOWAPM_REQUEST_TIMEOUT_MS, 1_000),
  retryBaseDelayMs: positiveInteger(process.env.INFLOWAPM_RETRY_BASE_DELAY_MS, 50),
  retryMaxDelayMs: positiveInteger(process.env.INFLOWAPM_RETRY_MAX_DELAY_MS, 500),
  shutdownTimeoutMs,
});

const app = createExampleApplication(inflow);
const configuredPort = Number(process.env.PORT);
const port = Number.isSafeInteger(configuredPort) && configuredPort >= 0
  ? configuredPort
  : 3001;
const server = app.listen(port, "127.0.0.1", () => {
  const address = server.address();
  const boundPort = typeof address === "object" && address ? address.port : port;
  console.log(JSON.stringify({ event: "ready", port: boundPort }));
});

let stopping = false;
async function stop(signal) {
  if (stopping) return;
  stopping = true;
  // The SDK deliberately unrefs its timers. The host owns keeping its async
  // signal work alive after the listening socket closes.
  const hostDeadline = setTimeout(() => {
    console.error(JSON.stringify({ event: "shutdown_deadline_exceeded" }));
  }, shutdownTimeoutMs + 1_000);
  try {
    const serverClosed = new Promise((resolve) => server.close(resolve));
    const shutdown = await inflow.shutdown();
    await serverClosed;
    console.log(
      JSON.stringify({
        event: "stopped",
        signal,
        shutdown: {
          ok: shutdown.ok,
          timedOut: shutdown.timedOut,
          sentEvents: shutdown.sentEvents,
          droppedEvents: shutdown.droppedEvents,
        },
      }),
    );
  } finally {
    clearTimeout(hostDeadline);
  }
}

process.once("SIGINT", () => void stop("SIGINT"));
process.once("SIGTERM", () => void stop("SIGTERM"));
