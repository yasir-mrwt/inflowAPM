import {
  checkUser,
  checkUserData,
  registerUserModel,
  UserRow,
  logoutUser,
  refreshTokenVerification,
  forgotPasswordModel,
  verifyHashTokenModel,
  resetPasswordModel,
  resetTokenAsUsedModel,
} from "../models/user.model.js";
import {
  LoginUserContract,
  RegisterUserContract,
} from "../schemas/user.schema.js";
import { AppError } from "../utils/AppError.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "../configs/env.js";
import crypto from "node:crypto";
import { PoolClient } from "pg";
import pool from "../configs/db.js";

//register user service function
export async function registerUserService(
  payload: RegisterUserContract,
): Promise<UserRow | null> {
  const ifUser = await checkUser(payload.email);
  if (ifUser) {
    throw new AppError("user with this email already exits", 409);
  }

  const hashedPassword = await bcrypt.hash(payload.password, 10);
  const result = await registerUserModel(
    payload.email,
    hashedPassword,
    payload.first_name,
    payload.last_name,
  );

  //would avoid sending emails during test -check if its in testing or not
  if (config.mail_enabled) {
    try {
      const { emailQueue } = await import("../queues/email.queue.js");

      await emailQueue.add("welcome-email", {
        type: "welcome",
        email: payload.email,
        first_name: payload.first_name,
      });
    } catch (error) {
      console.error("Failed to enqueue welcome email:", error);
    }
  }
  return result;
}

//login user service function
export async function LoginUserService(
  payload: LoginUserContract,
): Promise<checkUserData> {
  const { email, password } = payload;
  const ifUser = await checkUser(email);
  if (!ifUser) {
    throw new AppError(
      "no user found with this email address please verify it",
      401,
    );
  }
  const comparePassword = await bcrypt.compare(password, ifUser.password);
  if (!comparePassword) {
    throw new AppError(
      "wrong password entered ensure your password is correct",
      401,
    );
  }

  return ifUser;
}

//logout user service function
export async function logoutUserService(
  userId: string,
): Promise<UserRow | null> {
  const result = await logoutUser(userId);
  return result;
}

//verifying refresh token to generate new access token on its basis
export async function refreshTokenSearchService(
  refresh_token: string,
): Promise<UserRow | null> {
  const decoded = jwt.verify(refresh_token, config.refresh_token) as {
    id: string;
    email: string;
  };
  const result = await refreshTokenVerification(refresh_token);
  if (!result || result.refresh_token === null) {
    throw new AppError("no refresh token found ", 400);
  }
  if (result.id !== decoded.id) {
    throw new AppError("unauthenticated user/invalid refresh token", 400);
  }
  return result;
}

//service for forgot password functiona
export async function forgotPasswordService(email: string): Promise<void> {
  //check user if exists or not
  const ifUser = await checkUser(email);
  if (!ifUser) {
    return;
  }
  //create raw token for security
  const rawToken: string = crypto.randomBytes(32).toString("hex");
  const tokenHash: string = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");
  const expiresIn: Date = new Date(Date.now() + 15 * 60 * 1000); //expires after 15 mins
  //send token along with query in url
  const resetURL = new URL("/reset-password", config.frontend_url);
  resetURL.searchParams.set("token", rawToken);
  const resetLinkString: string = resetURL.toString();
  const client = await pool.connect();

  //transaction is needed because a user can only have one reset token at a time
  try {
    await client.query("BEGIN");

    //delete old tokens used at
    await client.query(
      `UPDATE inflowapm.reset_password_tokens
     SET used_at = NOW()
     WHERE user_id = $1
     AND used_at IS NULL`,
      [ifUser.id],
    );

    //add new tokens
    await forgotPasswordModel(ifUser.id, tokenHash, expiresIn, client);

    //if successfull then commit it
    await client.query("COMMIT");
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  //once the transaction is done then send the mail
  if (config.mail_enabled) {
    try {
      const { emailQueue } = await import("../queues/email.queue.js");

      await emailQueue.add("reset-password", {
        type: "reset_password",
        email,
        reset_link: resetLinkString,
      });
    } catch (error: unknown) {
      console.error("Failed to enqueue reset password email:", error);
    }
  }
}

//reset password service functionality
export async function resetPasswordService(
  token: string,
  password: string,
): Promise<void> {
  try {
    const hashToken: string = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const newHashedPassword = await bcrypt.hash(password, 10);
    const client = await pool.connect();
    try {
      await client.query("begin");

      //check if the hash token is in db or not
      const checkToken = await verifyHashTokenModel(hashToken, client);
      if (!checkToken) {
        throw new AppError("Reset token is invalid or expired", 400);
      }

      //if yes gets its user id
      const user_id = checkToken.user_id;

      //set new password and revoke the refresh token
      await resetPasswordModel(newHashedPassword, user_id, client);

      //set the token as used
      await resetTokenAsUsedModel(checkToken.id, client);

      await client.query("COMMIT");
    } catch (error: unknown) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error: unknown) {
    console.log("error while reseting password");
    throw error;
  }
}
