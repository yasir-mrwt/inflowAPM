import type { Metadata } from "next";
import type { ReactNode } from "react";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { ProtectedRoute } from "@/components/dashboard/protected-route";
import { ProjectsProvider } from "@/components/projects/projects-provider";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false, follow: false } };

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <ProtectedRoute><ProjectsProvider><DashboardShell>{children}</DashboardShell></ProjectsProvider></ProtectedRoute>;
}
