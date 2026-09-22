import type { Request, Response } from "express";
import { catchAsync } from "../utils/catchAsync.js";
import {
  adminLoginService,
  changeAdminPasswordService,
  getAdminMeService,
  getAdminOverviewService,
  getAdminProjectService,
  getAdminSettingsService,
  getAdminSystemHealthService,
  getAdminUserService,
  listAdminAuditLogsService,
  listAdminProjectsService,
  listAdminUsersService,
  updateAdminProjectStatusService,
  updateAdminUserStatusService,
} from "../services/admin.service.js";
import type {
  AdminAuditQuery,
  AdminProjectsQuery,
  AdminUsersQuery,
} from "../schemas/admin.schema.js";

const clientIp = (req: Request) => req.ip || req.socket.remoteAddress;

export const adminLoginController = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const data = await adminLoginService(
      req.body.email,
      req.body.password,
      clientIp(req),
    );
    res.status(200).json({ success: true, data });
  },
);

export const adminMeController = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const data = await getAdminMeService(req.user!.id);
    res.status(200).json({ success: true, data });
  },
);

export const adminChangePasswordController = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    await changeAdminPasswordService(
      req.user!.id,
      req.body.current_password,
      req.body.new_password,
      clientIp(req),
    );
    res.status(200).json({
      success: true,
      message: "Admin password changed and refresh sessions revoked",
    });
  },
);

export const adminOverviewController = catchAsync(
  async (_req: Request, res: Response): Promise<void> => {
    res.status(200).json({
      success: true,
      data: await getAdminOverviewService(),
    });
  },
);

export const adminUsersController = catchAsync(
  async (_req: Request, res: Response): Promise<void> => {
    const query = res.locals.adminQuery as AdminUsersQuery;
    const result = await listAdminUsersService(query);
    res.status(200).json({
      success: true,
      data: result.users,
      total_count: result.total_count,
      meta: { page: query.page, limit: query.limit },
    });
  },
);

export const adminUserDetailController = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    res.status(200).json({
      success: true,
      data: await getAdminUserService(req.params.userId as string),
    });
  },
);

export const adminUserStatusController = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const data = await updateAdminUserStatusService(
      req.user!.id,
      req.params.userId as string,
      req.body.status,
      clientIp(req),
    );
    res.status(200).json({ success: true, data });
  },
);

export const adminProjectsController = catchAsync(
  async (_req: Request, res: Response): Promise<void> => {
    const query = res.locals.adminQuery as AdminProjectsQuery;
    const result = await listAdminProjectsService(query);
    res.status(200).json({
      success: true,
      data: result.projects,
      total_count: result.total_count,
      meta: { page: query.page, limit: query.limit },
    });
  },
);

export const adminProjectDetailController = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    res.status(200).json({
      success: true,
      data: await getAdminProjectService(req.params.projectId as string),
    });
  },
);

export const adminProjectStatusController = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const data = await updateAdminProjectStatusService(
      req.user!.id,
      req.params.projectId as string,
      req.body.status,
      clientIp(req),
    );
    res.status(200).json({ success: true, data });
  },
);

export const adminAuditLogsController = catchAsync(
  async (_req: Request, res: Response): Promise<void> => {
    const query = res.locals.adminQuery as AdminAuditQuery;
    const result = await listAdminAuditLogsService(query);
    res.status(200).json({
      success: true,
      data: result.logs,
      total_count: result.total_count,
      meta: { page: query.page, limit: query.limit },
    });
  },
);

export const adminSystemHealthController = catchAsync(
  async (_req: Request, res: Response): Promise<void> => {
    res.status(200).json({
      success: true,
      data: await getAdminSystemHealthService(),
    });
  },
);

export const adminSettingsController = catchAsync(
  async (_req: Request, res: Response): Promise<void> => {
    res.status(200).json({ success: true, data: getAdminSettingsService() });
  },
);
