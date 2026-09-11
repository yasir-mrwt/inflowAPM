import type { Metadata } from "next";

import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = { title: "Create account", description: "Create your InflowAPM account.", robots: { index: false, follow: false } };

export default function RegisterPage() {
  return <AuthShell animation="/animations/register.lottie" eyebrow="Own the signal" title="Build from observable foundations." description="Create a focused monitoring workspace for the services and routes your team is responsible for."><AuthForm mode="register" /></AuthShell>;
}
