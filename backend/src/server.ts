import app from "./app.js";
import { config } from "./configs/env.js";
import { initializedDB } from "./configs/initDB.js";
import { connectSessionRedis, closeSessionRedis } from "./utils/session.js";

//initialize db connection
await initializedDB();

//connect session redis
await connectSessionRedis();

await import("./workers/telemetry.worker.js");

if (config.mail_enabled) {
  const { verifyMailConnection } = await import("./configs/mail.config.js");
  await verifyMailConnection();
  await import("./workers/email.worker.js");
}

const port = config.port;

const server = app.listen(port, () => {
  console.log(`server is listening at port:${port}`);
});

async function shutdown() {
  server.close(async () => {
    await closeSessionRedis();

    console.log("Server shutdown completed");
  });
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
