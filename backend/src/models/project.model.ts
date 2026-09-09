import pool from "../configs/db.js";
import { QueryResult, PoolClient } from "pg";
import { hashSecret } from "../utils/hashSecret.js";

export interface ProjectRow {
  id: string;
  name: string;
  api_key: string;
  user_id: string;
  created_at: Date;
}

export interface ProjectListRow extends ProjectRow {
  total_count: string | number;
}
//creating a project
export async function createProjectModel(
  name: string,
  api_key: string,
  user_id: string,
  client?: PoolClient,
): Promise<ProjectRow | null> {
  try {
    const runner = client || pool;
    const apiKeyHash = hashSecret(api_key);
    const result: QueryResult<ProjectRow> = await runner.query(
      `insert into inflowapm.projects(name,api_key,user_id) values($1,$2,$3) returning id,name,api_key,user_id,created_at;`,
      [name, apiKeyHash, user_id],
    );
    return result.rows[0] || null;
  } catch (error: unknown) {
    console.log("Errror while adding project", error);
    throw error;
  }
}

//finding project specifically by user id
export async function searchProjectByUserIdModel(
  user_id: string,
  limit: number,
  offset: number,
  client?: PoolClient,
): Promise<ProjectListRow[]> {
  try {
    const runner = client || pool;
    const result: QueryResult<ProjectListRow> = await runner.query(
      `select id,name,api_key,user_id,created_at ,COUNT(*) OVER() AS total_count from inflowapm.projects where user_id=$1 order by created_at desc limit $2 offset $3;`,
      [user_id, limit, offset],
    );
    return result.rows;
  } catch (error: unknown) {
    console.log("cant find projects for user ", error);
    throw error;
  }
}

//deleting project using project id and user id
export async function deleteProjectModel(
  id: string,
  user_id: string,
): Promise<Array<{ id: string; api_key: string }>> {
  try {
    const result = await pool.query(
      `delete from inflowapm.projects where id=$1 and user_id=$2 returning id,api_key;`,
      [id, user_id],
    );
    return result.rows;
  } catch (error: unknown) {
    console.error("error while deleting project", error);
    throw error;
  }
}

export interface SearchProjectbyProjectId {
  id: string;
  name: string;
  user_id: string;
  created_at: Date;
}

//search project by project id
export async function searchProjectByProjectIdModel(
  project_id: string,
): Promise<SearchProjectbyProjectId | null> {
  try {
    const result = await pool.query(
      ` SELECT id, name, user_id, created_at
        FROM inflowapm.projects
        WHERE id = $1;
      `,
      [project_id],
    );

    return result.rows[0] ?? null;
  } catch (error: unknown) {
    console.error("error while searching for project using project id", error);
    throw error;
  }
}

export interface ValidateProject {
  id: string;
  user_id: string;
}

//this will be used by telemetry ingestion middleware to verify that incoming client data streams carry a valid SaaS token before letting them write to your disk.
export async function validateProjectApiKeyModel(
  api_key: string,
): Promise<ValidateProject | null> {
  try {
    const apiKeyHash = hashSecret(api_key);
    const result: QueryResult<ValidateProject & { api_key: string }> =
      await pool.query(
        `select id,user_id,api_key from inflowapm.projects
         where api_key=$1 or api_key=$2;`,
        [apiKeyHash, api_key],
      );
    const project = result.rows[0];

    if (!project) {
      return null;
    }

    // Transparently upgrade an API key stored before hashing was enabled.
    if (project.api_key === api_key) {
      await pool.query(`update inflowapm.projects set api_key=$1 where id=$2;`, [
        apiKeyHash,
        project.id,
      ]);
    }

    return {
      id: project.id,
      user_id: project.user_id,
    };
  } catch (error: unknown) {
    console.error("error while validating client data stream");
    throw error;
  }
}
