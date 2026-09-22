import bcrypt from "bcryptjs";
import pool from "../configs/db.js";
import { config } from "../configs/env.js";
import {
  bootstrapSuperAdminModel,
  changeAdminPasswordModel,
  createAdminAuditLog,
  getAdminOverviewModel,
  getAdminProjectModel,
  getAdminUserModel,
  listAdminAuditLogsModel,
  listAdminProjectsModel,
  listAdminUsersModel,
  setAdminProjectStatusModel,
  setAdminUserStatusModel,
} from "../models/admin.model.js";
import { checkUser, saveRefreshToken } from "../models/user.model.js";
import type {
  AdminAuditQuery,
  AdminProjectsQuery,
  AdminUsersQuery,
} from "../schemas/admin.schema.js";
import {
  generateAccessToken,
  generateRefreshToken,
} from "./auth.service.js";
import { AppError } from "../utils/AppError.js";
import { invalidateProjectApiKeyCaches } from "../utils/projectCache.js";
import redisClient from "../utils/redis.js";

export async function bootstrapSuperAdmin(
  email = config.admin_email,
  initialPassword = config.admin_initial_password,
) {
  if (!email && !initialPassword) return null;
  if (!email || !initialPassword) {
    throw new Error("ADMIN_EMAIL and ADMIN_INITIAL_PASSWORD are required together");
  }
  if (initialPassword.length < 8 || initialPassword.length > 100) {
    throw new Error("ADMIN_INITIAL_PASSWORD must be 8 to 100 characters");
  }
  const normalizedEmail = email.trim().toLowerCase();
  const current = await checkUser(normalizedEmail);
  const passwordHash = current?.password ?? (await bcrypt.hash(initialPassword, 10));
  return bootstrapSuperAdminModel(normalizedEmail, passwordHash);
}

export async function adminLoginService(
  email: string,
  password: string,
  ipAddress?: string,
) {
  const user = await checkUser(email);
  const validPassword = Boolean(
    user?.password && (await bcrypt.compare(password, user.password)),
  );

  if (!user || !validPassword) {
    await createAdminAuditLog({
      action: "admin.login.failed",
      targetType: "admin_auth",
      metadata: { reason: "invalid_credentials" },
      ipAddress,
    });
    throw new AppError("Invalid email or password", 401);
  }
  if (user.role !== "super_admin") {
    await createAdminAuditLog({
      adminUserId: user.id,
      action: "admin.login.failed",
      targetType: "admin_auth",
      targetId: user.id,
      metadata: { reason: "insufficient_role" },
      ipAddress,
    });
    throw new AppError("Super admin access is required", 403);
  }
  if (user.status !== "active") {
    await createAdminAuditLog({
      adminUserId: user.id,
      action: "admin.login.failed",
      targetType: "admin_auth",
      targetId: user.id,
      metadata: { reason: "account_suspended" },
      ipAddress,
    });
    throw new AppError("Account is suspended", 403);
  }

  const accessToken = await generateAccessToken(user.id, user.email);
  const refreshToken = await generateRefreshToken(user.id);
  await saveRefreshToken(refreshToken, user.id);
  await createAdminAuditLog({
    adminUserId: user.id,
    action: "admin.login.succeeded",
    targetType: "admin_auth",
    targetId: user.id,
    ipAddress,
  });

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    admin: {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      status: user.status,
      created_at: user.created_at,
    },
  };
}

export async function getAdminMeService(adminId: string) {
  const user = await getAdminUserModel(adminId);
  if (!user) throw new AppError("Admin account not found", 404);
  return user;
}

export const getAdminOverviewService = getAdminOverviewModel;
export const listAdminUsersService = (query: AdminUsersQuery) =>
  listAdminUsersModel(query);
export const listAdminProjectsService = (query: AdminProjectsQuery) =>
  listAdminProjectsModel(query);
export const listAdminAuditLogsService = (query: AdminAuditQuery) =>
  listAdminAuditLogsModel(query);

export async function getAdminUserService(userId: string) {
  const user = await getAdminUserModel(userId);
  if (!user) throw new AppError("User not found", 404);
  return user;
}

export async function updateAdminUserStatusService(
  adminId: string,
  userId: string,
  status: "active" | "suspended",
  ipAddress?: string,
) {
  if (adminId === userId && status === "suspended") {
    throw new AppError("Super admins cannot suspend their own account", 400);
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const previous = await client.query(
      `select status from inflowapm.users where id = $1 for update`,
      [userId],
    );
    if (previous.rowCount === 0) throw new AppError("User not found", 404);
    const user = await setAdminUserStatusModel(userId, status, client);
    await createAdminAuditLog(
      {
        adminUserId: adminId,
        action: status === "suspended" ? "user.suspended" : "user.reactivated",
        targetType: "user",
        targetId: userId,
        metadata: { previous_status: previous.rows[0].status, status },
        ipAddress,
      },
      client,
    );
    await client.query("COMMIT");
    await invalidateProjectApiKeyCaches();
    return user;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getAdminProjectService(projectId: string) {
  const project = await getAdminProjectModel(projectId);
  if (!project) throw new AppError("Project not found", 404);
  return {
    ...project,
    api_key_metadata: { stored_as_hash: true, exposed: false },
  };
}

export async function updateAdminProjectStatusService(
  adminId: string,
  projectId: string,
  status: "active" | "disabled",
  ipAddress?: string,
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const previous = await client.query(
      `select status from inflowapm.projects where id = $1 for update`,
      [projectId],
    );
    if (previous.rowCount === 0) throw new AppError("Project not found", 404);
    const project = await setAdminProjectStatusModel(projectId, status, client);
    await createAdminAuditLog(
      {
        adminUserId: adminId,
        action: status === "disabled" ? "project.disabled" : "project.enabled",
        targetType: "project",
        targetId: projectId,
        metadata: { previous_status: previous.rows[0].status, status },
        ipAddress,
      },
      client,
    );
    await client.query("COMMIT");
    await invalidateProjectApiKeyCaches();
    return project;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function changeAdminPasswordService(
  adminId: string,
  currentPassword: string,
  newPassword: string,
  ipAddress?: string,
) {
  const identity = await getAdminUserModel(adminId);
  if (!identity) throw new AppError("Admin account not found", 404);
  const user = await checkUser(identity.email);
  if (!user?.password || !(await bcrypt.compare(currentPassword, user.password))) {
    throw new AppError("Current password is incorrect", 401);
  }
  const passwordHash = await bcrypt.hash(newPassword, 10);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await changeAdminPasswordModel(adminId, passwordHash, client);
    await createAdminAuditLog(
      {
        adminUserId: adminId,
        action: "admin.password.changed",
        targetType: "admin",
        targetId: adminId,
        ipAddress,
      },
      client,
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function queueHealth(queue: {
  getJobCounts: (...types: ("waiting" | "active" | "failed")[]) => Promise<Record<string, number>>;
}) {
  try {
    const counts = await queue.getJobCounts("waiting", "active", "failed");
    return { status: "UP", ...counts };
  } catch {
    return { status: "DOWN", waiting: 0, active: 0, failed: 0 };
  }
}

export async function getAdminSystemHealthService() {
  const [database, redis] = await Promise.allSettled([
    pool.query("select 1"),
    redisClient.ping(),
  ]);
  const { telemetryIngestionQueue } = await import(
    "../queues/telemetry.queue.js"
  );
  const telemetry = await queueHealth(telemetryIngestionQueue);
  let email: Record<string, unknown> = { status: "DISABLED" };
  if (config.mail_enabled) {
    const { emailQueue } = await import("../queues/email.queue.js");
    email = await queueHealth(emailQueue);
  }
  return {
    api: "UP",
    postgresql: database.status === "fulfilled" ? "UP" : "DOWN",
    redis: redis.status === "fulfilled" ? "UP" : "DOWN",
    queues: { telemetry, email },
    mail_enabled: config.mail_enabled,
    resend_configured: Boolean(config.resend_api_key && config.mail_from),
  };
}

export function getAdminSettingsService() {
  return {
    environment: config.node_env,
    mail_enabled: config.mail_enabled,
    mail_provider_configured: Boolean(config.resend_api_key && config.mail_from),
    google_oauth_configured: Boolean(
      config.google_client_id &&
        config.google_client_secret &&
        config.google_redirect_uri,
    ),
    telemetry_queue_available: true,
  };
}
