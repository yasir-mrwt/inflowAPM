"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useAuth } from "@/components/auth/auth-provider";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [router, status]);

  if (status !== "authenticated") {
    return (
      <main className="grid min-h-svh place-items-center bg-background" aria-live="polite" aria-busy="true">
        <div className="flex items-center gap-3 text-sm text-text-secondary">
          <LoaderCircle size={18} className="animate-spin text-brand motion-reduce:animate-none" aria-hidden="true" />
          {status === "initializing" ? "Restoring your session…" : "Returning to sign in…"}
        </div>
      </main>
    );
  }

  return children;
}
