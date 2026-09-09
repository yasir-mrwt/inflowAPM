import type { TelemetrySchemaContract } from "../schemas/telemetry.schema.js";

// service to create telemetry events it takes the project UUID and the event objects array from the controller and feeds them straight into the model query layer
export async function createTelemetryService(
  project_id: string,
  events: TelemetrySchemaContract,
): Promise<void> {
  // Loading the producer only when ingestion is used keeps importing app.ts
  // free from BullMQ connection side effects.
  const { telemetryIngestionQueue } = await import(
    "../queues/telemetry.queue.js"
  );

  //calling the telemetry queue to work on bulk insertion
  await telemetryIngestionQueue.add("TelemetryIngestionQueue", {
    project_id,
    events,
  });

  //after this we would call our model insertion inside our worker
}
