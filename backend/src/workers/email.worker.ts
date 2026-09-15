import { Worker, Job } from "bullmq";
import { redisConnectionOptions } from "../utils/redis.js";
import type { EmailJobPayload } from "../queues/email.queue.js";
import { processEmailJob } from "./email.processor.js";

export const emailWorker = new Worker<EmailJobPayload>(
  "EmailQueue",
  async (job: Job<EmailJobPayload>) => processEmailJob(job),
  {
    connection: redisConnectionOptions,
    concurrency: 1,
  },
);

emailWorker.on("failed", (job, err) => {
  console.error(
    `Background Email Worker Job failed with reference execution fault:`,
    err,
  );
});

emailWorker.on("completed", (job, result) => {
  console.log(`Email job ${job.id} completed successfully`);
});
