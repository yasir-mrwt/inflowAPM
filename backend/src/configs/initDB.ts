import pool from "./db.js";

export async function initializedDB(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtext('inflowapm_schema_init_v1'));",
    );
    await client.query(`create extension if not exists pgcrypto;`);

    //creating inflowapm database
    await client.query(`create schema if not exists inflowapm;`);

    //user table
    await client.query(`create table if not exists inflowapm.users(
        id uuid primary key default gen_random_uuid(),
        email text not null unique,
        first_name varchar(100) not null,
        last_name varchar(100) not null,
        password text,
        refresh_token text  default null,
        role text default 'user',
        status text not null default 'active',
        created_at timestamp default current_timestamp
        );`);

    await client.query(`
      alter table inflowapm.users
      add column if not exists status text not null default 'active';
    `);

    //project information table
    await client.query(`create table if not exists inflowapm.projects(
            id uuid primary key default gen_random_uuid(),
            name varchar(100) not null,
            api_key varchar(64) unique not null,
            user_id uuid not null references inflowapm.users(id) on delete cascade,
            status text not null default 'active',
            created_at timestamp with time zone not null default current_timestamp 
            );`);

    await client.query(`
      alter table inflowapm.projects
      add column if not exists status text not null default 'active';
    `);

    // Enforce valid lifecycle values for all new writes without making the
    // idempotent startup migration destructive to any legacy rows.
    await client.query(`
      do $$ begin
        if not exists (
          select 1 from pg_constraint
          where conname = 'users_role_valid' and conrelid = 'inflowapm.users'::regclass
        ) then
          alter table inflowapm.users add constraint users_role_valid
            check (role in ('user', 'super_admin')) not valid;
        end if;
        if not exists (
          select 1 from pg_constraint
          where conname = 'users_status_valid' and conrelid = 'inflowapm.users'::regclass
        ) then
          alter table inflowapm.users add constraint users_status_valid
            check (status in ('active', 'suspended')) not valid;
        end if;
        if not exists (
          select 1 from pg_constraint
          where conname = 'projects_status_valid' and conrelid = 'inflowapm.projects'::regclass
        ) then
          alter table inflowapm.projects add constraint projects_status_valid
            check (status in ('active', 'disabled')) not valid;
        end if;
      end $$;
    `);

    //telemetry events table
    await client.query(`create table if not exists inflowapm.telemetry_events (
    id bigint generated always as identity primary key,
    project_id uuid not null references inflowapm.projects(id) on delete cascade,
    type varchar(50) not null,
    route text,
    method varchar(10),
    status integer,
    duration_ms double precision,
    metadata jsonb not null default '{}'::jsonb,

    user_id varchar(255),       
    anonymous_id varchar(255), 
    email text,                
    ip varchar(45),           
    
    occurred_at timestamptz not null,
    ingested_at timestamptz not null default current_timestamp
);
`);

    //table to store token details for reset password
    await client.query(`
  create table if not exists inflowapm.reset_password_tokens (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references inflowapm.users(id) on delete cascade,
      token_hash varchar(255) not null unique,
      expires_at timestamp with time zone not null,
      used_at timestamp with time zone null,
      created_at timestamp with time zone default current_timestamp
  );
`);

    //table for Oauth login bridge with user table
    await client.query(`
  CREATE TABLE IF NOT EXISTS inflowapm.oauth_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL
    REFERENCES inflowapm.users(id)
    ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  provider_user_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(provider, provider_user_id),
  UNIQUE(user_id, provider)
);`);

    await client.query(`
      create table if not exists inflowapm.admin_audit_logs (
        id bigint generated always as identity primary key,
        admin_user_id uuid references inflowapm.users(id) on delete set null,
        action varchar(100) not null,
        target_type varchar(50),
        target_id text,
        metadata jsonb not null default '{}'::jsonb,
        ip_address varchar(45),
        created_at timestamptz not null default current_timestamp
      );
    `);

    // OAuth-created users initially have no local password.
    await client.query(`
  ALTER TABLE inflowapm.users
  ALTER COLUMN password DROP NOT NULL;
`);

    // Crucial High-Scale Performance Indexes
    await client.query(
      `create index if not exists idx_telemetry_query_feed on inflowapm.telemetry_events(project_id, occurred_at desc);`,
    );

    await client.query(
      `create index if not exists idx_telemetry_aggregation on inflowapm.telemetry_events(project_id,route,occurred_at desc);`,
    );
    await client.query(
      `create index if not exists idx_telemetry_admin_recent on inflowapm.telemetry_events(occurred_at desc);`,
    );
    await client.query(
      `create index if not exists idx_telemetry_admin_recent_errors on inflowapm.telemetry_events(occurred_at desc) where status >= 500;`,
    );

    await client.query(
      `create index if not exists idx_users_admin_list on inflowapm.users(status, role, created_at desc);`,
    );
    await client.query(
      `create index if not exists idx_projects_admin_list on inflowapm.projects(status, created_at desc);`,
    );
    await client.query(
      `create index if not exists idx_admin_audit_logs_created on inflowapm.admin_audit_logs(created_at desc, id desc);`,
    );
    await client.query(
      `create index if not exists idx_admin_audit_logs_action on inflowapm.admin_audit_logs(action, created_at desc);`,
    );

    await client.query("COMMIT");

    console.log(
      "InflowAPM Database layers initialized completely successfully!",
    );
  } catch (error: unknown) {
    await client.query("ROLLBACK").catch(() => undefined);
    console.error(
      "❌ CRITICAL ERROR during database cluster setup migration sequence:",
      error,
    );
    throw error;
  } finally {
    client.release();
  }
}
