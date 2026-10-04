import type { AnalyticsRange } from "@/lib/analytics-api";
import { apiRequest } from "@/lib/auth-api";

export type IssueSummary = {
  issue_id: string;
  error_type: string;
  message: string | null;
  route: string | null;
  status: number | null;
  occurrence_count: number;
  first_seen: string;
  last_seen: string;
  affected_identity_count: number;
  affected_user_count: number;
  affected_anonymous_count: number;
};

export type IssueOccurrence = {
  id: string;
  type: "http" | "event";
  occurred_at: string;
  method: string | null;
  route: string | null;
  status: number | null;
  duration_ms: number | null;
  error_message: string | null;
  user_id: string | null;
  anonymous_id: string | null;
};

export type IssuesList = {
  issues: IssueSummary[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
};

export async function listIssuesRequest(input: {
  projectId: string;
  range: AnalyticsRange;
  page: number;
  limit: number;
  search?: string;
  signal?: AbortSignal;
}): Promise<IssuesList> {
  const query = new URLSearchParams({
    project_id: input.projectId,
    range: input.range,
    page: String(input.page),
    limit: String(input.limit),
  });
  if (input.search) query.set("search", input.search);

  const response = await apiRequest<{
    success: boolean;
    data: IssueSummary[];
    total_count: number;
    meta: { page: number; limit: number; total_pages: number };
  }>(`/api/v1/telemetry/issues?${query}`, { signal: input.signal });

  return {
    issues: response.data,
    totalCount: response.total_count,
    page: response.meta.page,
    limit: response.meta.limit,
    totalPages: response.meta.total_pages,
  };
}

export async function getIssueRequest(input: {
  issueId: string;
  projectId: string;
  range: AnalyticsRange;
  page: number;
  limit: number;
  signal?: AbortSignal;
}): Promise<{
  issue: IssueSummary;
  occurrences: IssueOccurrence[];
  page: number;
  limit: number;
  totalPages: number;
}> {
  const query = new URLSearchParams({
    project_id: input.projectId,
    range: input.range,
    page: String(input.page),
    limit: String(input.limit),
  });
  const response = await apiRequest<{
    success: boolean;
    data: { issue: IssueSummary; occurrences: IssueOccurrence[] };
    meta: { page: number; limit: number; total_pages: number };
  }>(`/api/v1/telemetry/issues/${encodeURIComponent(input.issueId)}?${query}`, {
    signal: input.signal,
  });

  return {
    ...response.data,
    page: response.meta.page,
    limit: response.meta.limit,
    totalPages: response.meta.total_pages,
  };
}
