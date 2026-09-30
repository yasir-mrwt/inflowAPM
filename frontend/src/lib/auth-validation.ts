import type { AuthIntent } from "@/lib/auth-api";

export type AuthFieldErrors = Partial<Record<string, string>>;

export const PASSWORD_MAX_LENGTH = 100;
export const STANDARD_PASSWORD_MIN_LENGTH = 5;
export const RESET_PASSWORD_MIN_LENGTH = 8;

export function validateAuthFields(
  mode: AuthIntent,
  values: Record<string, string>,
): AuthFieldErrors {
  const errors: AuthFieldErrors = {};
  const email = (values.email ?? "").trim();

  if (mode !== "reset-password") {
    if (!email) errors.email = "Enter your email address.";
    else if (
      email.length > 100 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      errors.email = "Enter a valid email address of 100 characters or fewer.";
    }
  }

  if (mode === "register") {
    for (const [name, label] of [
      ["firstName", "First name"],
      ["lastName", "Last name"],
    ]) {
      const entry = (values[name] ?? "").trim();
      if (entry.length < 5 || entry.length > 100) {
        errors[name] = `${label} must be 5 to 100 characters.`;
      }
    }
  }

  if (mode === "login" || mode === "register" || mode === "reset-password") {
    const rawPassword = values.password ?? "";
    const password = mode === "reset-password" ? rawPassword : rawPassword.trim();
    const minimum =
      mode === "reset-password"
        ? RESET_PASSWORD_MIN_LENGTH
        : STANDARD_PASSWORD_MIN_LENGTH;
    if (password.length < minimum || password.length > PASSWORD_MAX_LENGTH) {
      errors.password = `Password must be ${minimum} to ${PASSWORD_MAX_LENGTH} characters.`;
    }

    if (mode !== "login") {
      const rawConfirmation = values.confirmPassword ?? "";
      const confirmation =
        mode === "reset-password" ? rawConfirmation : rawConfirmation.trim();
      if (password !== confirmation) {
        errors.confirmPassword =
          mode === "reset-password"
            ? "Passwords do not match."
            : "Passwords must match.";
      }
    }
  }

  return errors;
}
