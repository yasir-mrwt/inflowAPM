import { AdminProjectDetailView } from "@/components/admin/admin-projects";

export default async function AdminProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminProjectDetailView id={id} />;
}
