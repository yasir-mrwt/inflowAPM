import {
  getIssueDetailModel,
  listIssuesModel,
} from "../models/issues.model.js";
import { searchProjectByProjectIdModel } from "../models/project.model.js";
import type {
  IssueDetailQuery,
  IssuesListQuery,
} from "../schemas/issues.schema.js";
import { AppError } from "../utils/AppError.js";

async function requireProjectOwner(projectId: string, ownerId: string) {
  const project = await searchProjectByProjectIdModel(projectId);
  if (!project) throw new AppError("Project not found", 404);
  if (project.user_id !== ownerId) {
    throw new AppError("You are not authorized to view this project's issues", 403);
  }
}

export async function listIssuesService(
  ownerId: string,
  query: IssuesListQuery,
) {
  await requireProjectOwner(query.project_id, ownerId);
  return listIssuesModel(query);
}

export async function getIssueDetailService(
  issueId: string,
  ownerId: string,
  query: IssueDetailQuery,
) {
  await requireProjectOwner(query.project_id, ownerId);
  const result = await getIssueDetailModel(issueId, query);
  if (!result.issue) throw new AppError("Issue not found", 404);
  return { issue: result.issue, occurrences: result.occurrences };
}
