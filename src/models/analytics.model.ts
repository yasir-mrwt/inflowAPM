import { QueryResult } from "pg";
import pool from "../configs/db.js";

//to calculate the over view stats of the project
export interface OverViewAnalyticsRow {
  total_requests: number;
  total_errors: number;
  avg_latency: number;
  p95_latency: number;
}

//model for calculating the over view stats of the project
export async function overViewAnalyticsModel(
  project_id: string,
  intervalString: string,
): Promise<OverViewAnalyticsRow[]> {
  try {
    const result: QueryResult<OverViewAnalyticsRow> = await pool.query(
      `
        select 
          count(*)::integer as total_requests,
          coalesce(sum(case when status >= 500 then 1 else 0 end), 0)::integer as total_errors,
          coalesce(avg(duration_ms), 0)::double precision as avg_latency,
          coalesce(percentile_cont(0.95) within group (order by duration_ms), 0)::double precision as p95_latency
        from inflowapm.telemetry_events
        where project_id = $1
          and occurred_at >= now() - $2::interval;
      `,
      [project_id, intervalString],
    );
    return result.rows;
  } catch (error: unknown) {
    console.log(
      "error while calculating analytics overview pls check out the query",
    );
    throw error;
  }
}

//timeline model interface
export interface TimeLineAnalyticsRow {
  time_bucket: Date;
  requests: number;
  errors: number;
  avg_latency: number;
  p95_latency: number;
}

//model function to get timeline analytics
export async function TimeLineAnalyticsModel(
  project_id: string,
  intervalString: string,
  bucketUnit: string,
): Promise<TimeLineAnalyticsRow[]> {
  try {
    const result: QueryResult<TimeLineAnalyticsRow> = await pool.query(
      `
        select 
          date_trunc('${bucketUnit}', occurred_at) as time_bucket,
          count(*)::integer as requests,
          coalesce(sum(case when status >= 500 then 1 else 0 end), 0)::integer as errors,
          coalesce(avg(duration_ms), 0)::double precision as avg_latency,
          coalesce(percentile_cont(0.95) within group (order by duration_ms), 0)::double precision as p95_latency
        from inflowapm.telemetry_events
        where project_id = $1 
          and occurred_at >= now() - $2::interval
        group by time_bucket
        order by time_bucket asc;
      `,
      [project_id, intervalString],
    );
    return result.rows;
  } catch (error: unknown) {
    console.log("error while calculating time line analytics");
    throw error;
  }
}

//route performance analytics interface
export interface RoutePerformanceRow {
  method: string;
  route: string;
  request_count: number;
  error_count: number;
  avg_latency: number;
  p95_latency: number;
}

//model for route performance analytics
export async function RoutePerformanceModel(
  project_id: string,
  intervalString: string,
): Promise<RoutePerformanceRow[]> {
  try {
    const result: QueryResult<RoutePerformanceRow> = await pool.query(
      `
        select 
          method,
          route,
          count(*)::integer as request_count,
          coalesce(sum(case when status >= 500 then 1 else 0 end), 0)::integer as error_count,
          coalesce(avg(duration_ms), 0)::double precision as avg_latency,
          coalesce(percentile_cont(0.95) within group (order by duration_ms), 0)::double precision as p95_latency
        from inflowapm.telemetry_events
        where project_id = $1 
          and occurred_at >= now() - $2::interval
        group by method, route
        order by request_count desc;
      `,
      [project_id, intervalString],
    );
    return result.rows;
  } catch (error: unknown) {
    console.log("error while getting route performance analytics");
    throw error;
  }
}

//recent errors interface
export interface RecentErrorRows {
  id: string;
  occurred_at: Date;
  method: string;
  route: string;
  status: number;
  duration_ms: number;
  error_message: string | null;
}

//model for recent errors
export async function recentErrorModel(
  project_id: string,
): Promise<RecentErrorRows[]> {
  try {
    const result: QueryResult<RecentErrorRows> = await pool.query(
      `
        select 
          id,
          occurred_at,
          method,
          route,
          status,
          duration_ms,
          metadata->>'error_message' as error_message
        from inflowapm.telemetry_events
        where project_id = $1 
          and status >= 500
        order by occurred_at desc 
        limit 20;
      `,
      [project_id],
    );
    return result.rows;
  } catch (error: unknown) {
    console.log("error while getting recent errors analytics");
    throw error;
  }
}
