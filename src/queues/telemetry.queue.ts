import { Queue } from "bullmq";
import { redisConnectionOptions } from "../utils/redis.js";

export const telemetryIngestionQueue = new Queue("TelemetryIngestionQueue", {
  connection: redisConnectionOptions,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});
