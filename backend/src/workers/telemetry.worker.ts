import { Worker } from "bullmq";
import { redisConnectionOptions } from "../utils/redis.js";
import { createTelemetryModel } from "../models/telemetry.model.js";

//create a new worker for telemetry ingestion insertion
export const telemetryWorker = new Worker(
  "TelemetryIngestionQueue",
  async (job) => {
    const { project_id, events } = job.data;

    //call the model to insert the values here no in the services any more as we have our worker there
    await createTelemetryModel(project_id, events);
  },
  {
    connection: redisConnectionOptions,
    concurrency: 1,
  },
);

//log error on failure
telemetryWorker.on("failed", (job, err) => {
  console.log(`background telemetry job:${job} failed check the logs `, err);
});

//log result on success
telemetryWorker.on("completed", (job, result) => {
  console.log(`Telemetry job ${job.id} completed successfully`);
});
