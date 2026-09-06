import assert from "assert";
import { before, after, test } from "node:test";
import pool from "../src/configs/db.js";
import supertest from "supertest";
import app from "../src/app.js";
import redisClient from "../src/utils/redis.js";

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
    metadata: {
      ip: "127.0.0.1",
      user_agent: "Mozilla/5.0",
    },
    occurred_at: new Date().toISOString(),
  },
  {
    type: "event",
    route: "query", // Reuses route column for operation identifiers
    duration_ms: 12.4,
    metadata: {
      query_text: "SELECT * FROM inflowapm.users WHERE id = $1",
      rows_returned: 1,
    },
    occurred_at: new Date().toISOString(),
  },
];

before(async () => {
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
  console.log("apikey", apiKey);
});

//verifying api key and creating bulk insertion into telemetry event
test("/api/v1/telemetry/ingest -creating bulk insertion into telemetry envents ", async () => {
  const response = await supertest(app)
    .post("/api/v1/telemetry/ingest")
    .send(telemetryBatchPayload)
    .set("Authorization", `Bearer ${apiKey}`);

  assert.strictEqual(response.statusCode, 201);
  assert.strictEqual(response.body.success, true);
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

after(async () => {
  await pool.query(`delete from inflowapm.users where email=$1;`, [
    testUser.email,
  ]);
  await pool.end();
  await redisClient.quit();
});
