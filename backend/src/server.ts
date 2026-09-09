import app from "./app.js";
import { config } from "./configs/env.js";
import { initializedDB } from "./configs/initDB.js";

await initializedDB();
await import("./workers/telemetry.worker.js");

if (config.mail_enabled) {
  const { verifyMailConnection } = await import("./configs/mail.config.js");
  await verifyMailConnection();
  await import("./workers/email.worker.js");
}

const port = config.port;

app.listen(port, () => {
  console.log(`server is listening at port:${port}`);
});
