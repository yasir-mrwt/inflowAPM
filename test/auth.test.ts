import assert from "node:assert";
import { before, after, test } from "node:test";
import app from "../src/app";
import supertest from "supertest";
import pool from "../src/configs/db";
import redisClient from "../src/utils/redis";

const user = {
  email: `firstUser-${Date.now()}@gmail.com`,
  password: `${Date.now()}ABC`,
  first_name: "broski",
  last_name: "codes",
};
let accessToken;
let refreshToken;

before(async () => {
  //this is happy path test should always pass
  await supertest(app).post("/api/v1/auth/register").send(user).expect(201);
});

//the edge case to fail the test
test("/api/v1/auth/register -should fail the test", async () => {
  const response = await supertest(app).post("/api/v1/auth/register").send({
    email: "notValid",
    password: "1234ty",
  });

  assert.strictEqual(response.statusCode, 400);
  assert.strictEqual(response.body.success, false);
});

//duplicated user email error
test("/api/v1/auth/register -should fail the test", async () => {
  const response = await supertest(app)
    .post("/api/v1/auth/register")
    .send(user);

  assert.strictEqual(response.statusCode, 409);
  assert.strictEqual(response.body.success, false);
});

//testing login user functionality happy path
test("/api/v1/auth/login -should pass the login test happy path ", async () => {
  const response = await supertest(app).post("/api/v1/auth/login").send(user);
  refreshToken = response.body.data.refresh_token;
  accessToken = response.body.data.access_token;
  assert.strictEqual(response.statusCode, 200);
  assert.strictEqual(response.body.success, true);
});

//testing login edge case
test("/api/v1/auth/login -should fail the test edge case ", async () => {
  const response = await supertest(app).post("/api/v1/auth/login").send({
    email: "noemail",
    password: "edfvdf",
  });
  assert.strictEqual(response.statusCode, 400);
  assert.strictEqual(response.body.success, false);
});

after(async () => {
  console.log("ending server connections");
  try {
    await pool.query(`delete from inflowapm.users where email=$1;`, [
      user.email,
    ]);
    await pool.end();
    await redisClient.quit();
  } catch (err) {
    console.error("Error during test cleanup:", err);
  }
});
