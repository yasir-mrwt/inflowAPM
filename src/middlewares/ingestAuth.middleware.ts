import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError.js";
import { validateProjectApiKeyModel } from "../models/project.model.js";

//middleware to validate api key directly check the key if valid or not
export async function ingestAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.headers.authorization;
  if (!header) {
    throw new AppError("authorization header is required", 401);
  }
  const parts = header.split(" "); //we split the header to separate api key
  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") {
    throw new AppError("Authorization format must be Bearer <key>", 401);
  }
  const api_key = parts[1]; //taking second part only

  const result = await validateProjectApiKeyModel(api_key);
  if (!result) {
    throw new AppError(
      "Invalid API key no project found with this api key",
      401,
    );
  }
  (req as any).project = result;
  return next();
}
