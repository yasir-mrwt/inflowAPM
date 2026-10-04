import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { IssueDetail } from "@/components/issues/issue-detail";

export default async function IssueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <div><Link href="/dashboard/issues" className="inline-flex items-center gap-2 text-sm text-text-secondary transition-colors hover:text-text-primary"><ArrowLeft size={15} aria-hidden="true" />Back to issues</Link><div className="mt-6"><p className="type-meta text-brand-steel">Investigation</p><h1 className="type-page mt-3">Issue detail</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-text-secondary">Review the grouped failure, affected identities, and its newest telemetry occurrences.</p></div><IssueDetail issueId={id} /></div>;
}
