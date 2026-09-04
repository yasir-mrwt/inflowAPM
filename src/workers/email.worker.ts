import { Worker, Job } from "bullmq";
import { redisConnectionOptions } from "../utils/redis.js";
import { mailTransporter } from "../configs/mail.config.js";
import { config } from "../configs/env.js";
import { WelcomeEmailJobPayload } from "../queues/email.queue.js";

export const emailWorker = new Worker<WelcomeEmailJobPayload>(
  "EmailQueue",
  async (job: Job<WelcomeEmailJobPayload>) => {
    const { email, first_name } = job.data;
    console.log(
      `✉️  Processing background mail delivery task for job reference ID: ${job.id}`,
    );

    // Compile your custom system outflow welcome message
    await mailTransporter.sendMail({
      from: config.mail_from,
      to: email,
      subject: "Welcome to InflowAPM - High-Scale Monitoring Active!",
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2>Assalam-o-Alaikum, ${first_name}! 👋</h2>
          <p>Your elite system performance tracking workspace account is now fully activated.</p>
          <p>Initialize your custom SDK strings and start streaming data matrix parameters natively!</p>
          <br />
          <strong>- The InflowAPM Engineering Infrastructure Team</strong>
        </div>
      `,
    });

    console.log(
      `✅ Welcome activation mail dispatched successfully to raw user socket address: ${email}`,
    );
  },
  {
    connection: redisConnectionOptions,
    concurrency: 1, // Restricts processing to 1 active mail thread concurrently to prevent SMTP rate limit lockouts
  },
);

// Exception listener check to trap background worker crash exceptions safely
emailWorker.on("failed", (job, err) => {
  console.error(
    `Background Email Worker Job failed with reference execution fault:`,
    err,
  );
});
