import app from "./app.js";
import { config } from "./configs/env.js";
import pool from "./configs/db.js";
import { initializedDB } from "./configs/initDB.js";
import redisClient from "./utils/redis.js";
import { connectSessionRedis, closeSessionRedis } from "./utils/session.js";

await initializedDB();
await redisClient.ping();
await connectSessionRedis();

const { telemetryWorker } = await import("./workers/telemetry.worker.js");
const { telemetryIngestionQueue } = await import(
  "./queues/telemetry.queue.js"
);

let emailWorkerModule:
  | typeof import("./workers/email.worker.js")
  | undefined;
let emailQueueModule: typeof import("./queues/email.queue.js") | undefined;

if (config.mail_enabled) {
  emailWorkerModule = await import("./workers/email.worker.js");
  emailQueueModule = await import("./queues/email.queue.js");
}

const port = config.port;

const server = app.listen(port, "0.0.0.0", () => {
  console.log(`server is listening on 0.0.0.0:${port}`);
});

let shuttingDown = false;

function closeHttpServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
    server.closeIdleConnections();
  });
}

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`Received ${signal}; starting graceful shutdown`);

  const forceExitTimer = setTimeout(() => {
    console.error("Graceful shutdown timed out");
    process.exit(1);
  }, 15_000);
  forceExitTimer.unref();

  const failures: unknown[] = [];
  const close = async (name: string, operation: () => Promise<unknown>) => {
    try {
      await operation();
    } catch (error) {
      failures.push(error);
      console.error(`Failed to close ${name}:`, error);
    }
  };

  await close("HTTP server", closeHttpServer);
  await close("telemetry worker", () => telemetryWorker.close());
  if (emailWorkerModule) {
    await close("email worker", () => emailWorkerModule!.emailWorker.close());
  }
  await close("telemetry queue", () => telemetryIngestionQueue.close());
  if (emailQueueModule) {
    await close("email queue", () => emailQueueModule!.emailQueue.close());
  }
  await close("session Redis client", closeSessionRedis);
  if (redisClient.status !== "end") {
    await close("application Redis client", () => redisClient.quit());
  }
  await close("PostgreSQL pool", () => pool.end());

  clearTimeout(forceExitTimer);
  if (failures.length === 0) {
    console.log("Server shutdown completed");
    process.exit(0);
  }

  process.exit(1);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
