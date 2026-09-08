import assert from "assert";
import { before, after, test } from "node:test";
import pool from "../src/configs/db.js";
import supertest from "supertest";
import app from "../src/app.js";
import redisClient from "../src/utils/redis.js";
import { telemetryIngestionQueue } from "../src/queues/telemetry.queue.js";
import { telemetryWorker } from "../src/workers/telemetry.worker.js";

const testUser = {
  email: `testUser-${Date.now()}@gmail.com`,
  password: "testPassword123",
  first_name: "Broski",
  last_name: "tester",
};
let accessToken: string;
let refreshToken: string;
let apiKey: string;

const telemetryBatchPayload = [
  {
    type: "http",
    route: "/api/v1/auth/login",
    method: "POST",
    status: 200,
    duration_ms: 45.2,
    metadata: { ip: "127.0.0.1", user_agent: "Mozilla/5.0" },
    // Phase 2 Identity Added
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
    metadata: { query_text: "SELECT * FROM inflowapm.users" },
    // Phase 2 Identity Added
    user_id: "user_995",
    anonymous_id: "anon_fingerprint_xyz",
    email: testUser.email,
    ip: "127.0.0.1",
    occurred_at: new Date().toISOString(),
  },
];

//this section will execute before running the tests
before(async () => {
  await redisClient.flushall(); // Clear old states before test runs
  await supertest(app).post("/api/v1/auth/register").send(testUser);

  const response = await supertest(app)
    .post("/api/v1/auth/login")
    .send(testUser);
  accessToken = response.body.data.access_token;
  refreshToken = response.body.data.refresh_token;

  const newPorject = await supertest(app)
    .post("/api/v1/projects")
    .send({ name: "testProject" })
    .set("Authorization", `Bearer ${accessToken}`);
  apiKey = newPorject.body.data.api_key;
});

//verifying api key and creating bulk insertion into telemetry event
async function waitForTelemetry(email: string) {
  const timeoutAt = Date.now() + 5000;

  while (Date.now() < timeoutAt) {
    const result = await pool.query(
      `SELECT * FROM inflowapm.telemetry_events WHERE email = $1;`,
      [email],
    );

    if (result.rows.length >= 2) {
      return result.rows;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error("Telemetry was not inserted into PostgreSQL");
}
test("/api/v1/telemetry/ingest - creating bulk insertion", async () => {
  const response = await supertest(app)
    .post("/api/v1/telemetry/ingest")
    .send(telemetryBatchPayload)
    .set("Authorization", `Bearer ${apiKey}`);

  // API accepted the job
  assert.strictEqual(response.statusCode, 202);
  assert.strictEqual(response.body.success, true);

  // Wait until the data REALLY appears in PostgreSQL
  const rows = await waitForTelemetry(testUser.email);

  // Prove that both telemetry events were inserted
  assert.strictEqual(rows.length, 2);
});

//validating wrong api key and stopping user from ingesting telemetry events
test("/api/v1/telemetry/ingest -validating wrong api key and stopping user from ingesting telemetry events", async () => {
  const response = await supertest(app)
    .post("/api/v1/telemetry/ingest")
    .send(telemetryBatchPayload)
    .set("Authorization", `Bearer invalid-api-key-x-123`);

  assert.strictEqual(response.statusCode, 401);
  assert.strictEqual(response.body.success, false);
});

//validating wrong payload and stopping user from ingesting telemetry events
test("/api/v1/telemetry/ingest -validating wrong payload and stopping user from ingesting telemetry events", async () => {
  const response = await supertest(app)
    .post("/api/v1/telemetry/ingest")
    .send([])
    .set("Authorization", `Bearer ${apiKey}`);

  assert.strictEqual(response.statusCode, 400);
  assert.strictEqual(response.body.success, false);
});

//this section will be executed after all the test are done
after(async () => {
  //shutdown the workers and queues as they are separate services
  await telemetryWorker.close();
  await telemetryIngestionQueue.close();

  //delete user from the db after its created for testing
  await pool.query(`delete from inflowapm.users where email=$1;`, [
    testUser.email,
  ]);

  //end pool and redis connection
  await pool.end();
  await redisClient.quit();
});
