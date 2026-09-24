"use client";

import { LoaderCircle, ShieldX } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useAdmin } from "@/components/admin/admin-provider";
import { Button } from "@/components/ui/button";

export function AdminGuard({ children }: { children: ReactNode }) {
  const { status, endSession } = useAdmin();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/admin/login");
  }, [router, status]);

  if (status === "forbidden") {
    return (
      <main className="grid min-h-svh place-items-center bg-background p-6">
        <section className="w-full max-w-md rounded-md border border-danger/25 bg-surface p-6 text-center">
          <ShieldX size={28} className="mx-auto text-danger" aria-hidden="true" />
          <p className="type-meta mt-5 text-danger">Access denied</p>
          <h1 className="mt-3 text-xl font-semibold">Super Admin access required</h1>
          <p className="mt-3 text-sm leading-6 text-text-secondary">This session is valid, but it is not authorized to manage the InflowAPM platform.</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button type="button" onClick={() => { endSession(); router.replace("/admin/login?denied=1"); }}>Use another account</Button>
            <Button asChild variant="outline"><Link href="/">Back to product</Link></Button>
          </div>
        </section>
      </main>
    );
  }

  if (status !== "authenticated") {
    return (
      <main className="grid min-h-svh place-items-center bg-background" aria-live="polite" aria-busy="true">
        <div className="flex items-center gap-3 text-sm text-text-secondary">
          <LoaderCircle size={18} className="animate-spin text-brand motion-reduce:animate-none" aria-hidden="true" />
          {status === "initializing" ? "Verifying administrator session…" : "Returning to admin sign in…"}
        </div>
      </main>
    );
  }

  return children;
}
