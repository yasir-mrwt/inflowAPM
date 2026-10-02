import Router, { Application } from "express";
import { ingestAuthMiddleware } from "../middlewares/ingestAuth.middleware.js";
import { createTelemetryController } from "../controllers/telemetry.controller.js";
import { telemetryRateLimit } from "../middlewares/rateLimit.middleware.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import {
  telemetryRequestListQueryValidation,
  telemetryRequestParamsValidation,
  telemetryValidation,
} from "../middlewares/validation.middleware.js";
import {
  getTelemetryRequestDetailController,
  listTelemetryRequestsController,
} from "../controllers/telemetryRequest.controller.js";

const telemetryRouter: Application = Router();

telemetryRouter.post(
  "/ingest",
  ingestAuthMiddleware,
  telemetryRateLimit,
  telemetryValidation,
  createTelemetryController,
);

telemetryRouter.get(
  "/requests",
  authMiddleware,
  telemetryRequestListQueryValidation,
  listTelemetryRequestsController,
);

telemetryRouter.get(
  "/requests/:requestId",
  authMiddleware,
  telemetryRequestParamsValidation,
  getTelemetryRequestDetailController,
);

export default telemetryRouter;
