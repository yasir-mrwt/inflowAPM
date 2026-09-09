import assert from "node:assert";
import { before, after, test, describe } from "node:test";
import app from "../src/app.js";
import supertest from "supertest";
import pool from "../src/configs/db.js";
import redisClient from "../src/utils/redis.js";
import jwt from "jsonwebtoken";
import { config } from "../src/configs/env.js";
import { initializedDB } from "../src/configs/initDB.js";

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
