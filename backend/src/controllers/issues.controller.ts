import type { Request, Response } from "express";

import type {
  IssueDetailQuery,
  IssuesListQuery,
} from "../schemas/issues.schema.js";
import {
  getIssueDetailService,
  listIssuesService,
} from "../services/issues.service.js";
import { catchAsync } from "../utils/catchAsync.js";

export const listIssuesController = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const query = res.locals.issuesQuery as IssuesListQuery;
    const result = await listIssuesService(req.user!.id, query);
    res.status(200).json({
      success: true,
      data: result.issues,
      total_count: result.total_count,
      meta: {
        page: query.page,
        limit: query.limit,
        total_pages: Math.ceil(result.total_count / query.limit),
      },
    });
  },
);

export const getIssueDetailController = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const query = res.locals.issueDetailQuery as IssueDetailQuery;
    const issueId = res.locals.issueParams.issueId as string;
    const result = await getIssueDetailService(issueId, req.user!.id, query);
    res.status(200).json({
      success: true,
      data: {
        issue: result.issue,
        occurrences: result.occurrences,
      },
      meta: {
        page: query.page,
        limit: query.limit,
        total_pages: Math.ceil(result.issue.occurrence_count / query.limit),
      },
    });
  },
);
