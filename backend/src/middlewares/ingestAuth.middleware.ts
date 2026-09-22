import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError.js";
import { validateProjectApiKeyModel } from "../models/project.model.js";
import redisClient from "../utils/redis.js";
import { hashSecret } from "../utils/hashSecret.js";

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
  const cacheKey = `projects:apikey:check:${hashSecret(api_key)}`;

  //get all values from there if any
  const cacheData = await redisClient.get(cacheKey);
  if (cacheData) {
    const cachedProject = JSON.parse(cacheData) as {
      id: string;
      user_id: string;
      status?: string;
      owner_status?: string;
    };
    if (
      cachedProject.status === "active" &&
      cachedProject.owner_status === "active"
    ) {
      req.project = {
        ...cachedProject,
        status: cachedProject.status,
        owner_status: cachedProject.owner_status,
      };
      return next();
    }
    await redisClient.del(cacheKey);
  }
  const result = await validateProjectApiKeyModel(api_key);
  if (!result) {
    throw new AppError(
      "Invalid API key no project found with this api key",
      401,
    );
  }
  if (result.status !== "active") {
    throw new AppError("project is disabled", 403);
  }
  if (result.owner_status !== "active") {
    throw new AppError("project owner account is suspended", 403);
  }
  //if no values found then save values there
  await redisClient.set(cacheKey, JSON.stringify(result), "EX", 300);

  req.project = result;
  return next();
}
