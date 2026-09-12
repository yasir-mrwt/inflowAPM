import assert from "node:assert";
import { before, after, test, describe } from "node:test";
import app from "../src/app.js";
import supertest from "supertest";
import pool from "../src/configs/db.js";
import redisClient from "../src/utils/redis.js";
import jwt from "jsonwebtoken";
import { config } from "../src/configs/env.js";
import { initializedDB } from "../src/configs/initDB.js";
import crypto from "node:crypto";

// Primary test user used for authentication and logout verification.
const firstUser = {
  email: `firstUser-${Date.now()}@gmail.com`,
  password: `${Date.now()}ABC`,
  first_name: "broski",
  last_name: "codes",
};
let firstUserId: string = "";

// Secondary test user used for independent registration and login verification.
const secondUser = {
  email: `secondUser-${Date.now()}@gmail.com`,
  password: `${Date.now()}ABC`,
  first_name: "frosti",
  last_name: "codes",
};

// Authentication tokens shared across the authentication test suite.
let accessToken: string = "";
let refreshToken: string = "";
let newToken: string = "";
let verificationToken: string = "test-reset-token-123";
let newPassword: string = "broskiCodesShit";

describe("Authentication Flow", { concurrency: false }, () => {
  // Prepare an authenticated user before executing the test suite.
  before(async () => {
    await initializedDB();
    const databaseResult = await pool.query(
      "SELECT current_database() AS database_name;",
    );
    assert.strictEqual(databaseResult.rows[0].database_name, "inflowapm_test");

    await supertest(app)
      .post("/api/v1/auth/register")
      .send(firstUser)
      .expect(201);

    const loginResponse = await supertest(app)
      .post("/api/v1/auth/login")
      .send(firstUser)
      .expect(200);

    refreshToken = loginResponse.body.data.refresh_token;
    accessToken = loginResponse.body.data.access_token;
    firstUserId = loginResponse.body.data.userData.id;

    const storedTokenResult = await pool.query(
      `SELECT refresh_token FROM inflowapm.users WHERE email=$1;`,
      [firstUser.email],
    );
    assert.notStrictEqual(
      storedTokenResult.rows[0].refresh_token,
      refreshToken,
    );
    assert.strictEqual(storedTokenResult.rows[0].refresh_token.length, 64);
  });

  // Verify that a valid user can register successfully.
  test("POST /api/v1/auth/register - registers a valid user successfully", async () => {
    const response = await supertest(app)
      .post("/api/v1/auth/register")
      .send(secondUser);
    assert.strictEqual(response.statusCode, 201);
    assert.strictEqual(response.body.success, true);
  });

  // Verify that invalid registration data is rejected.
  test("POST /api/v1/auth/register - rejects invalid registration data", async () => {
    const response = await supertest(app).post("/api/v1/auth/register").send({
      email: "notValid",
      password: "1234ty",
    });

    assert.strictEqual(response.statusCode, 400);
    assert.strictEqual(response.body.success, false);
  });

  // Verify that registering an existing email returns a conflict error.
  test("POST /api/v1/auth/register - rejects duplicate email registration", async () => {
    const response = await supertest(app)
      .post("/api/v1/auth/register")
      .send(firstUser);

    assert.strictEqual(response.statusCode, 409);
    assert.strictEqual(response.body.success, false);
  });

  // Verify that a registered user can log in successfully.
  test("POST /api/v1/auth/login - authenticates a valid user successfully", async () => {
    const response = await supertest(app)
      .post("/api/v1/auth/login")
      .send(secondUser);

    assert.strictEqual(response.statusCode, 200);
    assert.strictEqual(response.body.success, true);
    assert.strictEqual("password" in response.body.data.userData, false);
    assert.strictEqual("refresh_token" in response.body.data.userData, false);

    const decoded = jwt.verify(
      response.body.data.access_token,
      config.access_token,
    );

    assert.ok(decoded);

    const userInfo = response.body.data.userData;
    newToken = jwt.sign(
      { id: userInfo.id, email: userInfo.email },
      config.access_token,
      { expiresIn: "1ms" },
    );
  });

  test("POST /api/v1/auth/login - permits repeated login and replaces the refresh token", async () => {
    const response = await supertest(app)
      .post("/api/v1/auth/login")
      .send(secondUser);

    assert.strictEqual(response.statusCode, 200);
    assert.strictEqual(response.body.success, true);
    assert.strictEqual(typeof response.body.data.refresh_token, "string");
  });

  // Verify that malformed login credentials fail validation.
  test("POST /api/v1/auth/login - rejects invalid login credentials", async () => {
    const response = await supertest(app).post("/api/v1/auth/login").send({
      email: "noemail",
      password: "edfvdf",
    });

    assert.strictEqual(response.statusCode, 400);
    assert.strictEqual(response.body.success, false);
  });

  // Verify refresh token and create a new access Token successfully.
  test("POST /api/v1/auth/refresh - Verify refresh token and create a new access Token successfully", async () => {
    const response = await supertest(app)
      .post("/api/v1/auth/refresh")
      .send({ refresh_token: refreshToken });

    assert.strictEqual(response.statusCode, 200);
    assert.strictEqual(response.body.success, true);
  });

  // Verify invalid refresh token and reject user identity.
  test("POST /api/v1/auth/refresh - Verify invalid refresh token and reject user identity", async () => {
    const response = await supertest(app)
      .post("/api/v1/auth/refresh")
      .send({ refresh_token: newToken });

    assert.strictEqual(response.statusCode, 401);
    assert.strictEqual(response.body.success, false);
  });

  // Verify that an authenticated user can log out successfully.
  test("POST /api/v1/auth/logout - logs out an authenticated user successfully", async () => {
    const response = await supertest(app)
      .post("/api/v1/auth/logout")
      .set("Authorization", `Bearer ${accessToken}`);

    assert.strictEqual(response.statusCode, 200);
    assert.strictEqual(response.body.success, true);
  });

  // Verify that an unauthenticated user cannot log out.
  test("POST /api/v1/auth/logout - no log out an unauthenticated user ", async () => {
    const response = await supertest(app)
      .post("/api/v1/auth/logout")
      .set("Authorization", `Bearer ${newToken}`);

    assert.strictEqual(response.statusCode, 401);
    assert.strictEqual(response.body.success, false);
  });

  //verifying forgot password using a valid user
  test("POST /api/v1/auth/forgot-password -forgot password functionality check with valid user", async () => {
    const response = await supertest(app)
      .post("/api/v1/auth/forgot-password")
      .send({ email: firstUser.email });

    assert.strictEqual(response.statusCode, 200);
    assert.strictEqual(response.body.success, true);
  });

  //verifying that an unknown email still gets success msg for security porpose
  test("POST /api/v1/auth/forgot-password - hides whether email exists", async () => {
    const response = await supertest(app)
      .post("/api/v1/auth/forgot-password")
      .send({
        email: `does-not-exist-${Date.now()}@gmail.com`,
      });

    assert.strictEqual(response.statusCode, 200);
    assert.strictEqual(response.body.success, true);
  });

  //verifying reset password using a valid user
  test("POST /api/v1/auth/reset-password - resets password and revokes refresh token", async () => {
    // Give this user an active refresh token first.
    await supertest(app)
      .post("/api/v1/auth/login")
      .send({
        email: firstUser.email,
        password: firstUser.password,
      })
      .expect(200);

    const beforeReset = await pool.query(
      `SELECT refresh_token
     FROM inflowapm.users
     WHERE id = $1`,
      [firstUserId],
    );

    assert.ok(beforeReset.rows[0].refresh_token);

    const rawToken = `valid-reset-${Date.now()}`;

    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    await pool.query(
      `INSERT INTO inflowapm.reset_password_tokens
      (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
      [firstUserId, tokenHash, new Date(Date.now() + 15 * 60 * 1000)],
    );

    const response = await supertest(app)
      .post("/api/v1/auth/reset-password")
      .send({
        token: rawToken,
        password: newPassword,
      });

    assert.strictEqual(response.statusCode, 200);
    assert.strictEqual(response.body.success, true);

    const afterReset = await pool.query(
      `SELECT refresh_token
     FROM inflowapm.users
     WHERE id = $1`,
      [firstUserId],
    );

    assert.strictEqual(afterReset.rows[0].refresh_token, null);
  });

  // Verifying that user can login with new password.
  test("POST /api/v1/auth/login -  Verifying that user can login with new password", async () => {
    const response = await supertest(app)
      .post("/api/v1/auth/login")
      .send({ email: firstUser.email, password: newPassword });

    assert.strictEqual(response.statusCode, 200);
    assert.strictEqual(response.body.success, true);
    assert.strictEqual("password" in response.body.data.userData, false);
    assert.strictEqual("refresh_token" in response.body.data.userData, false);
  });

  // Verifying again that user dont login with old password.
  test("POST /api/v1/auth/login - Verifying again that user dont login with old password", async () => {
    const response = await supertest(app)
      .post("/api/v1/auth/login")
      .send({ email: firstUser.email, password: firstUser.password });

    assert.strictEqual(response.statusCode, 401);
    assert.strictEqual(response.body.success, false);
  });

  //verifying same token cannot be reused
  test("POST /api/v1/auth/reset-password - rejects reused reset token", async () => {
    const response = await supertest(app)
      .post("/api/v1/auth/reset-password")
      .send({
        token: verificationToken,
        password: "AnotherPassword123",
      });

    assert.strictEqual(response.statusCode, 400);
    assert.strictEqual(response.body.success, false);
  });

  //verifying fake/invalid token rejection
  test("POST /api/v1/auth/reset-password - rejects expired reset token", async () => {
    const rawToken = `expired-token-${Date.now()}`;

    const hash = crypto.createHash("sha256").update(rawToken).digest("hex");

    await pool.query(
      `INSERT INTO inflowapm.reset_password_tokens
      (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
      [firstUserId, hash, new Date(Date.now() - 60 * 1000)],
    );

    const response = await supertest(app)
      .post("/api/v1/auth/reset-password")
      .send({
        token: rawToken,
        password: "SomeNewPassword123",
      });

    assert.strictEqual(response.statusCode, 400);
    assert.strictEqual(response.body.success, false);
  });

  //testing invalid old token
  test("POST /api/v1/auth/forgot-password - invalidates previous unused reset tokens", async () => {
    const oldRawToken = `old-token-${Date.now()}`;

    const oldHash = crypto
      .createHash("sha256")
      .update(oldRawToken)
      .digest("hex");

    const oldToken = await pool.query(
      `INSERT INTO inflowapm.reset_password_tokens
      (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)
     RETURNING id`,
      [firstUserId, oldHash, new Date(Date.now() + 15 * 60 * 1000)],
    );

    const response = await supertest(app)
      .post("/api/v1/auth/forgot-password")
      .send({
        email: firstUser.email,
      });

    assert.strictEqual(response.statusCode, 200);

    const storedOldToken = await pool.query(
      `SELECT used_at
     FROM inflowapm.reset_password_tokens
     WHERE id = $1`,
      [oldToken.rows[0].id],
    );

    assert.notStrictEqual(storedOldToken.rows[0].used_at, null);
  });

  //verify missing token
  test("POST /api/v1/auth/reset-password - rejects missing token", async () => {
    const response = await supertest(app)
      .post("/api/v1/auth/reset-password")
      .send({
        password: "SomePassword123",
      });

    assert.strictEqual(response.statusCode, 400);
    assert.strictEqual(response.body.success, false);
  });

  //verify missing password
  test("POST /api/v1/auth/reset-password - rejects missing password", async () => {
    const response = await supertest(app)
      .post("/api/v1/auth/reset-password")
      .send({
        token: "some-token",
      });

    assert.strictEqual(response.statusCode, 400);
    assert.strictEqual(response.body.success, false);
  });

  // Remove test data and close database and Redis connections.
  after(async () => {
    console.log("Ending server connections");

    try {
      await pool.query(
        `DELETE FROM inflowapm.users WHERE email = ANY($1::text[]);`,
        [[firstUser.email, secondUser.email]],
      );

      await pool.end();
      await redisClient.quit();

      console.log("Auth cleanup completed");
    } catch (err) {
      console.error("Error during test cleanup:", err);
    }
  });
});
