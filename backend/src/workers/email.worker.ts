import { Worker, Job } from "bullmq";
import { redisConnectionOptions } from "../utils/redis.js";
import { mailTransporter } from "../configs/mail.config.js";
import { config } from "../configs/env.js";
import { EmailJobPayload } from "../queues/email.queue.js";

export const emailWorker = new Worker<EmailJobPayload>(
  "EmailQueue",
  async (job: Job<EmailJobPayload>) => {
    const payload = job.data;
    console.log(
      ` Processing background mail delivery task for job reference ID: ${job.id}`,
    );
    if (payload.type === "welcome") {
      // Compile your custom system outflow welcome message
      await mailTransporter.sendMail({
        from: config.mail_from,
        to: payload.email,
        subject: "Welcome to InflowAPM - High-Scale Monitoring Active!",
        html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2>Assalam-o-Alaikum, ${payload.first_name}! 👋</h2>
          <p>Your elite system performance tracking workspace account is now fully activated.</p>
          <p>Initialize your custom SDK strings and start streaming data matrix parameters natively!</p>
          <br />
          <strong>- The InflowAPM Engineering Infrastructure Team</strong>
        </div>
      `,
      });

      console.log(
        `✅ Welcome activation mail dispatched successfully to raw user socket address: ${payload.email}`,
      );
    } else if (payload.type === "reset_password") {
      await mailTransporter.sendMail({
        from: config.mail_from,
        to: payload.email,
        subject: "Reset your InflowAPM Password",
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #333;">
            <h2>Password Reset Request</h2>
            <p>We received a request to reset your password. Click the link below to set a new one. This link will expire in 15 minutes.</p>
            <p><a href="${payload.reset_link}" style="background: #007bff; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
            <p>If you did not request this, you can safely ignore this email.</p>
            <br />
            <strong>- The InflowAPM Engineering Infrastructure Team</strong>
          </div>
        `,
      });
      console.log(
        `✅ Password reset mail dispatched successfully to: ${payload.email}`,
      );
    }
  },
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
