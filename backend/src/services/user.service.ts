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
  createOAuthAccountModel,
  createOAuthUserModel,
  findOAuthAccountModel,
  findUserByIdModel,
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
import pool from "../configs/db.js";
import redisClient from "../utils/redis.js";

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

  // Same generic response whether the account is missing
  // or does not currently have password login enabled.
  if (!ifUser || !ifUser.password) {
    throw new AppError("Invalid email or password", 401);
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
//google auth user interface
export interface GoogleOAuthUser {
  sub: string;
  email: string;
  email_verified?: boolean;
  given_name?: string;
  family_name?: string;
}

export async function googleOAuthService(
  googleUser: GoogleOAuthUser,
): Promise<UserRow> {
  // Only use a Google email that Google itself says is verified.
  if (!googleUser.email_verified) {
    throw new AppError("Google email is not verified", 401);
  }

  const provider = "google";

  // `sub` is Google's permanent unique ID for this Google account.
  const providerUserId = googleUser.sub;

  // Normalize emails so Yasir@gmail.com and yasir@gmail.com
  // don't accidentally behave as different accounts.
  const email = googleUser.email.trim().toLowerCase();

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // First check whether this exact Google account
    // has already been connected to an InflowAPM user.
    const oauthAccount = await findOAuthAccountModel(
      provider,
      providerUserId,
      client,
    );

    if (oauthAccount) {
      // Google account already exists, so load its real users row.
      const user = await findUserByIdModel(oauthAccount.user_id, client);

      if (!user) {
        throw new AppError("OAuth account has no valid user", 500);
      }

      await client.query("COMMIT");

      return user;
    }

    // This exact Google account has never been linked.
    // Check whether its email is already used by a normal InflowAPM account.
    const existingUser = await checkUser(email, client);

    if (existingUser) {
      // Do not silently attach Google to an existing password account.
      // Later you can build "Connect Google" while the user is authenticated.
      throw new AppError(
        "An account already exists with this email. Sign in to the existing account first.",
        409,
      );
    }

    // Completely new person.
    // Create their real InflowAPM user.
    const newUser = await createOAuthUserModel(
      email,
      googleUser.given_name?.trim() || "User",
      googleUser.family_name?.trim() || "",
      client,
    );

    // Connect Google's permanent account ID to the new users.id.
    await createOAuthAccountModel(newUser.id, provider, providerUserId, client);

    // Both inserts succeeded, so keep them.
    await client.query("COMMIT");

    return newUser;
  } catch (error) {
    // If either creation fails, undo the entire operation.
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// Creates a short-lived one-time code after Google authentication succeeds.
// The raw code goes to the frontend.
// Only the HASH is stored in Redis.
export async function createOAuthExchangeCode(userId: string): Promise<string> {
  const rawCode = crypto.randomBytes(32).toString("hex");

  const codeHash = crypto.createHash("sha256").update(rawCode).digest("hex");

  // Keep the code alive for only 2 minutes.
  // It only contains the InflowAPM user id.
  await redisClient.set(`oauth:exchange:${codeHash}`, userId, "EX", 120);

  // Return the raw value to put in the frontend redirect.
  return rawCode;
}

// Exchanges the raw code for a permanent user id
export async function exchangeOAuthCodeService(code: string): Promise<UserRow> {
  // Hash the raw code exactly the same way we did when creating it.
  const codeHash = crypto.createHash("sha256").update(code).digest("hex");

  const redisKey = `oauth:exchange:${codeHash}`;

  // GETDEL gets the value AND deletes it immediately.
  // This makes the code one-time use.
  const userId = await redisClient.getdel(redisKey);

  if (!userId) {
    throw new AppError("OAuth code is invalid or expired", 401);
  }

  // The Redis value contains the real InflowAPM user id.
  const user = await findUserByIdModel(userId);

  if (!user) {
    throw new AppError("User not found", 401);
  }

  return user;
}
