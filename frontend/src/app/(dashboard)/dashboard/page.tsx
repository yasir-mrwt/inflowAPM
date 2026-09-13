import { KpiOverview } from "@/components/dashboard/kpi-overview";

export default function DashboardPage() {
  return (
    <div>
      <p className="type-meta text-brand-steel">Overview</p>
      <h1 className="type-page mt-3">Application health</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-text-secondary">Monitor real request volume, errors, latency, and throughput for the active project.</p>
      <KpiOverview />
    </div>
  );
}
