import { createHash } from "node:crypto";

const FINGERPRINT_VERSION = "v1";
const FINGERPRINT_SEPARATOR = "\u001f";

export type ErrorFingerprintInput = {
  errorKey: string;
  message: string | null | undefined;
  route: string | null | undefined;
};

export function normalizeFingerprintValue(
  value: string | null | undefined,
): string {
  return (value ?? "").trim().toLowerCase().replace(/\s+/gu, " ");
}

export function createErrorFingerprint(input: ErrorFingerprintInput): string {
  const canonical = [
    FINGERPRINT_VERSION,
    normalizeFingerprintValue(input.errorKey),
    normalizeFingerprintValue(input.message),
    normalizeFingerprintValue(input.route),
  ].join(FINGERPRINT_SEPARATOR);

  return createHash("sha256").update(canonical, "utf8").digest("hex");
}
