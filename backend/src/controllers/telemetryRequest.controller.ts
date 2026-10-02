import type { Request, Response } from "express";

import type { TelemetryRequestListQuery } from "../schemas/telemetryRequest.schema.js";
import {
  getTelemetryRequestDetailService,
  listTelemetryRequestsService,
} from "../services/telemetryRequest.service.js";
import { catchAsync } from "../utils/catchAsync.js";

export const listTelemetryRequestsController = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const query = res.locals.telemetryRequestQuery as TelemetryRequestListQuery;
    const result = await listTelemetryRequestsService(req.user!.id, query);

    res.status(200).json({
      success: true,
      data: result.requests,
      total_count: result.total_count,
      meta: {
        page: query.page,
        limit: query.limit,
        total_pages: Math.ceil(result.total_count / query.limit),
      },
    });
  },
);

export const getTelemetryRequestDetailController = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const requestId = res.locals.telemetryRequestParams.requestId as string;
    const data = await getTelemetryRequestDetailService(
      requestId,
      req.user!.id,
    );
    res.status(200).json({ success: true, data });
  },
);
