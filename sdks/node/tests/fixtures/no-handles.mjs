import { InflowAPM } from "../../dist/esm/index.js";

const client = new InflowAPM({
  apiKey: "open-handle-check",
  endpoint: "http://127.0.0.1:1",
  service: "resource-check",
  environment: "test",
});

client.express();

client.captureEvent({
  type: "event",
  route: "query",
  durationMs: 1,
});
