import {
  getTelemetryRequestDetailModel,
  listTelemetryRequestsModel,
} from "../models/telemetryRequest.model.js";
import { searchProjectByProjectIdModel } from "../models/project.model.js";
import type { TelemetryRequestListQuery } from "../schemas/telemetryRequest.schema.js";
import { AppError } from "../utils/AppError.js";

export async function listTelemetryRequestsService(
  ownerId: string,
  query: TelemetryRequestListQuery,
) {
  const project = await searchProjectByProjectIdModel(query.project_id);
  if (!project) throw new AppError("Project not found", 404);
  if (project.user_id !== ownerId) {
    throw new AppError("You are not authorized to view this project's requests", 403);
  }
  return listTelemetryRequestsModel(query);
}

export async function getTelemetryRequestDetailService(
  requestId: string,
  ownerId: string,
) {
  const request = await getTelemetryRequestDetailModel(requestId, ownerId);
  if (!request) throw new AppError("Request telemetry not found", 404);
  return request;
}
