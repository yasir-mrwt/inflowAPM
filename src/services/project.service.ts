import {
  createProjectModel,
  deleteProjectModel,
  ProjectRow,
  searchProjectByUserIdModel,
  ValidateProject,
} from "../models/project.model.js";
import { AppError } from "../utils/AppError.js";
import crypto from "node:crypto";

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
    throw new AppError("error while creating project just your inputs", 400);
  }
  return result;
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
    result.length > 0 ? Number((result[0] as any).total_count) : 0;
  const safeSearch = result.map((project) => {
    const { api_key, ...rest } = project;
    return rest;
  });
  return { projects: safeSearch, total_count: totalCount };
}

//service to delete project
export async function deleteProjectService(
  id: string,
  user_id: string,
): Promise<ValidateProject> {
  const result = await deleteProjectModel(id, user_id);
  if (result.length === 0) {
    throw new AppError("no project found with this given id", 404);
  }
  return result as any;
}

//
