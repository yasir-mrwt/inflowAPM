import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import supertest from "supertest";

import app from "../src/app.js";
import pool from "../src/configs/db.js";
import { initializedDB } from "../src/configs/initDB.js";
import { createErrorFingerprint } from "../src/utils/errorFingerprint.js";
import redisClient from "../src/utils/redis.js";

const owner = {
  email: `issues-owner-${Date.now()}@example.com`,
  password: "IssuesOwner123!",
  first_name: "Issues",
  last_name: "Owner",
};
const outsider = {
  email: `issues-outsider-${Date.now()}@example.com`,
  password: "IssuesOutsider123!",
  first_name: "Issues",
  last_name: "Outsider",
};

let ownerToken: string;
let outsiderToken: string;
let projectId: string;
let outsiderProjectId: string;
let baseIssueId: string;
let historicalTime: Date;

type ErrorEvent = {
  type?: "http" | "event";
  route: string;
  method?: string;
  status?: number;
  duration?: number;
  message: string;
  occurredAt: Date;
  userId?: string;
  anonymousId?: string;
  secretMetadata?: boolean;
};

async function insertError(project: string, event: ErrorEvent): Promise<string> {
  const type = event.type ?? "http";
  const result = await pool.query<{ id: string }>(
    `insert into inflowapm.telemetry_events
     (project_id, type, route, method, status, duration_ms, metadata,
      user_id, anonymous_id, email, ip, occurred_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     returning id::text as id`,
    [
      project,
      type,
      event.route,
      type === "http" ? (event.method ?? "GET") : null,
      type === "http" ? (event.status ?? 500) : null,
      event.duration ?? 20,
      {
        error_message: event.message,
        ...(event.secretMetadata
          ? {
              authorization: "Bearer must-not-leak",
              password: "must-not-leak",
              stack: "secret stack must-not-leak",
              request_body: { token: "must-not-leak" },
            }
          : {}),
      },
      event.userId ?? null,
      event.anonymousId ?? null,
      owner.email,
      "127.0.0.1",
      event.occurredAt,
    ],
  );
  return result.rows[0].id;
}

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
      .send({ name: "Issue grouping" }),
    supertest(app)
      .post("/api/v1/projects")
      .set("Authorization", `Bearer ${outsiderToken}`)
      .send({ name: "Outside issues" }),
  ]);
  projectId = ownerProject.body.data.id;
  outsiderProjectId = outsiderProject.body.data.id;

  const now = Date.now();
  historicalTime = new Date(now - 10 * 86_400_000);
  const common = { route: "/api/orders/:id", status: 500 };
  await insertError(projectId, { ...common, message: "Database connection failed", occurredAt: new Date(now - 60_000), userId: "user-a", secretMetadata: true });
  await insertError(projectId, { ...common, message: "  database   CONNECTION failed ", occurredAt: new Date(now - 120_000), userId: "user-b" });
  await insertError(projectId, { ...common, message: "database connection failed", occurredAt: new Date(now - 180_000), anonymousId: "anon-a" });
  await insertError(projectId, { ...common, message: "DATABASE CONNECTION FAILED", occurredAt: historicalTime, userId: "user-a" });

  await insertError(projectId, { ...common, message: "Validation pipeline failed", occurredAt: new Date(now - 240_000), userId: "user-c" });
  await insertError(projectId, { route: "/api/payments/:id", status: 500, message: "Database connection failed", occurredAt: new Date(now - 300_000) });
  await insertError(projectId, { ...common, status: 503, message: "Database connection failed", occurredAt: new Date(now - 360_000) });
  await insertError(projectId, { type: "event", route: "error", message: "Cache   unavailable", occurredAt: new Date(now - 420_000), anonymousId: "anon-cache" });
  await insertError(projectId, { type: "event", route: "error", message: " cache unavailable ", occurredAt: new Date(now - 480_000), anonymousId: "anon-cache" });

  await pool.query(
    `insert into inflowapm.telemetry_events
     (project_id, type, route, method, status, duration_ms, metadata, occurred_at)
     values
       ($1, 'http', '/not-an-issue', 'GET', 404, 3, '{}'::jsonb, now()),
       ($1, 'event', 'query', null, null, 2, '{}'::jsonb, now())`,
    [projectId],
  );
  await insertError(outsiderProjectId, { route: "/outside-only", message: "Outsider failure", occurredAt: new Date(now - 30_000) });
});

test("issues API requires authentication and enforces project ownership", async () => {
  const unauthenticated = await supertest(app)
    .get("/api/v1/telemetry/issues")
    .query({ project_id: projectId });
  assert.equal(unauthenticated.statusCode, 401);

  const forbidden = await supertest(app)
    .get("/api/v1/telemetry/issues")
    .query({ project_id: projectId })
    .set("Authorization", `Bearer ${outsiderToken}`);
  assert.equal(forbidden.statusCode, 403);
});

test("identical errors group with stable counts and meaningful differences separate", async () => {
  const response = await supertest(app)
    .get("/api/v1/telemetry/issues")
    .query({ project_id: projectId, range: "24h", limit: 20 })
    .set("Authorization", `Bearer ${ownerToken}`);
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.total_count, 5);

  const base = response.body.data.find(
    (issue: { route: string; status: number; message: string }) =>
      issue.route === "/api/orders/:id" &&
      issue.status === 500 &&
      issue.message === "database connection failed",
  );
  assert.ok(base);
  baseIssueId = base.issue_id;
  assert.equal(base.occurrence_count, 3);
  assert.equal(base.affected_identity_count, 3);
  assert.equal(base.affected_user_count, 2);
  assert.equal(base.affected_anonymous_count, 1);
  assert.equal(
    base.issue_id,
    createErrorFingerprint({
      errorKey: "http:500",
      message: "database connection failed",
      route: "/api/orders/:id",
    }),
  );

  const issueIds = new Set(response.body.data.map((issue: { issue_id: string }) => issue.issue_id));
  assert.equal(issueIds.size, 5);
});

test("historical errors group immediately at read time", async () => {
  const response = await supertest(app)
    .get("/api/v1/telemetry/issues")
    .query({ project_id: projectId, range: "30d" })
    .set("Authorization", `Bearer ${ownerToken}`);
  assert.equal(response.statusCode, 200);
  const base = response.body.data.find((issue: { issue_id: string }) => issue.issue_id === baseIssueId);
  assert.ok(base);
  assert.equal(base.occurrence_count, 4);
  assert.equal(new Date(base.first_seen).toISOString(), historicalTime.toISOString());
  assert.ok(new Date(base.last_seen).getTime() > historicalTime.getTime());
});

test("issues list supports search and server pagination", async () => {
  const firstPage = await supertest(app)
    .get("/api/v1/telemetry/issues")
    .query({ project_id: projectId, range: "24h", page: 1, limit: 2 })
    .set("Authorization", `Bearer ${ownerToken}`);
  const secondPage = await supertest(app)
    .get("/api/v1/telemetry/issues")
    .query({ project_id: projectId, range: "24h", page: 2, limit: 2 })
    .set("Authorization", `Bearer ${ownerToken}`);
  assert.equal(firstPage.statusCode, 200);
  assert.equal(firstPage.body.data.length, 2);
  assert.deepEqual(firstPage.body.meta, { page: 1, limit: 2, total_pages: 3 });
  assert.equal(secondPage.body.data.length, 2);
  assert.equal(firstPage.body.data[0].issue_id === secondPage.body.data[0].issue_id, false);

  const searched = await supertest(app)
    .get("/api/v1/telemetry/issues")
    .query({ project_id: projectId, range: "24h", search: "payments" })
    .set("Authorization", `Bearer ${ownerToken}`);
  assert.equal(searched.statusCode, 200);
  assert.equal(searched.body.total_count, 1);
  assert.equal(searched.body.data[0].route, "/api/payments/:id");
});

test("issue detail returns a bounded newest-first occurrence page", async () => {
  const response = await supertest(app)
    .get(`/api/v1/telemetry/issues/${baseIssueId}`)
    .query({ project_id: projectId, range: "30d", page: 1, limit: 2 })
    .set("Authorization", `Bearer ${ownerToken}`);
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.data.issue.occurrence_count, 4);
  assert.equal(response.body.data.occurrences.length, 2);
  assert.deepEqual(response.body.meta, { page: 1, limit: 2, total_pages: 2 });
  const [newest, next] = response.body.data.occurrences;
  assert.ok(new Date(newest.occurred_at).getTime() >= new Date(next.occurred_at).getTime());
  assert.equal(newest.user_id, "user-a");
});

test("issue responses expose no secret metadata, email, or IP fields", async () => {
  const response = await supertest(app)
    .get(`/api/v1/telemetry/issues/${baseIssueId}`)
    .query({ project_id: projectId, range: "24h" })
    .set("Authorization", `Bearer ${ownerToken}`);
  assert.equal(response.statusCode, 200);
  const serialized = JSON.stringify(response.body);
  assert.equal(serialized.includes("must-not-leak"), false);
  assert.equal("metadata" in response.body.data.occurrences[0], false);
  assert.equal("email" in response.body.data.occurrences[0], false);
  assert.equal("ip" in response.body.data.occurrences[0], false);
});

test("issue detail prevents cross-project access and returns 404 when absent", async () => {
  const forbidden = await supertest(app)
    .get(`/api/v1/telemetry/issues/${baseIssueId}`)
    .query({ project_id: projectId })
    .set("Authorization", `Bearer ${outsiderToken}`);
  assert.equal(forbidden.statusCode, 403);

  const absent = await supertest(app)
    .get(`/api/v1/telemetry/issues/${baseIssueId}`)
    .query({ project_id: outsiderProjectId })
    .set("Authorization", `Bearer ${outsiderToken}`);
  assert.equal(absent.statusCode, 404);
});

test("existing errors analytics still uses the unchanged telemetry contract", async () => {
  const response = await supertest(app)
    .get("/api/v1/telemetry/analytics/dashboard")
    .query({ project_id: projectId, range: "24h" })
    .set("Authorization", `Bearer ${ownerToken}`);
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.data.overview.total_errors, 6);
  assert.ok(response.body.data.recent_errors.length >= 6);
});

after(async () => {
  await pool.query(`delete from inflowapm.users where email = any($1::text[])`, [
    [owner.email, outsider.email],
  ]);
  await pool.end();
  await redisClient.quit();
});
