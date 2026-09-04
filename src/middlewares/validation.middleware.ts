import { Request, Response, NextFunction } from "express";
import {
  loginUserSchema,
  refreshTokenSchema,
  registerUserSchema,
} from "../schemas/user.schema.js";

export async function registerUserValidation(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const result = registerUserSchema.safeParse(req.body);
  if (!result.success) {
    return next(result.error);
  }
  req.body = result.data;
  return next();
}
export async function loginUserValidation(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const result = loginUserSchema.safeParse(req.body);
  if (!result.success) {
    return next(result.error);
  }
  req.body = result.data;
  return next();
}

export async function refreshTokenValidation(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const result = refreshTokenSchema.safeParse(req.body);
  if (!result.success) {
    return next(result.error);
  }
  req.body = result.data;
  return next();
}
