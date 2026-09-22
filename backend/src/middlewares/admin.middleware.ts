import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError.js";

export function requireAdmin(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (!req.user) {
    return next(new AppError("admin authentication is required", 401));
  }
  if (req.user.role !== "super_admin") {
    return next(new AppError("super admin access is required", 403));
  }
  next();
}
