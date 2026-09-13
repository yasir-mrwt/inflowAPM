import type { Metadata } from "next";

import { OAuthCallback } from "@/components/auth/oauth-callback";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = { title: "Google sign in", robots: { index: false, follow: false } };

export default async function OAuthCallbackPage({ searchParams }: { searchParams: Promise<{ code?: string | string[] }> }) {
  const codeValue = (await searchParams).code;
  const code = typeof codeValue === "string" ? codeValue : undefined;
  return <AuthShell animation="/animations/login.lottie" eyebrow="Identity exchange" title="Establishing your secure session." description="The temporary Google handoff code is exchanged once for your InflowAPM session."><OAuthCallback code={code} /></AuthShell>;
}
