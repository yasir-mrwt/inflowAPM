import { RoutePerformanceView } from "@/components/analytics/route-performance";

export default function RoutesPage() {
  return (
    <div>
      <p className="type-meta text-brand-steel">Performance</p>
      <h1 className="type-page mt-3">Routes</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-text-secondary">Compare request volume, errors, and latency across the active project&apos;s HTTP routes.</p>
      <RoutePerformanceView />
    </div>
  );
}
