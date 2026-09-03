import { Request, Response, NextFunction } from "express";
import {
  LoginUserService,
  registerUserService,
} from "../services/user.service.js";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../services/auth.service.js";
import { catchAsync } from "../utils/catchAsync.js";
import { AppError } from "../utils/AppError.js";
import { saveRefreshToken } from "../models/user.model.js";

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

export const loginUserController = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { email, password } = req.body;
    const result = await LoginUserService({ email, password });
    if (!result) {
      throw new AppError("invalid input data", 401);
    }
    const accesToken = await generateAccessToken(result.id, result.email);
    const refreshToken = await generateRefreshToken(result.id);
    await saveRefreshToken(refreshToken, result.id);
    res.status(200).json({
      success: true,
      message: "refresh token generated successfully",
      data: {
        refresh_token: refreshToken,
        access_token: accesToken,
        userData: result,
      },
    });
  },
);
