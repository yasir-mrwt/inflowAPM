import { config } from "./env.js";
import pg from "pg";

export const pool = new pg.Pool({
  connectionString: config.db_url,
});

export default pool;
