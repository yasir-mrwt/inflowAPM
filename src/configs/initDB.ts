import pool from "./db.js";

export async function initializedDB(): Promise<void> {
  try {
    await pool.query(`create extension if not exists pgcrypto;`);

    //creating inflowapm database
    await pool.query(`create schema if not exists inflowapm;`);

    //user table
    await pool.query(`create table if not exists inflowapm.users(
        id uuid primary key default gen_random_uuid(),
        email text not null unique,
        first_name varchar(100) not null,
        last_name varchar(100) not null,
        password text not null,
        refresh_token text  default null,
        role text default 'user',
        created_at timestamp default current_timestamp
        );`);

    //project information table
    await pool.query(`create table if not exists inflowapm.projects(
            id uuid primary key default gen_random_uuid(),
            name varchar(100) not null,
            api_key varchar(64) unique not null,
            user_id uuid not null references inflowapm.users(id) on delete cascade,
            created_at timestamp with time zone not null default current_timestamp 
            );`);

    //telemetry events table
    await pool.query(`create table if not exists inflowapm.telemetry_events (
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

    // Crucial High-Scale Performance Indexes
    await pool.query(
      `create index if not exists idx_telemetry_query_feed on inflowapm.telemetry_events(project_id, occurred_at desc);`,
    );

    await pool.query(
      `create index if not exists idx_telemetry_aggregation on inflowapm.telemetry_events(project_id,route,occurred_at desc);`,
    );

    console.log(
      "InflowAPM Database layers initialized completely successfully!",
    );
  } catch (error: unknown) {
    console.error(
      "❌ CRITICAL ERROR during database cluster setup migration sequence:",
      error,
    );
    throw error;
  }
}
