import { Request, Response, NextFunction } from "express";
import { config } from "../configs/env.js";
import { ZodError } from "zod";
import { AppError } from "../utils/AppError.js";

const handleZodError = (params: ZodError) => {
  const zodError = Object.values(params.flatten().fieldErrors).join(" | ");
  return new AppError(zodError, 400);
};

const handlePostgresError = (params: any) => {
  return new AppError("duplicated values cant be used", 409);
};

const handleJWTError = (params: any) => {
  let message = "invalid token spotted cannt grant access";
  if (params.name === "TokenExpiredError") {
    message = "token expired get new token to have access";
  }
  return new AppError(message, 401);
};
export const globalErrorMiddleware = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  if (err instanceof ZodError) {
    err = handleZodError(err);
  } else if (err.code === "23505" || err.code === 23505) {
    // Postgres handles codes as strings sometimes
    err = handlePostgresError(err);
  } else if (
    err.name === "TokenExpiredError" ||
    err.name === "JsonWebTokenError"
  ) {
    err = handleJWTError(err);
  }

  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  if (config.node_env === "development" || config.node_env === "test") {
    res.status(err.statusCode).json({
      success: false,
      status: err.status,
      message: err.message,
      stack: err.stack,
    });
    return;
  }

  //product fallback
  res.status(err.statusCode).json({
    success: false,
    status: err.status,
    message: err.isOperational
      ? err.message
      : "A critical internal server error occurred.",
  });
};
