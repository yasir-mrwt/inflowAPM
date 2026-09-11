import type { Metadata } from "next";

import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = { title: "Reset password", description: "Choose a new password for your InflowAPM account.", robots: { index: false, follow: false } };

export default function ResetPasswordPage() {
  return <AuthShell animation="/animations/login.lottie" eyebrow="Credential update" title="Restore access safely." description="Choose a new password and confirm it before the reset request is sent to the authentication service."><AuthForm mode="reset-password" /></AuthShell>;
}
