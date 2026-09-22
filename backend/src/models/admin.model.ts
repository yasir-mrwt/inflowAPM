import type { PoolClient } from "pg";
import pool from "../configs/db.js";
import type {
  AdminAuditQuery,
  AdminProjectsQuery,
  AdminUsersQuery,
} from "../schemas/admin.schema.js";

export interface AuditEntryInput {
  adminUserId?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
}

export async function createAdminAuditLog(
  input: AuditEntryInput,
  client?: PoolClient,
): Promise<void> {
  const runner = client ?? pool;
  await runner.query(
    `insert into inflowapm.admin_audit_logs
      (admin_user_id, action, target_type, target_id, metadata, ip_address)
     values ($1, $2, $3, $4, $5::jsonb, $6)`,
    [
      input.adminUserId ?? null,
      input.action,
      input.targetType ?? null,
      input.targetId ?? null,
      JSON.stringify(input.metadata ?? {}),
      input.ipAddress?.slice(0, 45) ?? null,
    ],
  );
}

export async function bootstrapSuperAdminModel(
  email: string,
  passwordHash: string,
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "select pg_advisory_xact_lock(hashtext('inflowapm_super_admin_bootstrap'))",
    );
    const existing = await client.query<{
      id: string;
      email: string;
      role: string;
      status: string;
      password: string | null;
    }>(
      `select id, email, role, status, password
       from inflowapm.users where email = $1 for update`,
      [email],
    );

    let created = false;
    let promoted = false;
    let passwordInitialized = false;
    let user;

    if (existing.rowCount === 0) {
      const inserted = await client.query(
        `insert into inflowapm.users
          (email, password, first_name, last_name, role, status)
         values ($1, $2, 'Super', 'Admin', 'super_admin', 'active')
         returning id, email, first_name, last_name, role, status, created_at`,
        [email, passwordHash],
      );
      user = inserted.rows[0];
      created = true;
      passwordInitialized = true;
    } else {
      const current = existing.rows[0];
      promoted = current.role !== "super_admin";
      passwordInitialized = current.password === null;
      const updated = await client.query(
        `update inflowapm.users
         set role = 'super_admin',
             password = case when password is null then $2 else password end
         where id = $1
         returning id, email, first_name, last_name, role, status, created_at`,
        [current.id, passwordHash],
      );
      user = updated.rows[0];
    }

    await client.query("COMMIT");
    return { user, created, promoted, passwordInitialized };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getAdminOverviewModel() {
  const result = await pool.query(`
    select
      (select count(*)::int from inflowapm.users) as total_users,
      (select count(*)::int from inflowapm.users where created_at >= now() - interval '24 hours') as new_users_24h,
      (select count(*)::int from inflowapm.projects) as total_projects,
      (select count(*)::int from inflowapm.projects where status = 'active') as active_projects,
      (select count(*)::int from inflowapm.telemetry_events) as total_telemetry_events,
      (select count(*)::int from inflowapm.telemetry_events where occurred_at >= now() - interval '24 hours') as telemetry_events_24h,
      (select count(*)::int from inflowapm.telemetry_events where occurred_at >= now() - interval '24 hours' and status >= 500) as server_errors_24h
  `);
  const recentUsers = await pool.query(
    `select id, email, first_name, last_name, role, status, created_at
     from inflowapm.users order by created_at desc, id desc limit 5`,
  );
  const recentProjects = await pool.query(
    `select p.id, p.name, p.status, p.created_at,
            u.id as owner_id, u.email as owner_email
     from inflowapm.projects p join inflowapm.users u on u.id = p.user_id
     order by p.created_at desc, p.id desc limit 5`,
  );
  return {
    ...result.rows[0],
    server_error_rate_24h:
      result.rows[0].telemetry_events_24h === 0
        ? 0
        : Number(
            (
              (result.rows[0].server_errors_24h /
                result.rows[0].telemetry_events_24h) *
              100
            ).toFixed(2),
          ),
    recent_registrations: recentUsers.rows,
    recent_projects: recentProjects.rows,
  };
}

export async function listAdminUsersModel(query: AdminUsersQuery) {
  const offset = (query.page - 1) * query.limit;
  const result = await pool.query(
    `select u.id, u.email, u.first_name, u.last_name, u.role, u.status,
            u.created_at, count(p.id)::int as project_count,
            count(*) over()::int as total_count
     from inflowapm.users u
     left join inflowapm.projects p on p.user_id = u.id
     where ($1 = '' or u.email ilike '%' || $1 || '%'
                      or concat_ws(' ', u.first_name, u.last_name) ilike '%' || $1 || '%')
       and ($2::text is null or u.status = $2)
       and ($3::text is null or u.role = $3)
     group by u.id
     order by u.created_at desc, u.id desc
     limit $4 offset $5`,
    [query.search, query.status ?? null, query.role ?? null, query.limit, offset],
  );
  return {
    users: result.rows.map(({ total_count: _total, ...user }) => user),
    total_count: result.rows[0]?.total_count ?? 0,
  };
}

export async function getAdminUserModel(userId: string) {
  const result = await pool.query(
    `select u.id, u.email, u.first_name, u.last_name, u.role, u.status,
            u.created_at, count(distinct p.id)::int as project_count,
            coalesce(array_agg(distinct oa.provider) filter (where oa.provider is not null), '{}') as auth_providers
     from inflowapm.users u
     left join inflowapm.projects p on p.user_id = u.id
     left join inflowapm.oauth_accounts oa on oa.user_id = u.id
     where u.id = $1
     group by u.id`,
    [userId],
  );
  return result.rows[0] ?? null;
}

export async function setAdminUserStatusModel(
  userId: string,
  status: "active" | "suspended",
  client: PoolClient,
) {
  const result = await client.query(
    `update inflowapm.users set status = $2 where id = $1
     returning id, email, first_name, last_name, role, status, created_at`,
    [userId, status],
  );
  return result.rows[0] ?? null;
}

export async function listAdminProjectsModel(query: AdminProjectsQuery) {
  const offset = (query.page - 1) * query.limit;
  const result = await pool.query(
    `select p.id, p.name, p.status, p.created_at,
            u.id as owner_id, u.email as owner_email,
            count(*) over()::int as total_count
     from inflowapm.projects p join inflowapm.users u on u.id = p.user_id
     where ($1 = '' or p.name ilike '%' || $1 || '%' or u.email ilike '%' || $1 || '%')
       and ($2::text is null or p.status = $2)
     order by p.created_at desc, p.id desc
     limit $3 offset $4`,
    [query.search, query.status ?? null, query.limit, offset],
  );
  return {
    projects: result.rows.map(({ total_count: _total, ...project }) => project),
    total_count: result.rows[0]?.total_count ?? 0,
  };
}

export async function getAdminProjectModel(projectId: string) {
  const result = await pool.query(
    `select p.id, p.name, p.status, p.created_at,
            u.id as owner_id, u.email as owner_email,
            count(t.id)::int as telemetry_event_count,
            count(t.id) filter (where t.status >= 500)::int as server_error_count,
            max(t.occurred_at) as last_activity_at
     from inflowapm.projects p
     join inflowapm.users u on u.id = p.user_id
     left join inflowapm.telemetry_events t on t.project_id = p.id
     where p.id = $1 group by p.id, u.id`,
    [projectId],
  );
  return result.rows[0] ?? null;
}

export async function setAdminProjectStatusModel(
  projectId: string,
  status: "active" | "disabled",
  client: PoolClient,
) {
  const result = await client.query(
    `update inflowapm.projects set status = $2 where id = $1
     returning id, name, user_id, status, created_at`,
    [projectId, status],
  );
  return result.rows[0] ?? null;
}

export async function listAdminAuditLogsModel(query: AdminAuditQuery) {
  const offset = (query.page - 1) * query.limit;
  const result = await pool.query(
    `select l.id, l.action, l.target_type, l.target_id, l.metadata,
            l.ip_address, l.created_at, l.admin_user_id,
            u.email as admin_email,
            count(*) over()::int as total_count
     from inflowapm.admin_audit_logs l
     left join inflowapm.users u on u.id = l.admin_user_id
     where ($1::text is null or l.action = $1)
     order by l.created_at desc, l.id desc
     limit $2 offset $3`,
    [query.action ?? null, query.limit, offset],
  );
  return {
    logs: result.rows.map(({ total_count: _total, ...log }) => log),
    total_count: result.rows[0]?.total_count ?? 0,
  };
}

export async function changeAdminPasswordModel(
  adminId: string,
  passwordHash: string,
  client: PoolClient,
): Promise<void> {
  await client.query(
    `update inflowapm.users set password = $2, refresh_token = null where id = $1`,
    [adminId, passwordHash],
  );
}
