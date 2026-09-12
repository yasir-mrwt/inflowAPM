import pool from "../configs/db.js";
import { PoolClient, QueryResult } from "pg";
import { hashSecret } from "../utils/hashSecret.js";

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
    const refreshTokenHash = hashSecret(refresh_token);
    const result: QueryResult<UserRow> = await pool.query(
      `update inflowapm.users set refresh_token=$1 where id=$2 returning id,email,first_name,last_name,role,refresh_token,created_at;`,
      [refreshTokenHash, userId],
    );
    return result.rows[0] || null;
  } catch (error: unknown) {
    console.log("Error while updating user refresh token ", error);
    throw error;
  }
}
//logout interface
export interface LogoutUserRow {
  id: string;
  email: string;
}

//logout user model
export async function logoutUser(userId: string): Promise<UserRow | null> {
  try {
    const result: QueryResult<UserRow> = await pool.query(
      `UPDATE inflowapm.users SET refresh_token = NULL WHERE id = $1 returning id,email,first_name,last_name,role,refresh_token,created_at;
`,
      [userId],
    );
    return result.rows[0] || null;
  } catch (error: unknown) {
    console.log("error while logging out user", error);
    throw error;
  }
}

//verifing user refresh token and then assigning new access token
export async function refreshTokenVerification(
  refresh_token: string,
): Promise<UserRow | null> {
  try {
    const refreshTokenHash = hashSecret(refresh_token);
    const result: QueryResult<UserRow> = await pool.query(
      `select id,email,first_name,last_name,role,refresh_token,created_at
       from inflowapm.users
       where refresh_token=$1 or refresh_token=$2;`,
      [refreshTokenHash, refresh_token],
    );
    const user = result.rows[0] || null;

    // Transparently upgrade a refresh token stored before hashing was enabled.
    if (user?.refresh_token === refresh_token) {
      await pool.query(
        `update inflowapm.users set refresh_token=$1 where id=$2;`,
        [refreshTokenHash, user.id],
      );
      user.refresh_token = refreshTokenHash;
    }

    return user;
  } catch (error: unknown) {
    console.log("error while finding user with given refresh token");
    throw error;
  }
}

//interface for forgot password
export interface ForgotPasswordRow {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  used_at: Date;
}

//model for forgot password functionality
export async function forgotPasswordModel(
  user_id: string,
  token_hash: string,
  expires_at: Date,
  client?: PoolClient,
): Promise<ForgotPasswordRow> {
  try {
    const runner = client || pool;
    const result: QueryResult<ForgotPasswordRow> = await runner.query(
      `insert into inflowapm.reset_password_tokens  (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)
     RETURNING id, user_id, token_hash, expires_at, used_at, created_at;`,
      [user_id, token_hash, expires_at],
    );
    return result.rows[0];
  } catch (error: unknown) {
    console.log("error while inserting into reset password token row");
    throw error;
  }
}
//check token if it exists in db or not
export async function verifyHashTokenModel(
  tokenHash: string,
  client: PoolClient,
): Promise<ForgotPasswordRow | null> {
  try {
    const result: QueryResult<ForgotPasswordRow> = await client.query(
      `
  select
    id,
    user_id,
    token_hash,
    expires_at,
    used_at
  from inflowapm.reset_password_tokens
  where token_hash = $1
    and used_at IS null
    and expires_at > now()
  for update;
  `,
      [tokenHash],
    );
    return result.rows[0] || null;
  } catch (error: unknown) {
    console.log("error while verifying hash token");
    throw error;
  }
}

//model for reseting password
export async function resetPasswordModel(
  hashedPassword: string,
  user_id: string,
  client: PoolClient,
): Promise<UserRow | null> {
  try {
    const result: QueryResult<UserRow> = await client.query(
      `
  update inflowapm.users
  set
    password = $1,
    refresh_token = NULL
  where id = $2
  returning id, email, first_name, last_name, role, created_at;  `,
      [hashedPassword, user_id],
    );
    return result.rows[0] || null;
  } catch (error: unknown) {
    console.log("error while saving new password and reseting refresh token");
    throw error;
  }
}

//set the reset token as used
export async function resetTokenAsUsedModel(
  id: string,
  client: PoolClient,
): Promise<void> {
  try {
    const result = await client.query(
      `
      update inflowapm.reset_password_tokens
set used_at = now()
where id = $1;`,
      [id],
    );
  } catch (error: unknown) {
    console.log("error while reseting the used token");
    throw error;
  }
}
