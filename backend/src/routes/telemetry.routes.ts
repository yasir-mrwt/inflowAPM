import Router, { Application } from "express";
import { ingestAuthMiddleware } from "../middlewares/ingestAuth.middleware.js";
import { telemetryValidation } from "../middlewares/validation.middleware.js";
import { createTelemetryController } from "../controllers/telemetry.controller.js";
import { telemetryRateLimit } from "../middlewares/rateLimit.middleware.js";

const telemetryRouter: Application = Router();

telemetryRouter.post(
  "/ingest",
  ingestAuthMiddleware,
  telemetryRateLimit,
  telemetryValidation,
  createTelemetryController,
);

export default telemetryRouter;
