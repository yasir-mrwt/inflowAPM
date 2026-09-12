import type { Metadata } from "next";

import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = { title: "Sign in", description: "Sign in to your InflowAPM workspace.", robots: { index: false, follow: false } };

export default function LoginPage() {
  return <AuthShell animation="/animations/login.lottie" eyebrow="Trace every request" title="Clarity starts with context." description="Return to the workspace where latency, failures, and route health become one investigation path."><AuthForm mode="login" /></AuthShell>;
}
