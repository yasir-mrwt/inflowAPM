import app from "./app.js";
import { config } from "./configs/env.js";
import { verifyMailConnection } from "./configs/mail.config.js";
import "./workers/email.worker.js";

await verifyMailConnection();

const port = config.port;

app.listen(port, () => {
  console.log(`server is listening at port:${port}`);
});
