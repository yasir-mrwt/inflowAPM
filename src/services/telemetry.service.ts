import {
  CreateTelemetyEvent,
  createTelemetryModel,
} from "../models/telemetry.model.js";
import { AppError } from "../utils/AppError.js";

// service to create telemetry events it takes the project UUID and the event objects array from the controller and feeds them straight into the model query layer
export async function createTelemetryService(
  project_id: string,
  events: any[],
): Promise<void> {
  await createTelemetryModel(project_id, events);
}
