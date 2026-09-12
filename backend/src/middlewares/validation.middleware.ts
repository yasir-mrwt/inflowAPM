import { Request, Response, NextFunction } from "express";
import {
  forgotPasswordSchema,
  loginUserSchema,
  refreshTokenSchema,
  registerUserSchema,
  resetPasswordSchema,
} from "../schemas/user.schema.js";
import {
  projectIdSchema,
  projectSchema,
  querySchema,
} from "../schemas/project.schema.js";
import { telemetrySchema } from "../schemas/telemetry.schema.js";
import { analyticsDashboardQuerySchema } from "../schemas/analytics.schema.js";

//validation middleware for registering user data
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

//validation middleware for logging in user data
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

//validation middleware for getting new access token after refreshing token input data
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

//validation middleware for creating new project
export async function projectCreationValidation(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const result = projectSchema.safeParse(req.body);
  if (!result.success) {
    return next(result.error);
  }
  req.body = result.data;
  return next();
}

//validation middleware for getting project using query
export async function getProjectByQueryValidation(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const result = querySchema.safeParse(req.query);
  if (!result.success) {
    return next(result.error);
  }
  res.locals.projectQuery = result.data;
  return next();
}

//validation middleware for getting project id using params
export async function projectIdValidation(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const result = projectIdSchema.safeParse(req.params);
  if (!result.success) {
    return next(result.error);
  }
  req.params.id = result.data.id as any;
  return next();
}

//validation middleware for ingest telemetry post
export async function telemetryValidation(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const result = telemetrySchema.safeParse(req.body);
  if (!result.success) {
    return next(result.error);
  }
  req.body = result.data;
  return next();
}

//validation middleware for analytics inputs
export async function analyticsDashboardQueryValidation(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const result = analyticsDashboardQuerySchema.safeParse(req.query);
  if (!result.success) {
    return next(result.error);
  }
  res.locals.analyticsQuery = result.data;
  return next();
}

//validation middleware for forgot password inputs
export async function forgotPasswordValidation(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const result = forgotPasswordSchema.safeParse(req.body);
  if (!result.success) {
    return next(result.error);
  }
  req.body = result.data;
  return next();
}

//validation middleware for forgot password inputs
export async function resetPasswordValidation(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const result = resetPasswordSchema.safeParse(req.body);
  if (!result.success) {
    return next(result.error);
  }
  req.body = result.data;
  return next();
}
