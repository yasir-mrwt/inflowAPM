import { Queue } from "bullmq";
import redisConnectionOptions from "../utils/redis.js";

// Define a strict type-safe structural envelope shape contract for oncoming payloads
export interface WelcomeEmailJobPayload {
  email: string;
  first_name: string;
}

// Instantiate the permanent, shared registration email queue line block
export const emailQueue = new Queue<WelcomeEmailJobPayload>("EmailQueue", {
  connection: redisConnectionOptions,
});
