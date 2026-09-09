import {
  overViewAnalyticsModel,
  TimeLineAnalyticsModel,
  RoutePerformanceModel,
  recentErrorModel,
} from "../models/analytics.model.js";

//we have to call models at once returning a promise all of them at once
export async function getMasterDashboardAnalyticsService(
  project_id: string,
  range: string,
) {
  let intervalString = "24 hours";
  let bucketUnit = "hour";
  let rangeInSeconds = 86400;

  if (range === "1h") {
    intervalString = "1 hour";
    bucketUnit = "minute";
    rangeInSeconds = 3600;
  } else if (range === "7d") {
    intervalString = "7 days";
    bucketUnit = "day";
    rangeInSeconds = 604800;
  } else if (range === "30d") {
    intervalString = "30 days";
    bucketUnit = "day";
    rangeInSeconds = 2592000;
  }

  // 2. Fire everything concurrently in parallel!
  const [[overview], timeline, routes, recentErrors] = await Promise.all([
    overViewAnalyticsModel(project_id, intervalString),
    TimeLineAnalyticsModel(project_id, intervalString, bucketUnit),
    RoutePerformanceModel(project_id, intervalString),
    recentErrorModel(project_id, intervalString),
  ]);

  // 3. Extract total requests and calculate your system throughput rate
  const totalRequests = overview ? Number(overview.total_requests) : 0;
  const throughput = totalRequests / rangeInSeconds;

  // 4. Inject throughput right into your overview metrics block wrapper object
  const finalizedOverview = {
    total_requests: Number(overview.total_requests || 0),
    total_errors: Number(overview.total_errors || 0),
    error_rate:
      totalRequests > 0
        ? Number(
            (
              (Number(overview.total_errors || 0) / totalRequests) *
              100
            ).toFixed(2),
          )
        : 0,
    avg_latency: Number(Number(overview.avg_latency || 0).toFixed(2)),
    p95_latency: Number(Number(overview.p95_latency || 0).toFixed(2)),
    throughput: Number(throughput.toFixed(2)),
  };

  // 5. Return the single compiled JSON package to the controller!
  return {
    overview: finalizedOverview,
    timeline,
    route_performance: routes,
    recent_errors: recentErrors,
  };
}
