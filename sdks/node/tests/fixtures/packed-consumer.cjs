"use strict";

const assert = require("node:assert/strict");
const { createServer } = require("node:http");
const path = require("node:path");
const { createRequire } = require("node:module");

const consumerRoot = process.argv[2];
if (!consumerRoot) throw new Error("consumer root is required");
const consumerRequire = createRequire(path.join(consumerRoot, "index.cjs"));
const express = consumerRequire("express");
const { InflowAPM } = consumerRequire("@inflowapm/node");

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server.address().port));
  });
}

function close(server) {
  return new Promise((resolve) => server.close(resolve));
}

(async () => {
  const batches = [];
  const collector = createServer((request, response) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => {
      batches.push(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      response.statusCode = 202;
      response.end();
    });
  });
  const collectorPort = await listen(collector);
  const inflow = new InflowAPM({
    apiKey: "packed-consumer-key",
    endpoint: `http://127.0.0.1:${collectorPort}`,
    service: "packed-consumer",
    environment: "test",
    flushThreshold: 100,
    flushIntervalMs: 60_000,
  });
  const app = express();
  app.use(inflow.express());
  app.get("/packed/:id", (_request, response) => response.status(204).end());
  const applicationServer = createServer(app);
  const applicationPort = await listen(applicationServer);

  const response = await fetch(`http://127.0.0.1:${applicationPort}/packed/secret-id`);
  assert.equal(response.status, 204);
  assert.equal((await inflow.flush()).ok, true);
  assert.equal(batches.length, 1);
  assert.equal(batches[0].length, 1);
  assert.equal(batches[0][0].route, "/packed/:id");
  assert.equal(JSON.stringify(batches).includes("secret-id"), false);

  await inflow.shutdown();
  applicationServer.closeAllConnections?.();
  collector.closeAllConnections?.();
  await close(applicationServer);
  await close(collector);
  console.log(JSON.stringify({ ok: true, module: "commonjs", events: 1 }));
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
