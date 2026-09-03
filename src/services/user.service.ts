import {
  checkUser,
  checkUserData,
  registerUserModel,
  UserRow,
  saveRefreshToken,
  logoutUser,
} from "../models/user.model.js";
import {
  LoginUserContract,
  RefreshTokenContract,
  RegisterUserContract,
} from "../schemas/user.schema.js";
import { AppError } from "../utils/AppError.js";
import bcrypt from "bcryptjs";

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
  return result;
}

export async function LoginUserService(
  payload: LoginUserContract,
): Promise<UserRow | null> {
  const { email, password } = payload;
  const ifUser = await checkUser(email);
  if (!ifUser) {
    throw new AppError(
      "no user found with this email address please verify it",
      401,
    );
  }
  if (ifUser.refresh_token !== null) {
    throw new AppError("user already logged in", 401);
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

//save the refresh token when user login
export async function saveRefreshTokenService(
  payLoad: RefreshTokenContract,
  userId: string,
): Promise<UserRow | null> {
  const result = await saveRefreshToken(payLoad.refresh_token, userId);
  return result;
}

//logout user controller
export async function logoutUserService(
  userId: string,
): Promise<UserRow | null> {
  const result = await logoutUser(userId);
  return result;
}
