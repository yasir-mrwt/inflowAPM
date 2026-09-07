import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError.js";
import { validateProjectApiKeyModel } from "../models/project.model.js";
import redisClient from "../utils/redis.js";
import { json } from "zod";

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

  //first just create where to store the cache -folder structure
  const cacheKey = `projects:apikey:check:${api_key}`;

  //get all values from there if any
  const cacheData = await redisClient.get(cacheKey);
  if (cacheData) {
    (req as any).project = JSON.parse(cacheData);
    return next();
  }
  const result = await validateProjectApiKeyModel(api_key);
  if (!result) {
    throw new AppError(
      "Invalid API key no project found with this api key",
      401,
    );
  }
  //if no values found then save values there
  await redisClient.set(cacheKey, JSON.stringify(result), "EX", 300);

  (req as any).project = result;
  return next();
}
