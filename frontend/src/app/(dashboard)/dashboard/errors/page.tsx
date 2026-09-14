import { RecentErrorsView } from "@/components/analytics/recent-errors";

export default function ErrorsPage() {
  return (
    <div>
      <p className="type-meta text-brand-steel">Incident surface</p>
      <h1 className="type-page mt-3">Recent errors</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-text-secondary">Inspect the active project&apos;s latest HTTP failures with route, status, duration, and captured error context.</p>
      <RecentErrorsView />
    </div>
  );
}
