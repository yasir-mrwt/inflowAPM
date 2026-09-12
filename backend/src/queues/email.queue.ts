import { Queue } from "bullmq";
import redisConnectionOptions from "../utils/redis.js";

// Define a strict type-safe structural envelope shape contract for oncoming payloads

//interface for welcome email
export interface WelcomeEmailJobPayload {
  type: "welcome";
  email: string;
  first_name: string;
}

//interface for reset password
export interface ResetPasswordEmailPayload {
  type: "reset_password";
  email: string;
  reset_link: string;
}

//creating union of both based on there types
export type EmailJobPayload =
  | WelcomeEmailJobPayload
  | ResetPasswordEmailPayload;

// Instantiate the permanent, shared registration email queue line block
export const emailQueue = new Queue<EmailJobPayload>("EmailQueue", {
  connection: redisConnectionOptions,
});
