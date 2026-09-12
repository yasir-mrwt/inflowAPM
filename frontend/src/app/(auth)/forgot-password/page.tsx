import type { Metadata } from "next";

import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = { title: "Forgot password", description: "Recover access to your InflowAPM account.", robots: { index: false, follow: false } };

export default function ForgotPasswordPage() {
  return <AuthShell animation="/animations/login.lottie" eyebrow="Recovery path" title="A precise route back in." description="Account recovery will stay explicit about every step, including whether an email has actually been sent."><AuthForm mode="forgot-password" /></AuthShell>;
}
