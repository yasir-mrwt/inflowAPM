import {
  InflowAPM,
  type CaptureResult,
  type FlushResult,
  type InflowAPMOptions,
  type TelemetryInput,
} from "@inflowapm/node";
import express from "express";

const options = {
  apiKey: "typed-project-key",
  endpoint: "http://localhost:5002",
  service: "checkout-api",
  environment: "test",
  serviceVersion: "1.0.0",
} satisfies InflowAPMOptions;

const event = {
  type: "http",
  route: "/products/:id",
  method: "GET",
  status: 200,
  durationMs: 10.5,
  metadata: { region: "pk-1", cached: false },
} satisfies TelemetryInput;

const client = new InflowAPM(options);
const capture: CaptureResult = client.captureEvent(event);
const flush: Promise<FlushResult> = client.flush();
const app = express();
app.use(client.express());

void capture;
void flush;
void app;
