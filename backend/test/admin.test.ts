import assert from "node:assert";
import { after, before, test } from "node:test";
import bcrypt from "bcryptjs";
import supertest from "supertest";
import app from "../src/app.js";
import pool from "../src/configs/db.js";
import { config } from "../src/configs/env.js";
import { initializedDB } from "../src/configs/initDB.js";
import { bootstrapSuperAdmin } from "../src/services/admin.service.js";
import redisClient from "../src/utils/redis.js";

const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const admin = {
  email: `admin-${suffix}@example.com`,
  password: `Admin-${suffix}!`,
  newPassword: `Changed-${suffix}!`,
};
const normalUser = {
  email: `user-${suffix}@example.com`,
  password: `User-${suffix}!`,
  first_name: "AdminTest",
  last_name: "Tester",
};
const promotedUser = {
  email: `promoted-${suffix}@example.com`,
  password: `Promoted-${suffix}!`,
  first_name: "Promoted",
  last_name: "Account",
};

let adminId = "";
let userId = "";
let adminToken = "";
let userToken = "";
let projectId = "";
let projectApiKey = "";
let firstAuditId = 0;

before(async () => {
  await initializedDB();
  const audit = await pool.query(
    "select coalesce(max(id), 0)::int as id from inflowapm.admin_audit_logs",
  );
  firstAuditId = audit.rows[0].id;

  const first = await bootstrapSuperAdmin(admin.email, admin.password);
  adminId = first!.user.id;
  const passwordBefore = await pool.query(
    "select password from inflowapm.users where id = $1",
    [adminId],
  );
  assert.notStrictEqual(passwordBefore.rows[0].password, admin.password);
  assert.strictEqual(
    await bcrypt.compare(admin.password, passwordBefore.rows[0].password),
    true,
  );

  const second = await bootstrapSuperAdmin(admin.email, "IgnoredPassword-123!");
  const passwordAfter = await pool.query(
    "select password from inflowapm.users where id = $1",
    [adminId],
  );
  assert.strictEqual(second!.user.id, adminId);
  assert.strictEqual(second!.created, false);
  assert.strictEqual(passwordAfter.rows[0].password, passwordBefore.rows[0].password);

  const registered = await supertest(app)
    .post("/api/v1/auth/register")
    .send(normalUser)
    .expect(201);
  userId = registered.body.data.id;

  const userLogin = await supertest(app)
    .post("/api/v1/auth/login")
    .send({ email: normalUser.email, password: normalUser.password })
    .expect(200);
  userToken = userLogin.body.data.access_token;
});

test("admin authentication is separate, private, and role protected", async () => {
  const noSignup = await supertest(app)
    .post("/api/v1/admin/auth/register")
    .send(admin);
  assert.notStrictEqual(noSignup.statusCode, 201);

  await supertest(app)
    .post("/api/v1/admin/auth/login")
    .send({ email: admin.email, password: "definitely-wrong" })
    .expect(401);

  await supertest(app)
    .post("/api/v1/admin/auth/login")
    .send({ email: normalUser.email, password: normalUser.password })
    .expect(403);

  const login = await supertest(app)
    .post("/api/v1/admin/auth/login")
    .send({ email: admin.email, password: admin.password })
    .expect(200);
  adminToken = login.body.data.access_token;
  assert.strictEqual(login.body.data.admin.role, "super_admin");
  assert.strictEqual("password" in login.body.data.admin, false);

  await supertest(app).get("/api/v1/admin/overview").expect(401);
  await supertest(app)
    .get("/api/v1/admin/overview")
    .set("Authorization", `Bearer ${userToken}`)
    .expect(403);

  const me = await supertest(app)
    .get("/api/v1/admin/auth/me")
    .set("Authorization", `Bearer ${adminToken}`)
    .expect(200);
  assert.strictEqual(me.body.data.id, adminId);
  assert.strictEqual("password" in me.body.data, false);
  assert.strictEqual("refresh_token" in me.body.data, false);
});

test("bootstrap promotes an existing account without replacing its password", async () => {
  await supertest(app)
    .post("/api/v1/auth/register")
    .send(promotedUser)
    .expect(201);
  const before = await pool.query(
    "select id, password from inflowapm.users where email = $1",
    [promotedUser.email],
  );
  const result = await bootstrapSuperAdmin(
    promotedUser.email,
    "Must-Not-Replace-Existing-Password!",
  );
  const after = await pool.query(
    "select role, password from inflowapm.users where email = $1",
    [promotedUser.email],
  );
  assert.strictEqual(result!.user.id, before.rows[0].id);
  assert.strictEqual(result!.promoted, true);
  assert.strictEqual(after.rows[0].role, "super_admin");
  assert.strictEqual(after.rows[0].password, before.rows[0].password);
});

test("overview and user management use real, safe data", async () => {
  const overview = await supertest(app)
    .get("/api/v1/admin/overview")
    .set("Authorization", `Bearer ${adminToken}`)
    .expect(200);
  assert.ok(overview.body.data.total_users >= 2);
  assert.ok(Array.isArray(overview.body.data.recent_registrations));

  const users = await supertest(app)
    .get("/api/v1/admin/users")
    .query({ page: 1, limit: 10, search: normalUser.email })
    .set("Authorization", `Bearer ${adminToken}`)
    .expect(200);
  assert.strictEqual(users.body.data.length, 1);
  assert.strictEqual(users.body.data[0].id, userId);
  assert.strictEqual("password" in users.body.data[0], false);
  assert.strictEqual("refresh_token" in users.body.data[0], false);

  const detail = await supertest(app)
    .get(`/api/v1/admin/users/${userId}`)
    .set("Authorization", `Bearer ${adminToken}`)
    .expect(200);
  assert.strictEqual(detail.body.data.email, normalUser.email);

  await supertest(app)
    .patch(`/api/v1/admin/users/${adminId}/status`)
    .send({ status: "suspended" })
    .set("Authorization", `Bearer ${adminToken}`)
    .expect(400);
});

test("suspended users and disabled projects cannot use telemetry keys", async () => {
  const project = await supertest(app)
    .post("/api/v1/projects")
    .send({ name: `Admin project ${suffix}` })
    .set("Authorization", `Bearer ${userToken}`)
    .expect(201);
  projectId = project.body.data.id;
  projectApiKey = project.body.data.api_key;

  const telemetry = [
    {
      type: "http",
      route: "/admin-test",
      method: "GET",
      status: 200,
      duration_ms: 3,
      occurred_at: new Date().toISOString(),
    },
  ];
  await supertest(app)
    .post("/api/v1/telemetry/ingest")
    // Authentication runs before payload validation. This warms the API-key
    // cache without leaving an unprocessed queue job for the next test file.
    .send([])
    .set("Authorization", `Bearer ${projectApiKey}`)
    .expect(400);

  await supertest(app)
    .patch(`/api/v1/admin/users/${userId}/status`)
    .send({ status: "suspended" })
    .set("Authorization", `Bearer ${adminToken}`)
    .expect(200);
  await supertest(app)
    .get("/api/v1/projects")
    .set("Authorization", `Bearer ${userToken}`)
    .expect(403);
  await supertest(app)
    .post("/api/v1/telemetry/ingest")
    .send(telemetry)
    .set("Authorization", `Bearer ${projectApiKey}`)
    .expect(403);

  await supertest(app)
    .patch(`/api/v1/admin/users/${userId}/status`)
    .send({ status: "active" })
    .set("Authorization", `Bearer ${adminToken}`)
    .expect(200);

  const projects = await supertest(app)
    .get("/api/v1/admin/projects")
    .query({ page: 1, limit: 10, search: suffix })
    .set("Authorization", `Bearer ${adminToken}`)
    .expect(200);
  assert.strictEqual(projects.body.data[0].id, projectId);
  assert.strictEqual("api_key" in projects.body.data[0], false);

  const detail = await supertest(app)
    .get(`/api/v1/admin/projects/${projectId}`)
    .set("Authorization", `Bearer ${adminToken}`)
    .expect(200);
  assert.strictEqual(detail.body.data.api_key_metadata.exposed, false);
  assert.strictEqual("api_key" in detail.body.data, false);

  await supertest(app)
    .patch(`/api/v1/admin/projects/${projectId}/status`)
    .send({ status: "disabled" })
    .set("Authorization", `Bearer ${adminToken}`)
    .expect(200);
  await supertest(app)
    .post("/api/v1/telemetry/ingest")
    .send(telemetry)
    .set("Authorization", `Bearer ${projectApiKey}`)
    .expect(403);
  await supertest(app)
    .patch(`/api/v1/admin/projects/${projectId}/status`)
    .send({ status: "active" })
    .set("Authorization", `Bearer ${adminToken}`)
    .expect(200);
});

test("audit logs, settings, and system health expose safe state only", async () => {
  const logs = await supertest(app)
    .get("/api/v1/admin/audit-logs")
    .query({ page: 1, limit: 100 })
    .set("Authorization", `Bearer ${adminToken}`)
    .expect(200);
  const actions = logs.body.data.map((entry: { action: string }) => entry.action);
  assert.ok(actions.includes("admin.login.succeeded"));
  assert.ok(actions.includes("admin.login.failed"));
  assert.ok(actions.includes("user.suspended"));
  assert.ok(actions.includes("project.disabled"));

  const settings = await supertest(app)
    .get("/api/v1/admin/settings")
    .set("Authorization", `Bearer ${adminToken}`)
    .expect(200);
  assert.strictEqual(typeof settings.body.data.mail_enabled, "boolean");

  const health = await supertest(app)
    .get("/api/v1/admin/system/health")
    .set("Authorization", `Bearer ${adminToken}`)
    .expect(200);
  const serialized = JSON.stringify(health.body);
  for (const secret of [
    config.db_url,
    config.redis_url,
    config.access_token,
    config.refresh_token,
    config.resend_api_key,
    config.google_client_secret,
    config.session_secret,
  ].filter((value): value is string => Boolean(value))) {
    assert.strictEqual(serialized.includes(secret), false);
  }
});

test("admin password change hashes the password and revokes refresh sessions", async () => {
  await supertest(app)
    .post("/api/v1/admin/auth/change-password")
    .send({ current_password: admin.password, new_password: admin.newPassword })
    .set("Authorization", `Bearer ${adminToken}`)
    .expect(200);

  const stored = await pool.query(
    "select password, refresh_token from inflowapm.users where id = $1",
    [adminId],
  );
  assert.strictEqual(stored.rows[0].refresh_token, null);
  assert.notStrictEqual(stored.rows[0].password, admin.newPassword);
  assert.strictEqual(await bcrypt.compare(admin.newPassword, stored.rows[0].password), true);

  await supertest(app)
    .post("/api/v1/admin/auth/login")
    .send({ email: admin.email, password: admin.password })
    .expect(401);
  await supertest(app)
    .post("/api/v1/admin/auth/login")
    .send({ email: admin.email, password: admin.newPassword })
    .expect(200);
});

after(async () => {
  const { telemetryIngestionQueue } = await import(
    "../src/queues/telemetry.queue.js"
  );
  await telemetryIngestionQueue.close();
  await pool.query("delete from inflowapm.admin_audit_logs where id > $1", [
    firstAuditId,
  ]);
  await pool.query("delete from inflowapm.users where email = any($1::text[])", [
    [admin.email, normalUser.email, promotedUser.email],
  ]);
  await pool.end();
  await redisClient.quit();
});
