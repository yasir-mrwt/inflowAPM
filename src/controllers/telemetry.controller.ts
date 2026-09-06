import { Request, Response, NextFunction } from "express";
import { createTelemetryService } from "../services/telemetry.service.js";
import { catchAsync } from "../utils/catchAsync.js";

//create telemetry controller to pass the correct response to user
export const createTelemetryController = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const project_id = (req as any).project.id;
    const validateBatchArray = req.body;

    await createTelemetryService(project_id, validateBatchArray);

    res.status(201).json({
      success: true,
      message: `Successfully ingested telemetry batch matrix of ${req.body.length} events`,
    });
  },
);
