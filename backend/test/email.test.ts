import assert from "node:assert/strict";
import test from "node:test";
import type {
  CreateEmailOptions,
  CreateEmailResponse,
  ErrorResponse,
} from "resend";
import { config } from "../src/configs/env.js";
import {
  sendResendEmail,
  type ResendEmailSender,
} from "../src/configs/mail.config.js";
import { processEmailJob } from "../src/workers/email.processor.js";

const testFrom = "InflowAPM <noreply@example.com>";

function successfulSender(
  deliveries: CreateEmailOptions[],
): ResendEmailSender {
  return async (payload) => {
    deliveries.push(payload);
    return {
      data: { id: "email_test_123" },
      error: null,
      headers: null,
    };
  };
}

test("welcome email job invokes Resend with the existing content", async () => {
  const deliveries: CreateEmailOptions[] = [];

  const result = await processEmailJob(
    {
      id: "welcome-job",
      data: {
        type: "welcome",
        email: "new-user@example.com",
        first_name: "Yasir",
      },
    },
    { from: testFrom, sender: successfulSender(deliveries) },
  );

  assert.equal(result, "email_test_123");
  assert.equal(deliveries.length, 1);
  assert.equal(deliveries[0]?.from, testFrom);
  assert.equal(deliveries[0]?.to, "new-user@example.com");
  assert.equal(
    deliveries[0]?.subject,
    "Welcome to InflowAPM - High-Scale Monitoring Active!",
  );
  assert.match(String(deliveries[0]?.html), /Assalam-o-Alaikum, Yasir!/);
  assert.match(String(deliveries[0]?.html), /workspace account is now fully activated/);
});

test("reset-password email job preserves its secure reset link", async () => {
  const deliveries: CreateEmailOptions[] = [];
  const resetLink =
    "https://app.example.com/reset-password?token=secure-test-token";

  await processEmailJob(
    {
      id: "reset-job",
      data: {
        type: "reset_password",
        email: "existing-user@example.com",
        reset_link: resetLink,
      },
    },
    { from: testFrom, sender: successfulSender(deliveries) },
  );

  assert.equal(deliveries.length, 1);
  assert.equal(deliveries[0]?.to, "existing-user@example.com");
  assert.equal(deliveries[0]?.subject, "Reset your InflowAPM Password");
  assert.ok(String(deliveries[0]?.html).includes(resetLink));
});

test("a returned Resend API error rejects the email job", async () => {
  const resendError: ErrorResponse = {
    message: "sender domain is not verified",
    name: "validation_error",
    statusCode: 422,
  };
  const rejectedSender: ResendEmailSender = async () =>
    ({ data: null, error: resendError, headers: null }) satisfies CreateEmailResponse;

  await assert.rejects(
    processEmailJob(
      {
        id: "rejected-job",
        data: {
          type: "welcome",
          email: "new-user@example.com",
          first_name: "Yasir",
        },
      },
      { from: testFrom, sender: rejectedSender },
    ),
    /Resend rejected email: sender domain is not verified/,
  );
});

test("a thrown Resend network error rejects the email job", async () => {
  const throwingSender: ResendEmailSender = async () => {
    throw new Error("simulated network failure");
  };

  await assert.rejects(
    processEmailJob(
      {
        id: "network-failure-job",
        data: {
          type: "reset_password",
          email: "existing-user@example.com",
          reset_link: "https://app.example.com/reset-password?token=test",
        },
      },
      { from: testFrom, sender: throwingSender },
    ),
    /Resend email request failed/,
  );
});

test("mail-disabled test mode cannot invoke the configured Resend client", async () => {
  assert.equal(config.mail_enabled, false);

  await assert.rejects(
    sendResendEmail({
      from: testFrom,
      to: "nobody@example.com",
      subject: "This must not be delivered",
      text: "Disabled test delivery",
    }),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.equal(error.message, "Resend email request failed");
      assert.ok(error.cause instanceof Error);
      assert.equal(error.cause.message, "Resend mail delivery is not configured");
      return true;
    },
  );
});
