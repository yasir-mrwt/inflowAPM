import pool from "../configs/db.js";
import { QueryResult } from "pg";

//data to be returned by the model
export interface UserRow {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  refresh_token: string | null;
  created_at: Date;
}

//register user model
export async function registerUserModel(
  email: string,
  password: string,
  first_name: string,
  last_name: string,
): Promise<UserRow | null> {
  try {
    const result: QueryResult<UserRow> = await pool.query(
      `insert into inflowapm.users(email,password,first_name,last_name) values($1,$2,$3,$4) returning id, email,first_name,last_name, role,refresh_token, created_at;`,
      [email, password, first_name, last_name],
    );
    return result.rows[0] || null;
  } catch (error: unknown) {
    console.error("error while registering user", error);
    throw error;
  }
}

export interface checkUserData extends UserRow {
  password: string;
}

//check if the user is present or not would also be used for login
export async function checkUser(email: string): Promise<checkUserData | null> {
  try {
    const result: QueryResult<checkUserData> = await pool.query(
      `select id,email,first_name,last_name,role,refresh_token,password,created_at from inflowapm.users where email=$1;`,
      [email],
    );
    return result.rows[0] || null;
  } catch (error: unknown) {
    console.error("error while checking user", error);
    throw error;
  }
}

//save refresh token when ever the user logins

export async function saveRefreshToken(
  refresh_token: string,
  userId: string,
): Promise<UserRow | null> {
  try {
    const result: QueryResult<UserRow> = await pool.query(
      `update inflowapm.users set refresh_token=$1 where id=$2 returning id,email,first_name,last_name,role,refresh_token,created_at;`,
      [refresh_token, userId],
    );
    return result.rows[0] || null;
  } catch (error: unknown) {
    console.log("Error while updating user refresh token ", error);
    throw error;
  }
}
