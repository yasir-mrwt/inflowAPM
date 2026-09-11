import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { InflowAPM } from "@inflowapm/node";
import { createExampleApplication } from "../examples/express/app.mjs";

const execFileAsync = promisify(execFile);
const repositoryRoot = fileURLToPath(new URL("../../../", import.meta.url));
const backendEndpoint = process.env.SDK4_BACKEND_ENDPOINT ?? "http://127.0.0.1:5002";

async function jsonRequest(url, options = {}) {
  const response = await fetch(url, options);
  const body = await response.json();
  return { status: response.status, body };
}

async function databaseJson(projectId) {
  const sql = `select coalesce(json_agg(json_build_object(
    'type', type,
    'route', route,
    'method', method,
    'status', status,
    'duration_ms', duration_ms,
    'metadata', metadata
  ) order by occurred_at)::text, '[]')
  from inflowapm.telemetry_events
  where project_id = '$SDK4_PROJECT_ID'::uuid;`;
  const { stdout } = await execFileAsync(
    "docker",
    [
      "compose",
      "exec",
      "-T",
      "-e",
      `SDK4_PROJECT_ID=${projectId}`,
      "postgres",
      "sh",
      "-lc",
      `psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At -c "${sql}"`,
    ],
    { cwd: repositoryRoot },
  );
  return JSON.parse(stdout.trim());
}

async function deleteUser(email) {
  const sql = `delete from inflowapm.users where email = '$SDK4_EMAIL';`;
  await execFileAsync(
    "docker",
    [
      "compose",
      "exec",
      "-T",
      "-e",
      `SDK4_EMAIL=${email}`,
      "postgres",
      "sh",
      "-lc",
      `psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At -c "${sql}"`,
    ],
    { cwd: repositoryRoot },
  );
}

async function seedUser(email, password) {
  const sql = `insert into inflowapm.users(email, password, first_name, last_name)
    values (
      '$SDK4_EMAIL',
      crypt('$SDK4_PASSWORD', gen_salt('bf', 10)),
      'SDKFour',
      'Tester'
    );`;
  await execFileAsync(
    "docker",
    [
      "compose",
      "exec",
      "-T",
      "-e",
      `SDK4_EMAIL=${email}`,
      "-e",
      `SDK4_PASSWORD=${password}`,
      "postgres",
      "sh",
      "-lc",
      `psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At -c "${sql}"`,
    ],
    { cwd: repositoryRoot },
  );
}

async function waitForRows(projectId, count, timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const rows = await databaseJson(projectId);
    if (rows.length >= count) return rows;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("BullMQ worker did not persist SDK telemetry before timeout");
}

const unique = `${Date.now()}-${process.pid}`;
const user = {
  email: `sdk4-${unique}@example.com`,
  password: `SDK4-${unique}-Password`,
  first_name: "SDKFour",
  last_name: "Tester",
};
let projectId;
let exampleServer;
let inflow;

try {
  // Seed a disposable local-only user to avoid registration email side effects.
  // Login, project creation, ingestion, analytics, queueing, and persistence still
  // use their real application paths.
  await seedUser(user.email, user.password);

  const login = await jsonRequest(`${backendEndpoint}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: user.email, password: user.password }),
  });
  assert.equal(login.status, 200);
  const accessToken = login.body.data.access_token;

  const project = await jsonRequest(`${backendEndpoint}/api/v1/projects`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: `SDK4-${unique}` }),
  });
  assert.equal(project.status, 201);
  projectId = project.body.data.id;
  const apiKey = project.body.data.api_key;

  inflow = new InflowAPM({
    apiKey,
    endpoint: backendEndpoint,
    service: "sdk-example-api",
    environment: "development",
    serviceVersion: "0.1.0",
    batchSize: 10,
    maxBufferSize: 100,
    flushThreshold: 100,
    flushIntervalMs: 60_000,
    requestTimeoutMs: 2_000,
    maxAttempts: 3,
    retryBaseDelayMs: 20,
    retryMaxDelayMs: 100,
    shutdownTimeoutMs: 2_000,
  });

  const app = createExampleApplication(inflow);
  exampleServer = await new Promise((resolve, reject) => {
    const server = app.listen(0, "127.0.0.1", () => resolve(server));
    server.once("error", reject);
  });
  const address = exampleServer.address();
  if (!address || typeof address === "string") throw new Error("example app has no port");
  const appEndpoint = `http://127.0.0.1:${address.port}`;

  const health = await fetch(
    `${appEndpoint}/health?email=privacy-test%40example.com&token=query-secret`,
    {
      headers: {
        Authorization: "Bearer incoming-authorization-secret",
        Cookie: "session=cookie-secret",
      },
    },
  );
  assert.equal(health.status, 200);
  const product = await fetch(`${appEndpoint}/api/products/123?token=product-secret`);
  assert.equal(product.status, 200);
  const checkout = await fetch(`${appEndpoint}/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: "body-password-secret" }),
  });
  assert.equal(checkout.status, 201);
  assert.equal((await fetch(`${appEndpoint}/slow`)).status, 200);
  assert.equal((await fetch(`${appEndpoint}/error`)).status, 500);
  assert.equal(
    (await fetch(`${appEndpoint}/private/customer-987?token=missing-secret`)).status,
    404,
  );

  const flush = await inflow.flush();
  assert.equal(flush.ok, true);
  assert.equal(flush.sentEvents, 6);

  const rows = await waitForRows(projectId, 6);
  assert.equal(rows.length, 6);
  const byRoute = new Map(rows.map((row) => [row.route, row]));
  assert.equal(byRoute.get("/health").status, 200);
  assert.equal(byRoute.get("/api/products/:id").status, 200);
  assert.equal(byRoute.get("/checkout").status, 201);
  assert.ok(byRoute.get("/slow").duration_ms >= 60);
  assert.equal(byRoute.get("/error").status, 500);
  assert.equal(byRoute.get("/__unmatched__").status, 404);

  for (const row of rows) {
    assert.equal(row.metadata.inflow.protocol_version, "1");
    assert.deepEqual(row.metadata.inflow.service, {
      name: "sdk-example-api",
      version: "0.1.0",
    });
    assert.equal(row.metadata.inflow.environment, "development");
    assert.equal(row.metadata.inflow.runtime.name, "node");
    assert.equal(row.metadata.inflow.sdk.name, "@inflowapm/node");
    assert.equal(row.metadata.inflow.sdk.version, "0.1.0");
  }

  const stored = JSON.stringify(rows);
  for (const secret of [
    "privacy-test@example.com",
    "query-secret",
    "incoming-authorization-secret",
    "cookie-secret",
    "123",
    "product-secret",
    "body-password-secret",
    "customer-987",
    "missing-secret",
    apiKey,
    "example application error",
  ]) {
    assert.equal(stored.includes(secret), false, `stored telemetry leaked ${secret}`);
  }

  const analytics = await jsonRequest(
    `${backendEndpoint}/api/v1/telemetry/analytics/dashboard?project_id=${projectId}&range=1h`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  assert.equal(analytics.status, 200);
  assert.equal(analytics.body.data.overview.total_requests, 6);
  assert.equal(analytics.body.data.overview.total_errors, 1);
  assert.ok(analytics.body.data.overview.p95_latency > 0);
  assert.ok(
    analytics.body.data.route_performance.some(
      (route) => route.route === "/api/products/:id" && route.request_count === 1,
    ),
  );
  assert.ok(
    analytics.body.data.recent_errors.some(
      (error) => error.route === "/error" && error.status === 500,
    ),
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        ingestion: { accepted: true, persistedEvents: rows.length },
        routes: Object.fromEntries(
          rows.map((row) => [row.route, { status: row.status, durationMs: row.duration_ms }]),
        ),
        metadata: rows[0].metadata.inflow,
        analytics: analytics.body.data,
        privacy: { leakedValues: 0 },
      },
      null,
      2,
    ),
  );
} finally {
  if (exampleServer) {
    exampleServer.closeAllConnections?.();
    await new Promise((resolve) => exampleServer.close(resolve));
  }
  if (inflow) await inflow.shutdown();
  if (projectId) await deleteUser(user.email);
}
