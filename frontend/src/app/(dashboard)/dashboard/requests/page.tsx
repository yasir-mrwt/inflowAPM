import { RequestExplorer } from "@/components/requests/request-explorer";

export default function RequestsPage() {
  return (
    <div>
      <p className="type-meta text-brand-steel">Investigation</p>
      <h1 className="type-page mt-3">Request explorer</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-text-secondary">Inspect real HTTP requests, isolate failures and slow routes, and follow captured identity context.</p>
      <RequestExplorer />
    </div>
  );
}
