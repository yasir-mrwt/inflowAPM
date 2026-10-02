import type { AnalyticsRange } from "@/lib/analytics-api";
import { apiRequest } from "@/lib/auth-api";

export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "OPTIONS"
  | "HEAD";

export type TelemetryRequest = {
  id: string;
  project_id: string;
  occurred_at: string;
  method: HttpMethod | null;
  route: string | null;
  status: number | null;
  duration_ms: number | null;
  is_error: boolean;
  user_id: string | null;
  anonymous_id: string | null;
};

export type TelemetryRequestDetail = TelemetryRequest & {
  error_message: string | null;
};

export type TelemetryRequestList = {
  requests: TelemetryRequest[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
};

type ListRequestParams = {
  projectId: string;
  range: AnalyticsRange;
  page: number;
  limit: number;
  method?: HttpMethod;
  status?: number;
  search?: string;
  signal?: AbortSignal;
};

export async function listTelemetryRequests({
  projectId,
  range,
  page,
  limit,
  method,
  status,
  search,
  signal,
}: ListRequestParams): Promise<TelemetryRequestList> {
  const query = new URLSearchParams({
    project_id: projectId,
    range,
    page: String(page),
    limit: String(limit),
  });
  if (method) query.set("method", method);
  if (status !== undefined) query.set("status", String(status));
  if (search) query.set("search", search);

  const response = await apiRequest<{
    success: boolean;
    data: TelemetryRequest[];
    total_count: number;
    meta: { page: number; limit: number; total_pages: number };
  }>(`/api/v1/telemetry/requests?${query}`, { signal });

  return {
    requests: response.data,
    totalCount: response.total_count,
    page: response.meta.page,
    limit: response.meta.limit,
    totalPages: response.meta.total_pages,
  };
}

export async function getTelemetryRequest(
  requestId: string,
  signal?: AbortSignal,
): Promise<TelemetryRequestDetail> {
  const response = await apiRequest<{
    success: boolean;
    data: TelemetryRequestDetail;
  }>(`/api/v1/telemetry/requests/${encodeURIComponent(requestId)}`, { signal });
  return response.data;
}
