import { config } from "./env.js";
import pg from "pg";

const databaseUrl = new URL(config.db_url);

export const pool = new pg.Pool({
  connectionString: config.db_url,
  enableChannelBinding:
    databaseUrl.searchParams.get("channel_binding") === "require",
});

pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL pool error:", error);
});

export default pool;
