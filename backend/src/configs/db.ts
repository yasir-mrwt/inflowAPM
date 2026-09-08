import { config } from "./env.js"
import pg from "pg";

export const pool = new pg.Pool({
    port: Number(config.db_port),
    user: config.db_user,
    password: config.db_password,
    host: config.db_host,
    database:config.db_name
})

export default pool;