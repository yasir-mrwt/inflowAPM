import { apiRequest } from "@/lib/auth-api";

export type AnalyticsRange = "1h" | "24h" | "7d" | "30d";
export type OverviewMetrics = { total_requests: number; total_errors: number; error_rate: number; avg_latency: number; p95_latency: number; throughput: number };
export type TimelinePoint = {
  time_bucket: string;
  requests: number;
  errors: number;
  avg_latency: number;
  p95_latency: number;
};
export type RoutePerformance = {
  method: string;
  route: string;
  request_count: number;
  error_count: number;
  avg_latency: number;
  p95_latency: number;
};
export type RecentError = {
  id: string;
  occurred_at: string;
  method: string;
  route: string;
  status: number;
  duration_ms: number;
  error_message: string | null;
};
export type DashboardAnalytics = {
  overview: OverviewMetrics;
  timeline: TimelinePoint[];
  route_performance: RoutePerformance[];
  recent_errors: RecentError[];
};

export async function dashboardAnalyticsRequest(projectId: string, range: AnalyticsRange, signal?: AbortSignal): Promise<DashboardAnalytics> {
  const query = new URLSearchParams({ project_id: projectId, range });
  const response = await apiRequest<{ success: boolean; data: DashboardAnalytics }>(`/api/v1/telemetry/analytics/dashboard?${query}`, { signal });
  return response.data;
}
