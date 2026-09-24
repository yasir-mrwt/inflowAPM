import { AdminLoginForm } from "@/components/admin/admin-login-form";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ passwordChanged?: string; denied?: string }>;
}) {
  const query = await searchParams;
  const notice = query.passwordChanged === "1" ? "password" : query.denied === "1" ? "denied" : undefined;
  return <AdminLoginForm notice={notice} />;
}
