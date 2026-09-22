import jwt from "jsonwebtoken";
import { config } from "../configs/env.js";
import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError.js";
import { findUserByIdModel } from "../models/user.model.js";

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header) {
      throw new AppError("authorization header is required", 401);
    }
    const [schema, token] = header?.split(" ") || [];
    if (schema !== "Bearer" || !token) {
      throw new AppError(
        "authorization token must be bearer <accessToken>",
        401,
      );
    }
    const decoded = jwt.verify(token, config.access_token) as {
      id: string;
      email: string;
    };
    const user = await findUserByIdModel(decoded.id);
    if (!user) {
      throw new AppError("authenticated account no longer exists", 401);
    }
    if (user.status !== "active") {
      throw new AppError("account is suspended", 403);
    }
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
    };
    return next();
  } catch (error: unknown) {
    return next(error);
  }
}
