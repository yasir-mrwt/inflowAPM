import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import { access } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../../.env") });

const currentEnv = process.env.NODE_ENV || "developement";

const allEnvs = [
  "PORT",
  "DB_PORT",
  "DB_HOST",
  "DB_PASSWORD",
  "DB_NAME",
  "ACCESS_TOKEN_SECRET",
  "REFRESH_TOKEN_SECRET",
  "DB_USER",
  "DATABASE_URL",
  "REDIS_URL",
  "MAIL_HOST",
  "MAIL_PORT",
  "MAIL_USER",
  "MAIL_PASSWORD",
  "MAIL_FROM",
  "CORS_ORIGINS",
];

const refreshToken = process.env.REFRESH_TOKEN_SECRET || "";
const accessToken = process.env.ACCESS_TOKEN_SECRET || "";
for (const element of allEnvs) {
  if (!process.env[element]) {
    throw new Error(
      `envs values are missing please refer to the env file missing value is ${element}`,
    );
  }
}
if (refreshToken.length < 24 || accessToken.length < 24) {
  throw new Error("tokens length cant be less than 24 words");
}
if (refreshToken === accessToken) {
  throw new Error("tokens cant be the same ");
}

let dbHost = process.env.DB_HOST || "postgres";
let dbName = process.env.DB_NAME || "inflowapm_db";
let redisurl = process.env.REDIS_URL || "redis://redis:6379";
let cors_origins = process.env.CORS_ORIGINS || "http://localhost:3000";
if (currentEnv === "test") {
  dbHost = "postgres";
  dbName = "inflowapm_db";
  redisurl = "redis://redis:6379";
}

interface EnvConfiguration {
  port: number | string | undefined;
  db_port: string | undefined;
  db_host: string | undefined;
  db_password: string | undefined;
  db_name: string | undefined;
  db_user: string | undefined;
  db_url: string | undefined;
  redis_url: string | undefined;
  access_token: string | " ";
  refresh_token: string | " ";
  node_env: string;
  mail_host: string | undefined;
  mail_port: string | number | undefined;
  mail_user: string | undefined;
  mail_password: string | undefined;
  mail_from: string | undefined;
  cors_origins: string;
}

export const config: Readonly<EnvConfiguration> = {
  port: process.env.PORT,
  db_port: process.env.DB_PORT,
  db_host: dbHost,
  db_password: process.env.DB_PASSWORD,
  db_name: dbName,
  db_user: process.env.DB_USER,
  db_url: process.env.DB_URL,
  redis_url: redisurl,
  access_token: accessToken,
  refresh_token: refreshToken,
  node_env: currentEnv,
  mail_host: process.env.MAIL_HOST,
  mail_port: process.env.MAIL_PORT,
  mail_user: process.env.MAIL_USER,
  mail_password: process.env.MAIL_PASSWORD,
  mail_from: process.env.MAIL_FROM,
  cors_origins: process.env.CORS_ORIGINS || "http://localhost:3000",
};
