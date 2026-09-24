import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AdminProvider } from "@/components/admin/admin-provider";

export const metadata: Metadata = {
  title: "Super Admin",
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return <AdminProvider>{children}</AdminProvider>;
}
