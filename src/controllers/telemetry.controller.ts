import { Request, Response, NextFunction } from "express";
import { createTelemetryService } from "../services/telemetry.service.js";
import { catchAsync } from "../utils/catchAsync.js";

//create telemetry controller to pass the correct response to user
export const createTelemetryController = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const project_id = (req as any).project.id;
    const validateBatchArray = req.body;

    await createTelemetryService(project_id, validateBatchArray);

    //202 response to user thats his data is written but its actually being processed in background
    res.status(202).json({
      success: true,
      message: `Telemetry batch of ${req.body.length} events accepted for processing`,
    });
  },
);
