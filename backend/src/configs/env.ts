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
  "NODE_ENV",
  "PORT",
  "ACCESS_TOKEN_SECRET",
  "REFRESH_TOKEN_SECRET",
  "DATABASE_URL",
  "REDIS_URL",
  "CORS_ORIGINS",
  "MAIL_ENABLED",
  "FRONTEND_URL",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_REDIRECT_URI",
  "SESSION_SECRET",
];

if (isTest) {
  requiredEnvs.push("TEST_DATABASE_URL", "TEST_REDIS_URL");
}

if (currentEnv === "production") {
  requiredEnvs.push("ADMIN_EMAIL", "ADMIN_INITIAL_PASSWORD");
}

if (
  Boolean(process.env.ADMIN_EMAIL) !==
  Boolean(process.env.ADMIN_INITIAL_PASSWORD)
) {
  throw new Error(
    "ADMIN_EMAIL and ADMIN_INITIAL_PASSWORD must be configured together",
  );
}

if (
  process.env.ADMIN_INITIAL_PASSWORD &&
  (process.env.ADMIN_INITIAL_PASSWORD.length < 8 ||
    process.env.ADMIN_INITIAL_PASSWORD.length > 100)
) {
  throw new Error("ADMIN_INITIAL_PASSWORD must be 8 to 100 characters");
}

if (
  process.env.ADMIN_EMAIL &&
  !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(process.env.ADMIN_EMAIL)
) {
  throw new Error("ADMIN_EMAIL must be a valid email address");
}

const mailEnabled = !isTest && process.env.MAIL_ENABLED === "true";

if (mailEnabled) {
  requiredEnvs.push("RESEND_API_KEY", "MAIL_FROM");
}

for (const env of requiredEnvs) {
  if (!process.env[env]) {
    throw new Error(`Missing environment variable: ${env}`);
  }
}

if (!["true", "false"].includes(process.env.MAIL_ENABLED!)) {
  throw new Error("MAIL_ENABLED must be either true or false");
}

const port = Number(process.env.PORT);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be a valid TCP port");
}

if (currentEnv === "production") {
  const parseEnvironmentUrl = (name: string): URL => {
    try {
      return new URL(process.env[name]!);
    } catch {
      throw new Error(`${name} must be a valid URL`);
    }
  };

  const databaseUrl = parseEnvironmentUrl("DATABASE_URL");
  const databaseSslMode = databaseUrl.searchParams.get("sslmode");
  if (!["require", "verify-ca", "verify-full"].includes(databaseSslMode ?? "")) {
    throw new Error("DATABASE_URL must enable SSL in production");
  }

  if (parseEnvironmentUrl("REDIS_URL").protocol !== "rediss:") {
    throw new Error("REDIS_URL must use rediss:// in production");
  }

  if (parseEnvironmentUrl("FRONTEND_URL").protocol !== "https:") {
    throw new Error("FRONTEND_URL must use HTTPS in production");
  }

  const googleRedirectUrl = parseEnvironmentUrl("GOOGLE_REDIRECT_URI");
  if (googleRedirectUrl.protocol !== "https:") {
    throw new Error("GOOGLE_REDIRECT_URI must use HTTPS in production");
  }
  if (googleRedirectUrl.pathname !== "/api/v1/auth/google/callback") {
    throw new Error(
      "GOOGLE_REDIRECT_URI must use the Google OAuth callback path",
    );
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
  port: number;
  db_url: string;
  redis_url: string;

  access_token: string;
  refresh_token: string;

  node_env: string;

  mail_enabled: boolean;
  resend_api_key: string | undefined;
  mail_from: string | undefined;

  cors_origins: string;
  frontend_url: string;

  google_client_id: string;
  google_client_secret: string;
  google_redirect_uri: string;
  session_secret: string;
  admin_email: string | undefined;
  admin_initial_password: string | undefined;
}

export const config: Readonly<EnvConfiguration> = {
  port,
  db_url: isTest ? process.env.TEST_DATABASE_URL! : process.env.DATABASE_URL!,

  redis_url: isTest ? process.env.TEST_REDIS_URL! : process.env.REDIS_URL!,

  access_token: accessToken,
  refresh_token: refreshToken,

  node_env: currentEnv,

  mail_enabled: mailEnabled,
  resend_api_key: process.env.RESEND_API_KEY,
  mail_from: process.env.MAIL_FROM,

  cors_origins: process.env.CORS_ORIGINS || "http://localhost:3000",
  frontend_url: process.env.FRONTEND_URL || "http://localhost:3000",

  google_client_id: process.env.GOOGLE_CLIENT_ID!,
  google_client_secret: process.env.GOOGLE_CLIENT_SECRET!,
  google_redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
  session_secret: process.env.SESSION_SECRET!,
  admin_email: process.env.ADMIN_EMAIL?.trim().toLowerCase(),
  admin_initial_password: process.env.ADMIN_INITIAL_PASSWORD,
};
