import { createTelemetryModel } from "../models/telemetry.model.js";
import { telemetryIngestionQueue } from "../queues/telemetry.queue.js";
import { AppError } from "../utils/AppError.js";

// service to create telemetry events it takes the project UUID and the event objects array from the controller and feeds them straight into the model query layer
export async function createTelemetryService(
  project_id: string,
  events: any[],
): Promise<void> {
  //calling the telemetry queue to work on bulk insertion
  await telemetryIngestionQueue.add("TelemetryIngestionQueue", {
    project_id,
    events,
  });

  //after this we would call our model insertion inside our worker
}
