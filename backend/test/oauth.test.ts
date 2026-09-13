import assert from "node:assert";
import crypto from "node:crypto";
import { after, before, describe, test } from "node:test";
import jwt from "jsonwebtoken";
import supertest from "supertest";

import app from "../src/app.js";
import { config } from "../src/configs/env.js";
import { googleOAuthClient } from "../src/configs/googleOAuth.js";
import pool from "../src/configs/db.js";
import { initializedDB } from "../src/configs/initDB.js";
import { createOAuthExchangeCode } from "../src/services/user.service.js";
import redisClient from "../src/utils/redis.js";
import { closeSessionRedis, connectSessionRedis, sessionRedisClient } from "../src/utils/session.js";

type StubIdentity = {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  given_name?: string;
  family_name?: string;
};

const oauthClient = googleOAuthClient as unknown as {
  generateAuthUrl: (options: { scope?: string[]; state?: string }) => string;
  getToken: (code: string) => Promise<{ tokens: { id_token?: string } }>;
  verifyIdToken: (options: { idToken: string; audience: string }) => Promise<{ getPayload: () => StubIdentity | undefined }>;
};

const originals = {
  generateAuthUrl: oauthClient.generateAuthUrl,
  getToken: oauthClient.getToken,
  verifyIdToken: oauthClient.verifyIdToken,
};

let identity: StubIdentity | undefined;
let generatedOptions: { scope?: string[]; state?: string } | undefined;
let googleTokenCalls = 0;
const googleEmail = `oauth-${Date.now()}@example.com`;
const localEmail = `oauth-local-${Date.now()}@example.com`;
let oauthUserId = "";
let exchangeCode = "";

function stateFromLocation(location: string): string {
  const state = new URL(location).searchParams.get("state");
  assert.ok(state);
  return state;
}

async function startOAuth(agent: ReturnType<typeof supertest.agent>): Promise<string> {
  const response = await agent.get("/api/v1/auth/google").expect(302);
  return stateFromLocation(response.headers.location);
}

async function completeCallback(
  agent: ReturnType<typeof supertest.agent>,
  state: string,
): Promise<supertest.Response> {
  return agent.get("/api/v1/auth/google/callback").query({ code: "stub-google-code", state });
}

describe("Google OAuth Flow", { concurrency: false }, () => {
  before(async () => {
    await initializedDB();
    await connectSessionRedis();
    await redisClient.flushdb();

    oauthClient.generateAuthUrl = (options) => {
      generatedOptions = options;
      const url = new URL("https://accounts.google.test/o/oauth2/auth");
      url.searchParams.set("state", options.state ?? "");
      return url.toString();
    };
    oauthClient.getToken = async () => {
      googleTokenCalls += 1;
      return { tokens: { id_token: "stub-id-token" } };
    };
    oauthClient.verifyIdToken = async ({ audience }) => {
      assert.strictEqual(audience, config.google_client_id);
      return { getPayload: () => identity };
    };
  });

  test("GET /google saves random state before redirecting with required scopes", async () => {
    const agent = supertest.agent(app);
    const state = await startOAuth(agent);
    assert.match(state, /^[a-f0-9]{64}$/);
    assert.deepStrictEqual(generatedOptions?.scope, ["openid", "email", "profile"]);
    const keys = await sessionRedisClient.keys("oauth:*");
    assert.strictEqual(keys.length, 1);
    const savedSession = await sessionRedisClient.get(keys[0]);
    assert.ok(savedSession?.includes(state));
  });

  test("callback rejects a missing saved session state without contacting Google", async () => {
    const callsBefore = googleTokenCalls;
    const response = await supertest(app)
      .get("/api/v1/auth/google/callback")
      .query({ code: "stub-google-code", state: "a".repeat(64) });
    assert.strictEqual(response.statusCode, 401);
    assert.strictEqual(googleTokenCalls, callsBefore);
  });

  test("callback rejects mismatched state without contacting Google", async () => {
    const agent = supertest.agent(app);
    await startOAuth(agent);
    const callsBefore = googleTokenCalls;
    const response = await completeCallback(agent, "b".repeat(64));
    assert.strictEqual(response.statusCode, 401);
    assert.strictEqual(googleTokenCalls, callsBefore);
  });

  test("callback rejects incomplete Google identity and consumes verified state", async () => {
    const agent = supertest.agent(app);
    const state = await startOAuth(agent);
    identity = { email_verified: true };
    const response = await completeCallback(agent, state);
    assert.strictEqual(response.statusCode, 401);
    const repeated = await completeCallback(agent, state);
    assert.strictEqual(repeated.statusCode, 401);
  });

  test("callback rejects an unverified Google email", async () => {
    const agent = supertest.agent(app);
    const state = await startOAuth(agent);
    identity = { sub: "google-unverified", email: `unverified-${Date.now()}@example.com`, email_verified: false };
    const response = await completeCallback(agent, state);
    assert.strictEqual(response.statusCode, 401);
  });

  test("new verified Google identity transactionally creates one passwordless user and link", async () => {
    const agent = supertest.agent(app);
    const state = await startOAuth(agent);
    identity = { sub: "google-new-user", email: googleEmail, email_verified: true, given_name: "OAuth", family_name: "Tester" };
    const response = await completeCallback(agent, state);
    assert.strictEqual(response.statusCode, 302);
    const location = new URL(response.headers.location);
    assert.strictEqual(location.pathname, "/oauth/callback");
    exchangeCode = location.searchParams.get("code") ?? "";
    assert.match(exchangeCode, /^[a-f0-9]{64}$/);
    assert.strictEqual(location.searchParams.has("access_token"), false);
    assert.strictEqual(location.searchParams.has("refresh_token"), false);

    const users = await pool.query("SELECT id, password FROM inflowapm.users WHERE email=$1", [googleEmail]);
    assert.strictEqual(users.rowCount, 1);
    assert.strictEqual(users.rows[0].password, null);
    oauthUserId = users.rows[0].id;
    const links = await pool.query("SELECT user_id FROM inflowapm.oauth_accounts WHERE provider=$1 AND provider_user_id=$2", ["google", "google-new-user"]);
    assert.strictEqual(links.rowCount, 1);
    assert.strictEqual(links.rows[0].user_id, oauthUserId);
  });

  test("returning linked Google identity reuses the same local user", async () => {
    const agent = supertest.agent(app);
    const state = await startOAuth(agent);
    identity = { sub: "google-new-user", email: googleEmail, email_verified: true };
    const response = await completeCallback(agent, state);
    assert.strictEqual(response.statusCode, 302);
    const users = await pool.query("SELECT id FROM inflowapm.users WHERE email=$1", [googleEmail]);
    const links = await pool.query("SELECT id FROM inflowapm.oauth_accounts WHERE provider_user_id=$1", ["google-new-user"]);
    assert.strictEqual(users.rowCount, 1);
    assert.strictEqual(users.rows[0].id, oauthUserId);
    assert.strictEqual(links.rowCount, 1);
  });

  test("Google identity is not silently linked to an existing local email", async () => {
    await supertest(app).post("/api/v1/auth/register").send({ email: localEmail, password: "LocalPassword123", first_name: "Local", last_name: "Owner" }).expect(201);
    const agent = supertest.agent(app);
    const state = await startOAuth(agent);
    identity = { sub: "google-conflict-user", email: localEmail, email_verified: true };
    const response = await completeCallback(agent, state);
    assert.strictEqual(response.statusCode, 409);
    const links = await pool.query("SELECT id FROM inflowapm.oauth_accounts WHERE provider_user_id=$1", ["google-conflict-user"]);
    assert.strictEqual(links.rowCount, 0);
  });

  test("POST exchange consumes code once and uses normal JWT/refresh-token flow", async () => {
    const response = await supertest(app).post("/api/v1/auth/oauth/exchange").send({ code: exchangeCode });
    assert.strictEqual(response.statusCode, 200);
    assert.strictEqual(response.body.data.user.id, oauthUserId);
    const accessPayload = jwt.verify(response.body.data.access_token, config.access_token) as { id: string };
    const refreshPayload = jwt.verify(response.body.data.refresh_token, config.refresh_token) as { id: string };
    assert.strictEqual(accessPayload.id, oauthUserId);
    assert.strictEqual(refreshPayload.id, oauthUserId);
    const stored = await pool.query("SELECT refresh_token FROM inflowapm.users WHERE id=$1", [oauthUserId]);
    assert.notStrictEqual(stored.rows[0].refresh_token, response.body.data.refresh_token);
    assert.strictEqual(stored.rows[0].refresh_token.length, 64);

    const reused = await supertest(app).post("/api/v1/auth/oauth/exchange").send({ code: exchangeCode });
    assert.strictEqual(reused.statusCode, 401);
  });

  test("exchange rejects query-only, unknown, and expired codes", async () => {
    const queryOnly = await supertest(app).post("/api/v1/auth/oauth/exchange").query({ code: "query-code" });
    assert.strictEqual(queryOnly.statusCode, 400);
    const unknown = await supertest(app).post("/api/v1/auth/oauth/exchange").send({ code: "unknown-code" });
    assert.strictEqual(unknown.statusCode, 401);
    const expired = await createOAuthExchangeCode(oauthUserId);
    const expiredHash = crypto.createHash("sha256").update(expired).digest("hex");
    await redisClient.del(`oauth:exchange:${expiredHash}`);
    const expiredResponse = await supertest(app).post("/api/v1/auth/oauth/exchange").send({ code: expired });
    assert.strictEqual(expiredResponse.statusCode, 401);
  });

  test("password login safely rejects an OAuth-only account", async () => {
    const response = await supertest(app).post("/api/v1/auth/login").send({ email: googleEmail, password: "SomePassword123" });
    assert.strictEqual(response.statusCode, 401);
    assert.strictEqual(response.body.message, "Invalid email or password");
  });

  test("password reset sets a password for an OAuth-created account", async () => {
    const rawToken = `oauth-reset-${Date.now()}`;
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    await pool.query("INSERT INTO inflowapm.reset_password_tokens(user_id, token_hash, expires_at) VALUES($1,$2,$3)", [oauthUserId, tokenHash, new Date(Date.now() + 15 * 60 * 1000)]);
    await supertest(app).post("/api/v1/auth/reset-password").send({ token: rawToken, password: "OAuthPassword123" }).expect(200);
    await supertest(app).post("/api/v1/auth/login").send({ email: googleEmail, password: "OAuthPassword123" }).expect(200);
  });

  after(async () => {
    oauthClient.generateAuthUrl = originals.generateAuthUrl;
    oauthClient.getToken = originals.getToken;
    oauthClient.verifyIdToken = originals.verifyIdToken;
    await pool.query("DELETE FROM inflowapm.users WHERE email = ANY($1::text[])", [[googleEmail, localEmail]]);
    await closeSessionRedis();
    await pool.end();
    await redisClient.quit();
  });
});
