export type AuthIntent = "login" | "register" | "forgot-password" | "reset-password";

export type AuthIntentResult =
  | { status: "success"; message: string }
  | { status: "unavailable"; message: string };

export const missingPasswordResetEndpoints = [
  "POST /api/v1/auth/forgot-password",
  "POST /api/v1/auth/reset-password",
] as const;

/**
 * F8 owns the complete form experience, not credential transport. F9 can replace
 * this adapter without changing form validation or presentation.
 */
export function submitAuthIntent(intent: AuthIntent): Promise<AuthIntentResult> {
  const messages: Record<AuthIntent, string> = {
    login: "Sign in is not connected yet. Your credentials were not sent.",
    register: "Account creation is not connected yet. Your details were not sent.",
    "forgot-password":
      "Password-reset email delivery is not available yet. No email was sent.",
    "reset-password":
      "Password reset is not available yet. Your password was not changed.",
  };

  return Promise.resolve({ status: "unavailable", message: messages[intent] });
}
