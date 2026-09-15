import {
  Resend,
  type CreateEmailOptions,
  type CreateEmailResponse,
} from "resend";
import { config } from "./env.js";

export type ResendEmailSender = (
  payload: CreateEmailOptions,
) => Promise<CreateEmailResponse>;

let resendClient: Resend | undefined;

function getResendClient(): Resend {
  if (!config.mail_enabled || !config.resend_api_key) {
    throw new Error("Resend mail delivery is not configured");
  }

  resendClient ??= new Resend(config.resend_api_key);
  return resendClient;
}

export function getMailFrom(): string {
  if (!config.mail_enabled || !config.mail_from) {
    throw new Error("Resend mail delivery is not configured");
  }

  return config.mail_from;
}

const sendWithConfiguredClient: ResendEmailSender = (payload) =>
  getResendClient().emails.send(payload);

export async function sendResendEmail(
  payload: CreateEmailOptions,
  sender: ResendEmailSender = sendWithConfiguredClient,
): Promise<string> {
  let response: CreateEmailResponse;

  try {
    response = await sender(payload);
  } catch (error) {
    throw new Error("Resend email request failed", { cause: error });
  }

  if (response.error) {
    throw new Error(`Resend rejected email: ${response.error.message}`);
  }

  return response.data.id;
}
