import app from "../app.js";
import Router, { Application } from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { overViewAnalyticsController } from "../controllers/analytics.controller.js";

const analyticsRouter: Application = Router();

analyticsRouter.get("/dashboard", authMiddleware, overViewAnalyticsController);

export default analyticsRouter;
