import pool from "../configs/db.js";
import { QueryResult, PoolClient, Pool } from "pg";

export interface ProjectRow {
  id: string;
  name: string;
  api_key: string;
  user_id: string;
  created_at: Date;
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
    const result: QueryResult<ProjectRow> = await runner.query(
      `insert into inflowapm.projects(name,api_key,user_id) values($1,$2,$3) returning id,name,api_key,user_id,created_at;`,
      [name, api_key, user_id],
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
): Promise<ProjectRow[]> {
  try {
    const runner = client || pool;
    const result: QueryResult<ProjectRow> = await runner.query(
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
): Promise<any[]> {
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

export interface ValidateProject {
  id: string;
  user_id: string;
}

//this will be used by telemetry ingestion middleware to verify that incoming client data streams carry a valid SaaS token before letting them write to your disk.
export async function validateProjectApiKeyModel(
  api_key: string,
): Promise<ValidateProject> {
  try {
    const result: QueryResult<ValidateProject> = await pool.query(
      `select id,user_id from inflowapm.projects where api_key=$1;`,
      [api_key],
    );
    return result.rows[0] || null;
  } catch (error: unknown) {
    console.error("error while validating client data stream");
    throw error;
  }
}
