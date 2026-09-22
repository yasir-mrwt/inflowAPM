import Router from "express";
import {
  adminAuditLogsController,
  adminChangePasswordController,
  adminLoginController,
  adminMeController,
  adminOverviewController,
  adminProjectDetailController,
  adminProjectsController,
  adminProjectStatusController,
  adminSettingsController,
  adminSystemHealthController,
  adminUserDetailController,
  adminUsersController,
  adminUserStatusController,
} from "../controllers/admin.controller.js";
import { requireAdmin } from "../middlewares/admin.middleware.js";
import {
  adminAuditQueryValidation,
  adminChangePasswordValidation,
  adminLoginValidation,
  adminProjectIdValidation,
  adminProjectsQueryValidation,
  adminProjectStatusValidation,
  adminUserIdValidation,
  adminUsersQueryValidation,
  adminUserStatusValidation,
} from "../middlewares/adminValidation.middleware.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { adminAuthRateLimit } from "../middlewares/rateLimit.middleware.js";

const adminRouter = Router();

adminRouter.post(
  "/auth/login",
  adminAuthRateLimit,
  adminLoginValidation,
  adminLoginController,
);

adminRouter.use(authMiddleware, requireAdmin);

adminRouter.get("/auth/me", adminMeController);
adminRouter.post(
  "/auth/change-password",
  adminChangePasswordValidation,
  adminChangePasswordController,
);
adminRouter.get("/overview", adminOverviewController);
adminRouter.get("/users", adminUsersQueryValidation, adminUsersController);
adminRouter.get(
  "/users/:userId",
  adminUserIdValidation,
  adminUserDetailController,
);
adminRouter.patch(
  "/users/:userId/status",
  adminUserIdValidation,
  adminUserStatusValidation,
  adminUserStatusController,
);
adminRouter.get(
  "/projects",
  adminProjectsQueryValidation,
  adminProjectsController,
);
adminRouter.get(
  "/projects/:projectId",
  adminProjectIdValidation,
  adminProjectDetailController,
);
adminRouter.patch(
  "/projects/:projectId/status",
  adminProjectIdValidation,
  adminProjectStatusValidation,
  adminProjectStatusController,
);
adminRouter.get(
  "/audit-logs",
  adminAuditQueryValidation,
  adminAuditLogsController,
);
adminRouter.get("/system/health", adminSystemHealthController);
adminRouter.get("/settings", adminSettingsController);

export default adminRouter;
