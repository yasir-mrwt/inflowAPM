import jwt from "jsonwebtoken";
import { config } from "../configs/env.js";
import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError.js";

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
    const [schema, token] = header?.split("") || [];
    if (schema !== "bearer" || !token) {
      throw new AppError(
        "authorization token must be bearer <accessToken>",
        401,
      );
    }
    const decoded = jwt.verify(token, config.access_token) as {
      id: string;
      email: string;
    };
    req.user = decoded;
    return next();
  } catch (error: unknown) {
    throw next(error);
  }
}
