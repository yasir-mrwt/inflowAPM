import assert from "node:assert/strict";
import { createServer, request as httpRequest } from "node:http";
import { test } from "node:test";
import express from "express";
import express4 from "express4";
import request from "supertest";
import { InflowAPM } from "../dist/esm/index.js";

async function startCollector(responder = () => ({ status: 202 })) {
  const requests = [];
  const server = createServer((incoming, response) => {
    const chunks = [];
    incoming.on("data", (chunk) => chunks.push(chunk));
    incoming.on("end", async () => {
      requests.push({
        body: Buffer.concat(chunks),
        headers: incoming.headers,
      });
      const result = await responder(requests.length, response);
      if (response.writableEnded) return;
      response.statusCode = result.status;
      response.end();
    });
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("no test port");
  return {
    endpoint: `http://127.0.0.1:${address.port}`,
    requests,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

function options(endpoint, overrides = {}) {
  return {
    apiKey: "express-sdk-secret-key",
    endpoint,
    service: "express-test",
    environment: "test",
    serviceVersion: "3.0.0",
    batchSize: 100,
    maxBufferSize: 100,
    flushThreshold: 100,
    flushIntervalMs: 60_000,
    requestTimeoutMs: 250,
    maxAttempts: 1,
    shutdownTimeoutMs: 250,
    ...overrides,
  };
}

function eventsFrom(collector) {
  return collector.requests.flatMap(({ body }) =>
    JSON.parse(body.toString("utf8")),
  );
}

async function waitUntil(predicate, timeoutMs = 1_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error("condition was not reached before timeout");
}

test("Express 5 captures normalized HTTP telemetry without changing responses", async (t) => {
  const collector = await startCollector();
  const inflow = new InflowAPM(options(collector.endpoint));
  t.after(async () => {
    await inflow.shutdown();
    await collector.close();
  });

  const app = express();
  app.use(inflow.express());
  app.use(express.json());
  app.get("/ok", (_request, response) => {
    response.set("X-Application-Header", "preserved").status(200).send("hello");
  });
  app.post("/items", (_request, response) => response.status(201).json({ id: 1 }));
  app.get("/bad", (_request, response) => response.sendStatus(400));
  app.get("/users/:id", (_request, response) => response.sendStatus(200));
  app.get("/slow", async (_request, response) => {
    await new Promise((resolve) => setTimeout(resolve, 25));
    response.sendStatus(200);
  });
  app.get("/async-error", async () => {
    await Promise.resolve();
    throw new Error("private application failure");
  });
  app.use((error, _request, response, _next) => {
    assert.equal(error.message, "private application failure");
    response.status(500).send("application-owned-error");
  });

  await request(app)
    .get("/ok")
    .expect("X-Application-Header", "preserved")
    .expect(200, "hello");
  await request(app).post("/items").send({ password: "body-secret" }).expect(201, { id: 1 });
  await request(app).get("/bad").expect(400);
  await request(app)
    .get("/users/customer-123?q=user%40example.com&token=query-secret")
    .set("Authorization", "Bearer incoming-secret")
    .set("Cookie", "session=cookie-secret")
    .expect(200);
  await request(app).get("/slow").expect(200);
  await request(app).get("/async-error").expect(500, "application-owned-error");
  await request(app).get("/missing/private-value?token=missing-secret").expect(404);

  assert.equal((await inflow.flush()).ok, true);
  const events = eventsFrom(collector);
  assert.deepEqual(
    events.map(({ method, route, status }) => ({ method, route, status })),
    [
      { method: "GET", route: "/ok", status: 200 },
      { method: "POST", route: "/items", status: 201 },
      { method: "GET", route: "/bad", status: 400 },
      { method: "GET", route: "/users/:id", status: 200 },
      { method: "GET", route: "/slow", status: 200 },
      { method: "GET", route: "/async-error", status: 500 },
      { method: "GET", route: "/__unmatched__", status: 404 },
    ],
  );
  assert.ok(events.find(({ route }) => route === "/slow").duration_ms >= 20);
  assert.ok(events.every(({ duration_ms }) => Number.isFinite(duration_ms) && duration_ms >= 0));
  assert.ok(events.every(({ occurred_at }) => Number.isFinite(Date.parse(occurred_at))));
  assert.deepEqual(events[0].metadata.inflow.service, {
    name: "express-test",
    version: "3.0.0",
  });

  const serialized = collector.requests.map(({ body }) => body.toString("utf8")).join("");
  for (const secret of [
    "customer-123",
    "user@example.com",
    "query-secret",
    "incoming-secret",
    "cookie-secret",
    "body-secret",
    "private application failure",
    "express-sdk-secret-key",
    "missing/private-value",
  ]) {
    assert.equal(serialized.includes(secret), false, `leaked ${secret}`);
  }
});

for (const [version, createExpress] of [
  ["4.22.2", express4],
  ["5.2.1", express],
]) {
  test(`nested router normalization works with Express ${version}`, async (t) => {
    const collector = await startCollector();
    const inflow = new InflowAPM(options(collector.endpoint));
    t.after(async () => {
      await inflow.shutdown();
      await collector.close();
    });
    const app = createExpress();
    const router = createExpress.Router();
    router.use(inflow.express({ routePrefix: "/api" }));
    router.get("/teams/:teamId", (_request, response) => response.sendStatus(200));
    app.use("/api", router);

    await request(app).get("/api/teams/team-987?private=yes").expect(200);
    await inflow.flush();
    const [event] = eventsFrom(collector);
    assert.equal(event.route, "/api/teams/:teamId");
    assert.equal(JSON.stringify(event).includes("team-987"), false);
  });
}

test("disabled middleware is a no-op", async (t) => {
  const collector = await startCollector();
  const inflow = new InflowAPM(options(collector.endpoint, { enabled: false }));
  t.after(collector.close);
  const app = express();
  app.use(inflow.express());
  app.get("/disabled", (_request, response) => response.status(200).send("unchanged"));

  await request(app).get("/disabled").expect(200, "unchanged");
  assert.equal(inflow.getStats().capturedEvents, 0);
  assert.equal(collector.requests.length, 0);
});

test("offline delivery and bounded backpressure do not affect application responses", async (t) => {
  const inflow = new InflowAPM(
    options("http://127.0.0.1:1", {
      batchSize: 1,
      maxBufferSize: 2,
      flushThreshold: 1,
      requestTimeoutMs: 50,
    }),
  );
  t.after(() => inflow.shutdown());
  const app = express();
  app.use(inflow.express());
  app.get("/safe/:id", (incoming, response) => response.status(200).send(incoming.params.id));

  const responses = await Promise.all(
    Array.from({ length: 20 }, (_, index) =>
      request(app).get(`/safe/${index}`).expect(200, String(index)),
    ),
  );
  assert.equal(responses.length, 20);
  await waitUntil(() => inflow.getStats().failedBatches >= 1);
  const stats = inflow.getStats();
  assert.ok(stats.droppedEvents > 0);
  assert.ok(stats.bufferedEvents <= 2);
});

test("concurrent requests are each captured exactly once", async (t) => {
  const collector = await startCollector();
  const inflow = new InflowAPM(options(collector.endpoint));
  t.after(async () => {
    await inflow.shutdown();
    await collector.close();
  });
  const app = express();
  app.use(inflow.express());
  app.get("/concurrent/:id", (_request, response) => response.sendStatus(204));

  await Promise.all(
    Array.from({ length: 40 }, (_, index) =>
      request(app).get(`/concurrent/${index}`).expect(204),
    ),
  );
  await inflow.flush();
  const events = eventsFrom(collector);
  assert.equal(events.length, 40);
  assert.ok(events.every(({ route }) => route === "/concurrent/:id"));
});

test("premature response close is captured once without interfering", async (t) => {
  const collector = await startCollector();
  const inflow = new InflowAPM(options(collector.endpoint));
  const app = express();
  app.use(inflow.express());
  app.get("/stream/:id", (_request, response) => {
    response.write("partial");
    setTimeout(() => response.end("complete"), 100);
  });
  const server = await new Promise((resolve, reject) => {
    const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
    listening.once("error", reject);
  });
  t.after(async () => {
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
    await inflow.shutdown();
    await collector.close();
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("no app port");

  await new Promise((resolve) => {
    const outgoing = httpRequest(
      { host: "127.0.0.1", port: address.port, path: "/stream/secret-id" },
      (response) => {
        response.once("data", () => response.destroy());
        response.once("close", resolve);
      },
    );
    outgoing.once("error", resolve);
    outgoing.end();
  });
  await waitUntil(() => inflow.getStats().capturedEvents === 1);
  await inflow.flush();
  const [event] = eventsFrom(collector);
  assert.equal(event.route, "/stream/:id");
  assert.equal(event.metadata.response_finished, false);
  assert.equal(eventsFrom(collector).length, 1);
});
