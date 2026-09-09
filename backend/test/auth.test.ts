import assert from "node:assert";
import { before, after, test, describe } from "node:test";
import app from "../src/app.js";
import supertest from "supertest";
import pool from "../src/configs/db.js";
import redisClient from "../src/utils/redis.js";
import jwt from "jsonwebtoken";
import { config } from "../src/configs/env.js";
import { emailQueue } from "../src/queues/email.queue.js";
import { emailWorker } from "../src/workers/email.worker.js";

// Primary test user used for authentication and logout verification.
const firstUser = {
  email: `firstUser-${Date.now()}@gmail.com`,
  password: `${Date.now()}ABC`,
  first_name: "broski",
  last_name: "codes",
};

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

describe("Authentication Flow", { concurrency: false }, () => {
  // Prepare an authenticated user before executing the test suite.
  before(async () => {
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
  });

  // Verify that a valid user can register successfully.
  test("POST /api/v1/auth/register - registers a valid user successfully", async () => {
    const response = await supertest(app)
      .post("/api/v1/auth/register")
      .send(secondUser);
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
    assert.strictEqual("refreshToken" in response.body.data.userData, false);

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

  // Remove test data and close database and Redis connections.
  after(async () => {
    console.log("Ending server connections");

    try {
      await pool.query(
        `delete from inflowapm.users where email = any($1::text[]);`,
        [[firstUser.email, secondUser.email]],
      );
      await emailWorker.close();
      await emailQueue.close();

      await pool.end();
      await redisClient.quit();
    } catch (err) {
      console.error("Error during test cleanup:", err);
    }
  });
});
