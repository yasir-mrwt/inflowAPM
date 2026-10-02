import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import supertest from "supertest";

import app from "../src/app.js";
import pool from "../src/configs/db.js";
import { initializedDB } from "../src/configs/initDB.js";
import redisClient from "../src/utils/redis.js";

const owner = {
  email: `request-owner-${Date.now()}@example.com`,
  password: "RequestOwner123!",
  first_name: "Request",
  last_name: "Owner",
};
const outsider = {
  email: `request-outsider-${Date.now()}@example.com`,
  password: "RequestOutsider123!",
  first_name: "Request",
  last_name: "Outsider",
};

let ownerToken: string;
let outsiderToken: string;
let projectId: string;
let outsiderProjectId: string;
let newestRequestId: string;
let secondNewestRequestId: string;
let errorRequestId: string;

before(async () => {
  await initializedDB();
  await Promise.all([
    supertest(app).post("/api/v1/auth/register").send(owner),
    supertest(app).post("/api/v1/auth/register").send(outsider),
  ]);

  const [ownerLogin, outsiderLogin] = await Promise.all([
    supertest(app).post("/api/v1/auth/login").send(owner),
    supertest(app).post("/api/v1/auth/login").send(outsider),
  ]);
  ownerToken = ownerLogin.body.data.access_token;
  outsiderToken = outsiderLogin.body.data.access_token;

  const [ownerProject, outsiderProject] = await Promise.all([
    supertest(app)
      .post("/api/v1/projects")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Request investigation" }),
    supertest(app)
      .post("/api/v1/projects")
      .set("Authorization", `Bearer ${outsiderToken}`)
      .send({ name: "Isolated requests" }),
  ]);
  projectId = ownerProject.body.data.id;
  outsiderProjectId = outsiderProject.body.data.id;

  const sharedNewestTime = new Date(Date.now() - 60_000);
  const events = [
    { route: "/api/orders/newest-a", method: "GET", status: 200, duration: 8, occurredAt: sharedNewestTime },
    { route: "/api/orders/newest-b", method: "PATCH", status: 204, duration: 10, occurredAt: sharedNewestTime },
    { route: "/api/orders/slow", method: "POST", status: 503, duration: 250, occurredAt: new Date(Date.now() - 120_000) },
    { route: "/health", method: "GET", status: 200, duration: 2, occurredAt: new Date(Date.now() - 180_000) },
    { route: "/api/orders/old", method: "DELETE", status: 404, duration: 18, occurredAt: new Date(Date.now() - 240_000) },
    { route: "/outside-range", method: "GET", status: 500, duration: 99, occurredAt: new Date(Date.now() - 40 * 86_400_000) },
  ];

  const insertedIds: string[] = [];
  for (const event of events) {
    const result = await pool.query<{ id: string }>(
      `insert into inflowapm.telemetry_events
       (project_id, type, route, method, status, duration_ms, metadata,
        user_id, anonymous_id, email, ip, occurred_at)
       values ($1, 'http', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       returning id::text as id`,
      [
        projectId,
        event.route,
        event.method,
        event.status,
        event.duration,
        {
          error_message: event.status === 503 ? "Upstream timed out" : undefined,
          authorization: "Bearer must-not-leak",
          password: "must-not-leak",
          request_body: { secret: "must-not-leak" },
        },
        "customer-42",
        "anonymous-42",
        owner.email,
        "127.0.0.1",
        event.occurredAt,
      ],
    );
    insertedIds.push(result.rows[0].id);
  }

  secondNewestRequestId = insertedIds[0];
  newestRequestId = insertedIds[1];
  errorRequestId = insertedIds[2];

  await pool.query(
    `insert into inflowapm.telemetry_events
     (project_id, type, route, method, status, duration_ms, occurred_at)
     values ($1, 'http', '/private', 'GET', 200, 1, now())`,
    [outsiderProjectId],
  );
});

test("request list requires authentication", async () => {
  const response = await supertest(app)
    .get("/api/v1/telemetry/requests")
    .query({ project_id: projectId });
  assert.equal(response.statusCode, 401);
});

test("request list enforces project ownership", async () => {
  const response = await supertest(app)
    .get("/api/v1/telemetry/requests")
    .query({ project_id: projectId })
    .set("Authorization", `Bearer ${outsiderToken}`);
  assert.equal(response.statusCode, 403);
  assert.equal(response.body.success, false);
});

test("request list is paginated and deterministically newest-first", async () => {
  const firstPage = await supertest(app)
    .get("/api/v1/telemetry/requests")
    .query({ project_id: projectId, range: "24h", page: 1, limit: 2 })
    .set("Authorization", `Bearer ${ownerToken}`);

  assert.equal(firstPage.statusCode, 200);
  assert.equal(firstPage.body.total_count, 5);
  assert.deepEqual(firstPage.body.meta, { page: 1, limit: 2, total_pages: 3 });
  assert.deepEqual(
    firstPage.body.data.map((request: { id: string }) => request.id),
    [newestRequestId, secondNewestRequestId],
  );

  const secondPage = await supertest(app)
    .get("/api/v1/telemetry/requests")
    .query({ project_id: projectId, range: "24h", page: 2, limit: 2 })
    .set("Authorization", `Bearer ${ownerToken}`);
  assert.equal(secondPage.statusCode, 200);
  assert.equal(secondPage.body.data.length, 2);
  assert.notDeepEqual(secondPage.body.data, firstPage.body.data);
});

test("request list validates bounded pagination and time range", async () => {
  const tooLarge = await supertest(app)
    .get("/api/v1/telemetry/requests")
    .query({ project_id: projectId, limit: 101 })
    .set("Authorization", `Bearer ${ownerToken}`);
  assert.equal(tooLarge.statusCode, 400);

  const inRange = await supertest(app)
    .get("/api/v1/telemetry/requests")
    .query({ project_id: projectId, range: "30d" })
    .set("Authorization", `Bearer ${ownerToken}`);
  assert.equal(inRange.statusCode, 200);
  assert.equal(inRange.body.total_count, 5);
  assert.equal(
    inRange.body.data.some((request: { route: string }) => request.route === "/outside-range"),
    false,
  );
});

test("request list supports method, status, and route search filters", async () => {
  const cases = [
    [{ method: "POST" }, ["/api/orders/slow"]],
    [{ status: 503 }, ["/api/orders/slow"]],
    [
      { search: "orders" },
      [
        "/api/orders/newest-b",
        "/api/orders/newest-a",
        "/api/orders/slow",
        "/api/orders/old",
      ],
    ],
  ] as const;

  for (const [filter, expectedRoutes] of cases) {
    const response = await supertest(app)
      .get("/api/v1/telemetry/requests")
      .query({ project_id: projectId, range: "24h", ...filter })
      .set("Authorization", `Bearer ${ownerToken}`);
    assert.equal(response.statusCode, 200);
    assert.deepEqual(
      response.body.data.map((request: { route: string }) => request.route),
      expectedRoutes,
    );
  }
});

test("request responses expose only the safe allowlisted fields", async () => {
  const response = await supertest(app)
    .get("/api/v1/telemetry/requests")
    .query({ project_id: projectId, status: 503 })
    .set("Authorization", `Bearer ${ownerToken}`);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(Object.keys(response.body.data[0]).sort(), [
    "anonymous_id",
    "duration_ms",
    "id",
    "is_error",
    "method",
    "occurred_at",
    "project_id",
    "route",
    "status",
    "user_id",
  ]);
  assert.equal(JSON.stringify(response.body).includes("must-not-leak"), false);
});

test("request detail returns safe stored identity and error context", async () => {
  const response = await supertest(app)
    .get(`/api/v1/telemetry/requests/${errorRequestId}`)
    .set("Authorization", `Bearer ${ownerToken}`);
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.data.id, errorRequestId);
  assert.equal(response.body.data.user_id, "customer-42");
  assert.equal(response.body.data.anonymous_id, "anonymous-42");
  assert.equal(response.body.data.error_message, "Upstream timed out");
  assert.equal(response.body.data.is_error, true);
  assert.equal(JSON.stringify(response.body).includes("must-not-leak"), false);
});

test("request detail returns 404 for missing and cross-project records", async () => {
  const missing = await supertest(app)
    .get("/api/v1/telemetry/requests/9223372036854775807")
    .set("Authorization", `Bearer ${ownerToken}`);
  assert.equal(missing.statusCode, 404);

  const crossProject = await supertest(app)
    .get(`/api/v1/telemetry/requests/${errorRequestId}`)
    .set("Authorization", `Bearer ${outsiderToken}`);
  assert.equal(crossProject.statusCode, 404);
});

test("existing dashboard analytics still reads the same ingested table", async () => {
  const response = await supertest(app)
    .get("/api/v1/telemetry/analytics/dashboard")
    .query({ project_id: projectId, range: "24h" })
    .set("Authorization", `Bearer ${ownerToken}`);
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.data.overview.total_requests, 5);
});

after(async () => {
  await pool.query(`delete from inflowapm.users where email = any($1::text[])`, [
    [owner.email, outsider.email],
  ]);
  await pool.end();
  await redisClient.quit();
});
