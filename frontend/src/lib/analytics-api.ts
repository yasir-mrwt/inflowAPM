import { apiRequest } from "@/lib/auth-api";

export type AnalyticsRange = "1h" | "24h" | "7d" | "30d";
export type OverviewMetrics = { total_requests: number; total_errors: number; error_rate: number; avg_latency: number; p95_latency: number; throughput: number };
export type DashboardAnalytics = { overview: OverviewMetrics; timeline: unknown[]; route_performance: unknown[]; recent_errors: unknown[] };

export async function dashboardAnalyticsRequest(projectId: string, range: AnalyticsRange, signal?: AbortSignal): Promise<DashboardAnalytics> {
  const query = new URLSearchParams({ project_id: projectId, range });
  const response = await apiRequest<{ success: boolean; data: DashboardAnalytics }>(`/api/v1/telemetry/analytics/dashboard?${query}`, { signal });
  return response.data;
}
