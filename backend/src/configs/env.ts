import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.join(__dirname, "../../.env"),
});

const currentEnv = process.env.NODE_ENV || "development";
const isTest = currentEnv === "test";

const requiredEnvs = [
  "PORT",
  "ACCESS_TOKEN_SECRET",
  "REFRESH_TOKEN_SECRET",
  "DATABASE_URL",
  "REDIS_URL",
  "CORS_ORIGINS",
  "MAIL_ENABLED",
  "FRONTEND_URL",
];

if (isTest) {
  requiredEnvs.push("TEST_DATABASE_URL", "TEST_REDIS_URL");
}

const mailEnabled = !isTest && process.env.MAIL_ENABLED !== "false";

if (mailEnabled) {
  requiredEnvs.push(
    "MAIL_HOST",
    "MAIL_PORT",
    "MAIL_USER",
    "MAIL_PASSWORD",
    "MAIL_FROM",
  );
}

for (const env of requiredEnvs) {
  if (!process.env[env]) {
    throw new Error(`Missing environment variable: ${env}`);
  }
}

const refreshToken = process.env.REFRESH_TOKEN_SECRET!;
const accessToken = process.env.ACCESS_TOKEN_SECRET!;

if (refreshToken.length < 24 || accessToken.length < 24) {
  throw new Error("Token secrets must be at least 24 characters");
}

if (refreshToken === accessToken) {
  throw new Error("Access and refresh token secrets cannot be the same");
}

interface EnvConfiguration {
  port: string | undefined;
  db_url: string;
  redis_url: string;

  access_token: string;
  refresh_token: string;

  node_env: string;

  mail_enabled: boolean;
  mail_host: string | undefined;
  mail_port: string | undefined;
  mail_user: string | undefined;
  mail_password: string | undefined;
  mail_from: string | undefined;

  cors_origins: string;
  frontend_url: string;
}

export const config: Readonly<EnvConfiguration> = {
  port: process.env.PORT,
  db_url: isTest ? process.env.TEST_DATABASE_URL! : process.env.DATABASE_URL!,

  redis_url: isTest ? process.env.TEST_REDIS_URL! : process.env.REDIS_URL!,

  access_token: accessToken,
  refresh_token: refreshToken,

  node_env: currentEnv,

  mail_enabled: mailEnabled,
  mail_host: process.env.MAIL_HOST,
  mail_port: process.env.MAIL_PORT,
  mail_user: process.env.MAIL_USER,
  mail_password: process.env.MAIL_PASSWORD,
  mail_from: process.env.MAIL_FROM,

  cors_origins: process.env.CORS_ORIGINS || "http://localhost:3000",
  frontend_url: process.env.FRONTEND_URL || "http://localhost:3000",
};
