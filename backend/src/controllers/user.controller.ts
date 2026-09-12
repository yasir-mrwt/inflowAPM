import { Request, Response, NextFunction } from "express";
import {
  forgotPasswordService,
  LoginUserService,
  logoutUserService,
  refreshTokenSearchService,
  registerUserService,
  resetPasswordService,
} from "../services/user.service.js";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../services/auth.service.js";
import { catchAsync } from "../utils/catchAsync.js";
import { AppError } from "../utils/AppError.js";
import { saveRefreshToken } from "../models/user.model.js";
import { success } from "zod";

//register user controller
export const registerUserController = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { email, password, first_name, last_name } = req.body;
    const result = await registerUserService({
      email,
      first_name,
      last_name,
      password,
    });
    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: result,
    });
  },
);

//login user controller
export const loginUserController = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { email, password } = req.body;
    const result = await LoginUserService({ email, password });
    const {
      password: _password,
      refresh_token: _storedToken,
      ...userData
    } = result;
    const accesToken = await generateAccessToken(result.id, result.email);
    const refreshToken = await generateRefreshToken(result.id);
    await saveRefreshToken(refreshToken, result.id);
    res.status(200).json({
      success: true,
      message: "refresh token generated successfully",
      data: {
        refresh_token: refreshToken,
        access_token: accesToken,
        userData,
      },
    });
  },
);

//logout user controller
export const logoutUserController = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      return next(new AppError("user not authenticated", 401));
    }
    const result = await logoutUserService(req.user.id);
    if (!result) {
      return next(new AppError("error while logging out user", 500));
    }
    res.status(200).json({
      success: true,
      message: `user: ${req.user.email} logged out successfully`,
    });
  },
);

//creating new token for user based on refresh token search
export const newAccessTokenController = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { refresh_token } = req.body;
    const result = await refreshTokenSearchService(refresh_token);
    if (!result) {
      return next(new AppError("error while creating new access Token ", 500));
    }
    const newToken = await generateAccessToken(result.id, result.email);
    res.status(200).json({
      success: true,
      message: `new access token created successfully`,
      new_access_token: newToken,
    });
  },
);

//forgot password controller
export const forgotPasswordController = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { email } = req.body;
    await forgotPasswordService(email);
    res.status(200).json({
      success: true,
      message:
        "If an account exists for this email, password reset instructions have been sent.",
    });
  },
);

//reset password controller
export const resetPasswordController = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { token, password } = req.body;
    await resetPasswordService(token, password);
    res.status(200).json({
      success: true,
      message: "password changed successfully",
    });
  },
);
