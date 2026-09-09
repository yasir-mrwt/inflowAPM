import assert from "assert";
import supertest from "supertest";
import app from "../src/app.js";
import pool from "../src/configs/db.js";
import { before, after, test } from "node:test";
import redisClient from "../src/utils/redis.js";
import jwt from "jsonwebtoken";
import { config } from "../src/configs/env.js";
import { initializedDB } from "../src/configs/initDB.js";

const testUser = {
  email: `testUser-${Date.now()}@gmail.com`,
  password: `${Date.now()}YYY`,
  first_name: "broski",
  last_name: "codes",
};
const newTestUser = {
  email: `newTestUser-${Date.now()}@gmail.com`,
  password: `${Date.now()}YYY`,
  first_name: "froski",
  last_name: "codes",
};
let accessToken: string;
let refreshToken: string;
let projectName: string = `Project-${Date.now()}`;
let invalidProjectName: string = "ab";
let projectId: string;
let newAccessToken: string;

before(async () => {
  await initializedDB();
  await supertest(app).post("/api/v1/auth/register").send(testUser).expect(201);
  const result = await supertest(app)
    .post("/api/v1/auth/register")
    .send(newTestUser)
    .expect(201);

  const response = await supertest(app)
    .post("/api/v1/auth/login")
    .send(testUser);
  accessToken = response.body.data.access_token;
  refreshToken = response.body.data.refresh_token;

  const newResponse = await supertest(app)
    .post("/api/v1/auth/login")
    .send(newTestUser);

  newAccessToken = jwt.sign(
    {
      id: newResponse.body.data.userData.id,
      email: newResponse.body.data.userData.email,
    },
    config.access_token,
    { expiresIn: "1ms" },
  );
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

  const storedProject = await pool.query(
    `SELECT api_key FROM inflowapm.projects WHERE id=$1;`,
    [projectId],
  );
  assert.notStrictEqual(storedProject.rows[0].api_key, response.body.data.api_key);
  assert.strictEqual(storedProject.rows[0].api_key.length, 64);
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

//get project successfully using page and limit
test("/api/v1/projects?page=1&limit=10 -get projects successfully using page and limit", async () => {
  const response = await supertest(app)
    .get("/api/v1/projects?page=1&limit=10")
    .set("Authorization", `Bearer ${accessToken}`);
  assert.strictEqual(response.status, 200);
  assert.strictEqual(response.body.success, true);
  assert.strictEqual(Array.isArray(response.body.data), true);
  assert.strictEqual("api_key" in response.body.data[0], false);
  assert.strictEqual("total_count" in response.body.data[0], false);
});

test("/api/v1/projects - rejects unsafe pagination values", async () => {
  const invalidQueries = [
    "page=0&limit=10",
    "page=-1&limit=10",
    "page=1&limit=0",
    "page=1&limit=101",
  ];

  for (const query of invalidQueries) {
    const response = await supertest(app)
      .get(`/api/v1/projects?${query}`)
      .set("Authorization", `Bearer ${accessToken}`);

    assert.strictEqual(response.status, 400);
    assert.strictEqual(response.body.success, false);
  }
});

//get all project successfully using all post =true
test("/api/v1/projects?all=true  -get all projects successfully fetchAll=true", async () => {
  const response = await supertest(app)
    .get("/api/v1/projects?all=true")
    .set("Authorization", `Bearer ${accessToken}`);
  assert.strictEqual(response.status, 200);
  assert.strictEqual(response.body.success, true);
});

//fail getting projects using invalid token
test("/api/v1/projects?page=1&limit=10 -fail getting projects using invalid token", async () => {
  const response = await supertest(app)
    .get("/api/v1/projects?page=invalid&limit=10")
    .set("Authorization", `Bearer ${newAccessToken}`);
  assert.strictEqual(response.status, 401);
  assert.strictEqual(response.body.success, false);
});

//to delete a project successfully
test("/api/v1/projects/:id - user can delete a project successfully", async () => {
  const response = await supertest(app)
    .delete(`/api/v1/projects/${projectId}`)
    .set("Authorization", `Bearer ${accessToken}`);

  assert.strictEqual(response.status, 200);
  assert.strictEqual(response.body.success, true);
  assert.deepStrictEqual(response.body.data, { id: projectId });
});

//trying to delete a project with invalid access token
test("/api/v1/projects/:id - user cannot delete a project with invalid access Token", async () => {
  const response = await supertest(app)
    .delete(`/api/v1/projects/${projectId}`)
    .set("Authorization", `Bearer ${newAccessToken}`);

  assert.strictEqual(response.status, 401);
  assert.strictEqual(response.body.success, false);
});

after(async () => {
  await pool.query(`delete from inflowapm.users where email=any($1::text[]);`, [
    [testUser.email, newTestUser.email],
  ]);
  await pool.end();
  await redisClient.quit();
});
