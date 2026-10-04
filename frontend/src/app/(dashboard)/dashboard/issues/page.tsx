import { IssuesList } from "@/components/issues/issues-list";

export default function IssuesPage() {
  return <div><p className="type-meta text-brand-steel">Investigation</p><h1 className="type-page mt-3">Issues</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-text-secondary">Group recurring failures into stable patterns, measure their impact, and inspect recent occurrences.</p><IssuesList /></div>;
}
