import { RequestTimeline } from "@/components/analytics/request-timeline";

export default function RequestsPage() {
  return (
    <div>
      <p className="type-meta text-brand-steel">Timeline</p>
      <h1 className="type-page mt-3">Request activity</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-text-secondary">Follow the active project&apos;s real HTTP request volume, errors, and latency over time.</p>
      <RequestTimeline />
    </div>
  );
}
