import nodemailer from "nodemailer";
import { config } from "./env.js";
import SMTPTransport from "nodemailer/lib/smtp-transport/index.js";

const smtpOptions: SMTPTransport.Options = {
  host: config.mail_host,
  port: Number(config.mail_port),
  secure: Number(config.mail_port) === 465,
  auth: {
    user: config.mail_user,
    pass: config.mail_password,
  },
};
export const mailTransporter = nodemailer.createTransport(smtpOptions);

export async function verifyMailConnection(): Promise<void> {
  try {
    await mailTransporter.verify();
    console.log(
      "Nodemailer SMTP Mail server connection channel established successfully!",
    );
  } catch (error: unknown) {
    console.error(
      "CRITICAL: Failed to establish SMTP mail transporter link layer handshake:",
      error,
    );
  }
}
