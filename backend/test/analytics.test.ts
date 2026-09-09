import assert from "assert";
import { before, after, test } from "node:test";
import pool from "../src/configs/db.js";
import supertest from "supertest";
import app from "../src/app.js";
import redisClient from "../src/utils/redis.js";
import { telemetryIngestionQueue } from "../src/queues/telemetry.queue.js";
import { telemetryWorker } from "../src/workers/telemetry.worker.js";
import { initializedDB } from "../src/configs/initDB.js";

const testUser = {
  email: `testUser-${Date.now()}@gmail.com`,
  password: "testPassword123",
  first_name: "Broski",
  last_name: "tester",
};

const secondUser = {
  email: `secondUser-${Date.now()}@gmail.com`,
  password: `${Date.now()}ABC`,
  first_name: "frosti",
  last_name: "codes",
};

let accessToken: string;
let refreshToken: string;

let secAccessToken: string;
let secRefreshToken: string;

let apiKey: string;
let project_id: string;

// Sample telemetry batch used to verify ingestion and analytics aggregation.
const telemetryBatchPayload = [
  {
    type: "http",
    route: "/api/v1/auth/login",
    method: "POST",
    status: 500,
    duration_ms: 45.2,
    metadata: {
      ip: "127.0.0.1",
      user_agent: "Mozilla/5.0",
    },

    // Identity information associated with the telemetry event.
    user_id: "user_995",
    anonymous_id: "anon_fingerprint_xyz",
    email: testUser.email,
    ip: "127.0.0.1",
    occurred_at: new Date().toISOString(),
  },
  {
    type: "event",
    route: "query",
    duration_ms: 12.4,
    metadata: {
      query_text: "SELECT * FROM inflowapm.users",
    },

    // Identity information associated with the telemetry event.
    user_id: "user_995",
    anonymous_id: "anon_fingerprint_xyz",
    email: testUser.email,
    ip: "127.0.0.1",
    occurred_at: new Date().toISOString(),
  },
  {
    type: "http",
    route: "/api/old-failure",
    method: "GET",
    status: 503,
    duration_ms: 120,
    metadata: { error_message: "Historical failure" },
    email: testUser.email,
    occurred_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
  },
];

// Prepare users, authentication tokens, and a project before running the tests.
before(async () => {
  await initializedDB();
  // Clear Redis state to prevent previous test runs from affecting the current suite.
  await redisClient.flushdb();

  // Register the primary project owner.
  await supertest(app).post("/api/v1/auth/register").send(testUser);

  // Register a second user for multi-tenant authorization testing.
  await supertest(app).post("/api/v1/auth/register").send(secondUser);

  // Authenticate the primary user and store their tokens.
  const response = await supertest(app)
    .post("/api/v1/auth/login")
    .send(testUser);

  accessToken = response.body.data.access_token;
  refreshToken = response.body.data.refresh_token;

  // Authenticate the second user for cross-tenant access tests.
  const secUserResponse = await supertest(app)
    .post("/api/v1/auth/login")
    .send(secondUser);

  secAccessToken = secUserResponse.body.data.access_token;
  secRefreshToken = secUserResponse.body.data.refresh_token;

  // Create a project owned by the primary test user.
  const newProject = await supertest(app)
    .post("/api/v1/projects")
    .send({ name: "testProject" })
    .set("Authorization", `Bearer ${accessToken}`);

  apiKey = newProject.body.data.api_key;
  project_id = newProject.body.data.id;
});

// Poll PostgreSQL until the background worker has persisted the telemetry batch.
async function waitForTelemetry(email: string) {
  const timeoutAt = Date.now() + 5000;

  while (Date.now() < timeoutAt) {
    const result = await pool.query(
      `SELECT * FROM inflowapm.telemetry_events WHERE email = $1;`,
      [email],
    );

    // Return once both telemetry events have been written to the database.
    if (result.rows.length >= telemetryBatchPayload.length) {
      return result.rows;
    }

    // Give the BullMQ worker time to finish processing the queued ingestion job.
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error("Telemetry was not inserted into PostgreSQL");
}

// Verify that a valid API key can submit a telemetry batch for asynchronous ingestion.
test("POST /api/v1/telemetry/ingest accepts and persists a valid telemetry batch", async () => {
  const response = await supertest(app)
    .post("/api/v1/telemetry/ingest")
    .send(telemetryBatchPayload)
    .set("Authorization", `Bearer ${apiKey}`);

  // The API should accept the batch and queue it for background processing.
  assert.strictEqual(response.statusCode, 202);
  assert.strictEqual(response.body.success, true);

  // Wait until the asynchronous worker persists the events to PostgreSQL.
  const rows = await waitForTelemetry(testUser.email);

  // Confirm that every event from the submitted batch was stored successfully.
  assert.strictEqual(rows.length, telemetryBatchPayload.length);
});

// Verify that the project owner receives correctly aggregated dashboard metrics.
test("GET /api/v1/telemetry/analytics/dashboard returns accurate analytics for the project owner", async () => {
  const response = await supertest(app)
    .get("/api/v1/telemetry/analytics/dashboard")
    .query({
      project_id: project_id,
      range: "24h",
    })
    .set("Authorization", `Bearer ${accessToken}`);

  // The project owner should be allowed to access the analytics dashboard.
  assert.strictEqual(response.statusCode, 200);

  // Confirm that the overview metrics match the telemetry inserted during the test.
  assert.strictEqual(response.body.data.overview.total_requests, 1);

  assert.strictEqual(response.body.data.overview.total_errors, 1);
});

test("GET /api/v1/telemetry/analytics/dashboard limits recent errors to the selected range", async () => {
  const response = await supertest(app)
    .get("/api/v1/telemetry/analytics/dashboard")
    .query({ project_id, range: "1h" })
    .set("Authorization", `Bearer ${accessToken}`);

  assert.strictEqual(response.statusCode, 200);
  assert.strictEqual(response.body.data.recent_errors.length, 1);
  assert.strictEqual(
    response.body.data.recent_errors.some(
      (error: { route: string }) => error.route === "/api/old-failure",
    ),
    false,
  );
});

test("GET /api/v1/telemetry/analytics/dashboard rejects an invalid project UUID", async () => {
  const response = await supertest(app)
    .get("/api/v1/telemetry/analytics/dashboard")
    .query({ project_id: "not-a-uuid", range: "24h" })
    .set("Authorization", `Bearer ${accessToken}`);

  assert.strictEqual(response.statusCode, 400);
  assert.strictEqual(response.body.success, false);
});

test("GET /api/v1/telemetry/analytics/dashboard rejects an invalid range", async () => {
  const response = await supertest(app)
    .get("/api/v1/telemetry/analytics/dashboard")
    .query({ project_id, range: "90d" })
    .set("Authorization", `Bearer ${accessToken}`);

  assert.strictEqual(response.statusCode, 400);
  assert.strictEqual(response.body.success, false);
});

// Verify tenant isolation by preventing another authenticated user from accessing the project.
test("GET /api/v1/telemetry/analytics/dashboard rejects cross-tenant analytics access", async () => {
  const response = await supertest(app)
    .get("/api/v1/telemetry/analytics/dashboard")
    .query({
      project_id: project_id,
      range: "24h",
    })
    .set("Authorization", `Bearer ${secAccessToken}`);

  // A valid user must still be denied access to a project they do not own.
  assert.strictEqual(response.statusCode, 403);
  assert.strictEqual(response.body.success, false);
});

// Verify that authentication is required before accessing project analytics.
test("GET /api/v1/telemetry/analytics/dashboard rejects unauthenticated requests", async () => {
  const response = await supertest(app)
    .get("/api/v1/telemetry/analytics/dashboard")
    .query({
      project_id: project_id,
      range: "24h",
    });

  // Requests without an access token should be rejected by the authentication middleware.
  assert.strictEqual(response.statusCode, 401);
  assert.strictEqual(response.body.success, false);
});

// Release test resources and close external connections after all tests complete.
after(async () => {
  // Stop the BullMQ worker and queue before closing the Redis connection.
  await telemetryWorker.close();
  await telemetryIngestionQueue.close();

  // Removing both users also cascades the owned project and telemetry rows.
  await pool.query(
    `DELETE FROM inflowapm.users WHERE email = ANY($1::text[]);`,
    [[testUser.email, secondUser.email]],
  );

  // Close PostgreSQL and Redis connections so the test process can exit cleanly.
  await pool.end();
  await redisClient.quit();
});
