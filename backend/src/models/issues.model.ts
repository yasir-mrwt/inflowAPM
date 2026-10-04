import pool from "../configs/db.js";
import type {
  IssueDetailQuery,
  IssuesListQuery,
} from "../schemas/issues.schema.js";

export interface IssueSummaryRow {
  issue_id: string;
  error_type: string;
  message: string | null;
  route: string | null;
  status: number | null;
  occurrence_count: number;
  first_seen: Date;
  last_seen: Date;
  affected_identity_count: number;
  affected_user_count: number;
  affected_anonymous_count: number;
}

export interface IssueOccurrenceRow {
  id: string;
  type: "http" | "event";
  occurred_at: Date;
  method: string | null;
  route: string | null;
  status: number | null;
  duration_ms: number | null;
  error_message: string | null;
  user_id: string | null;
  anonymous_id: string | null;
}

const RANGE_INTERVALS: Record<IssuesListQuery["range"], string> = {
  "1h": "1 hour",
  "24h": "24 hours",
  "7d": "7 days",
  "30d": "30 days",
};

const NORMALIZED_ERRORS_CTE = `
  with normalized_errors as (
    select t.id, t.type, t.occurred_at, t.method, t.route, t.status,
           t.duration_ms, t.metadata, t.user_id, t.anonymous_id,
           case
             when t.type = 'http' then 'http:' || t.status::text
             else 'event:error'
           end as error_key,
           case
             when t.type = 'http' then 'HTTP ' || t.status::text
             else 'Application error'
           end as error_type,
           regexp_replace(btrim(lower(coalesce(t.metadata->>'error_message', ''))), '\\s+', ' ', 'g') as normalized_message,
           regexp_replace(btrim(lower(coalesce(t.route, ''))), '\\s+', ' ', 'g') as normalized_route
    from inflowapm.telemetry_events t
    where t.project_id = $1
      and t.occurred_at >= now() - $2::interval
      and ((t.type = 'http' and t.status >= 500)
        or (t.type = 'event' and t.route = 'error'))
  ), fingerprinted_errors as (
    select *, encode(
      digest(concat_ws(chr(31), 'v1', error_key, normalized_message, normalized_route), 'sha256'),
      'hex'
    ) as issue_id
    from normalized_errors
  )`;

const ISSUE_SUMMARY_COLUMNS = `
  issue_id,
  error_type,
  nullif(normalized_message, '') as message,
  nullif(normalized_route, '') as route,
  status,
  count(*)::integer as occurrence_count,
  min(occurred_at) as first_seen,
  max(occurred_at) as last_seen,
  count(distinct case
    when user_id is not null then 'user:' || user_id
    when anonymous_id is not null then 'anonymous:' || anonymous_id
  end)::integer as affected_identity_count,
  count(distinct user_id)::integer as affected_user_count,
  count(distinct anonymous_id) filter (where user_id is null)::integer as affected_anonymous_count`;

const ISSUE_GROUP_COLUMNS = `
  issue_id, error_type, normalized_message, normalized_route, status`;

export async function listIssuesModel(
  query: IssuesListQuery,
): Promise<{ issues: IssueSummaryRow[]; total_count: number }> {
  const values = [
    query.project_id,
    RANGE_INTERVALS[query.range],
    query.search ?? null,
  ];
  const searchFilter = `
    ($3::text is null
      or normalized_message ilike '%' || $3 || '%'
      or normalized_route ilike '%' || $3 || '%'
      or error_type ilike '%' || $3 || '%')`;
  const offset = (query.page - 1) * query.limit;

  const [issuesResult, countResult] = await Promise.all([
    pool.query<IssueSummaryRow>(
      `${NORMALIZED_ERRORS_CTE}
       select ${ISSUE_SUMMARY_COLUMNS}
       from fingerprinted_errors
       where ${searchFilter}
       group by ${ISSUE_GROUP_COLUMNS}
       order by last_seen desc, issue_id asc
       limit $4 offset $5`,
      [...values, query.limit, offset],
    ),
    pool.query<{ total_count: number }>(
      `${NORMALIZED_ERRORS_CTE}
       select count(*)::integer as total_count
       from (
         select issue_id
         from fingerprinted_errors
         where ${searchFilter}
         group by issue_id
       ) grouped_issues`,
      values,
    ),
  ]);

  return {
    issues: issuesResult.rows,
    total_count: countResult.rows[0]?.total_count ?? 0,
  };
}

export async function getIssueDetailModel(
  issueId: string,
  query: IssueDetailQuery,
): Promise<{
  issue: IssueSummaryRow | null;
  occurrences: IssueOccurrenceRow[];
}> {
  const interval = RANGE_INTERVALS[query.range];
  const offset = (query.page - 1) * query.limit;
  const [summaryResult, occurrencesResult] = await Promise.all([
    pool.query<IssueSummaryRow>(
      `${NORMALIZED_ERRORS_CTE}
       select ${ISSUE_SUMMARY_COLUMNS}
       from fingerprinted_errors
       where issue_id = $3
       group by ${ISSUE_GROUP_COLUMNS}`,
      [query.project_id, interval, issueId],
    ),
    pool.query<IssueOccurrenceRow>(
      `${NORMALIZED_ERRORS_CTE}
       select id::text as id, type, occurred_at, method, route, status,
              duration_ms,
              left(nullif(metadata->>'error_message', ''), 2000) as error_message,
              user_id, anonymous_id
       from fingerprinted_errors
       where issue_id = $3
       order by occurred_at desc, id desc
       limit $4 offset $5`,
      [query.project_id, interval, issueId, query.limit, offset],
    ),
  ]);

  return {
    issue: summaryResult.rows[0] ?? null,
    occurrences: occurrencesResult.rows,
  };
}
