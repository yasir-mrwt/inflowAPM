import {
  createProjectModel,
  deleteProjectModel,
  ProjectRow,
  searchProjectByUserIdModel,
} from "../models/project.model.js";
import { AppError } from "../utils/AppError.js";
import crypto from "node:crypto";
import redisClient from "../utils/redis.js";
import { hashSecret } from "../utils/hashSecret.js";

//remove api key from the project row interface and create a new interface so that when searching it dont show api key
export type ProjectSafe = Omit<ProjectRow, "api_key">;

//service to create projects using name api key and user id
export async function createProjectService(
  name: string,
  user_id: string,
): Promise<ProjectRow | null> {
  const secureKey = crypto.randomBytes(32).toString("hex");
  const result = await createProjectModel(name, secureKey, user_id);

  if (!result) {
    throw new AppError("error while creating project check your inputs", 400);
  }
  return { ...result, api_key: secureKey };
}
export interface SearchProjectRow {
  projects: ProjectSafe[];
  total_count: number;
}
//service to search for projects using user id
export async function searchProjectByUserIdService(
  user_id: string,
  limit: number,
  offset: number,
): Promise<SearchProjectRow> {
  const result = await searchProjectByUserIdModel(user_id, limit, offset);
  if (!result) {
    throw new AppError("ensure your given user id is correct", 400);
  }
  const totalCount =
    result.length > 0 ? Number(result[0].total_count) : 0;
  const safeSearch = result.map((project) => {
    const { api_key, total_count, ...rest } = project;
    return rest;
  });
  return { projects: safeSearch, total_count: totalCount };
}

//service to delete project
export async function deleteProjectService(
  id: string,
  user_id: string,
): Promise<{ id: string }> {
  const result = await deleteProjectModel(id, user_id);
  if (result.length === 0) {
    throw new AppError("no project found with this given id", 404);
  }
  //as we are returning directly result.rows in our model so we will get those values
  const api_key = result[0].api_key; //get the api key
  // New rows store the hash; legacy rows may still contain the raw key.
  await redisClient.del(
    `projects:apikey:check:${api_key}`,
    `projects:apikey:check:${hashSecret(api_key)}`,
  );
  return { id: result[0].id };
}
