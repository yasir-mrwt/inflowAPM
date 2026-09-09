import { Request, Response, NextFunction } from "express";
import { catchAsync } from "../utils/catchAsync.js";
import { getMasterDashboardAnalyticsService } from "../services/analytics.service.js";
import { AppError } from "../utils/AppError.js";
import { searchProjectByProjectIdModel } from "../models/project.model.js";

//controller for all services at once
export const overViewAnalyticsController = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { project_id, range } = res.locals.analyticsQuery;

    const project = await searchProjectByProjectIdModel(project_id);

    if (!project) {
      return next(new AppError("no project found with this given id", 404));
    }

    if (project.user_id !== req.user?.id) {
      return next(
        new AppError(
          "You are not authorized to view this project's analytics",
          403,
        ),
      );
    }

    const result = await getMasterDashboardAnalyticsService(
      project_id,
      range,
    );

    res.status(200).json({
      success: true,
      message: "Master dashboard metrics package compiled successfully",
      data: result,
    });
  },
);
