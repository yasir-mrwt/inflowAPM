import Router, { Application } from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { overViewAnalyticsController } from "../controllers/analytics.controller.js";
import { analyticsDashboardQueryValidation } from "../middlewares/validation.middleware.js";

const analyticsRouter: Application = Router();

analyticsRouter.get(
  "/dashboard",
  authMiddleware,
  analyticsDashboardQueryValidation,
  overViewAnalyticsController,
);

export default analyticsRouter;
