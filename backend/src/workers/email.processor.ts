import type { Job } from "bullmq";
import {
  getMailFrom,
  sendResendEmail,
  type ResendEmailSender,
} from "../configs/mail.config.js";
import type { EmailJobPayload } from "../queues/email.queue.js";

interface EmailProcessorOptions {
  sender?: ResendEmailSender;
  from?: string;
}

type EmailJob = Pick<Job<EmailJobPayload>, "id" | "data">;

export async function processEmailJob(
  job: EmailJob,
  options: EmailProcessorOptions = {},
): Promise<string> {
  const payload = job.data;
  const from = options.from ?? getMailFrom();

  console.log(
    `Processing background mail delivery task for job reference ID: ${job.id}`,
  );

  if (payload.type === "welcome") {
    const emailId = await sendResendEmail(
      {
        from,
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
      },
      options.sender,
    );

    console.log(`Welcome activation mail dispatched successfully to ${payload.email}`);
    return emailId;
  }

  const emailId = await sendResendEmail(
    {
      from,
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
    },
    options.sender,
  );

  console.log(`Password reset mail dispatched successfully to ${payload.email}`);
  return emailId;
}
