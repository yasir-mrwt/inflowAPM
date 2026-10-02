import type { QueryResult } from "pg";

import pool from "../configs/db.js";
import type { TelemetryRequestListQuery } from "../schemas/telemetryRequest.schema.js";

export interface SafeTelemetryRequestRow {
  id: string;
  project_id: string;
  occurred_at: Date;
  method: string | null;
  route: string | null;
  status: number | null;
  duration_ms: number | null;
  is_error: boolean;
  user_id: string | null;
  anonymous_id: string | null;
}

export interface SafeTelemetryRequestDetailRow
  extends SafeTelemetryRequestRow {
  error_message: string | null;
}

const RANGE_INTERVALS: Record<TelemetryRequestListQuery["range"], string> = {
  "1h": "1 hour",
  "24h": "24 hours",
  "7d": "7 days",
  "30d": "30 days",
};

export async function listTelemetryRequestsModel(
  query: TelemetryRequestListQuery,
): Promise<{ requests: SafeTelemetryRequestRow[]; total_count: number }> {
  const values = [
    query.project_id,
    RANGE_INTERVALS[query.range],
    query.method ?? null,
    query.status ?? null,
    query.search ?? null,
  ];
  const filters = `
    project_id = $1
    and type = 'http'
    and occurred_at >= now() - $2::interval
    and ($3::text is null or method = $3)
    and ($4::integer is null or status = $4)
    and ($5::text is null or route ilike '%' || $5 || '%')`;
  const offset = (query.page - 1) * query.limit;

  const [requestsResult, countResult] = await Promise.all([
    pool.query<SafeTelemetryRequestRow>(
      `select id::text as id, project_id, occurred_at, method, route, status,
              duration_ms, coalesce(status >= 500, false) as is_error,
              user_id, anonymous_id
       from inflowapm.telemetry_events
       where ${filters}
       order by occurred_at desc, id desc
       limit $6 offset $7`,
      [...values, query.limit, offset],
    ),
    pool.query<{ total_count: number }>(
      `select count(*)::integer as total_count
       from inflowapm.telemetry_events
       where ${filters}`,
      values,
    ),
  ]);

  return {
    requests: requestsResult.rows,
    total_count: countResult.rows[0]?.total_count ?? 0,
  };
}

export async function getTelemetryRequestDetailModel(
  requestId: string,
  ownerId: string,
): Promise<SafeTelemetryRequestDetailRow | null> {
  const result: QueryResult<SafeTelemetryRequestDetailRow> = await pool.query(
    `select t.id::text as id, t.project_id, t.occurred_at, t.method, t.route,
            t.status, t.duration_ms,
            coalesce(t.status >= 500, false) as is_error,
            t.user_id, t.anonymous_id,
            left(nullif(t.metadata->>'error_message', ''), 2000) as error_message
     from inflowapm.telemetry_events t
     join inflowapm.projects p on p.id = t.project_id
     where t.id = $1::bigint
       and t.type = 'http'
       and p.user_id = $2`,
    [requestId, ownerId],
  );

  return result.rows[0] ?? null;
}
