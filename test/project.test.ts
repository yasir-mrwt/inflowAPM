import assert from "assert";
import supertest from "supertest";
import app from "../src/app.js";
import pool from "../src/configs/db.js";
import { before, after, test } from "node:test";
import redisClient from "../src/utils/redis.js";

const testUser = {
  email: `testUser-${Date.now()}@gmail.com`,
  password: `${Date.now()}YYY`,
  first_name: "broski",
  last_name: "codes",
};
let accessToken: string;
let refreshToken: string;
let projectName: string = `Project-${Date.now()}`;
let invalidProjectName: string = "ab";
let projectId: string;

before(async () => {
  await supertest(app).post("/api/v1/auth/register").send(testUser).expect(201);

  const response = await supertest(app)
    .post("/api/v1/auth/login")
    .send(testUser);
  accessToken = response.body.data.access_token;
  refreshToken = response.body.data.refresh_token;
});

// Verify that a valid user can create post successfully.
test("/api/v1/projects -Verify that a valid user can create post successfully", async () => {
  const response = await supertest(app)
    .post("/api/v1/projects")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      name: projectName,
    });
  projectId = response.body.data.id;
  assert.strictEqual(response.status, 201);
  assert.strictEqual(response.body.success, true);
  assert.strictEqual("password" in response.body.data, false);
  assert.strictEqual("refreshToken" in response.body.data, false);
});

// Verify that a valid user cannot create post successfully with invalid inputs -zod error.
test("/api/v1/projects - user cannot create post with invalid inputs -zod error", async () => {
  const response = await supertest(app)
    .post("/api/v1/projects")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      name: invalidProjectName,
    });
  assert.strictEqual(response.status, 400);
  assert.strictEqual(response.body.success, false);
});

//to delete a project successfully
test("/api/v1/projects/:id - user can delete a project successfully", async () => {
  const response = await supertest(app)
    .delete(`/api/v1/projects/${projectId}`)
    .set("Authorization", `Bearer ${accessToken}`);

  assert.strictEqual(response.status, 200);
  assert.strictEqual(response.body.success, true);
});

after(async () => {
  await pool.query(`delete from inflowapm.users where email=$1;`, [
    testUser.email,
  ]);
  await pool.end();
  await redisClient.quit();
});
