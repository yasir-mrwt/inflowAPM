import { z } from "zod";

import { analyticsRangeSchema } from "./analytics.schema.js";

const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};

export const issuesListQuerySchema = z.object({
  project_id: z.uuid("Project ID must be a valid UUID"),
  range: analyticsRangeSchema.default("24h"),
  ...pagination,
  search: z.string().trim().min(1).max(200).optional(),
});

export const issueDetailQuerySchema = z.object({
  project_id: z.uuid("Project ID must be a valid UUID"),
  range: analyticsRangeSchema.default("24h"),
  page: pagination.page,
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const issueParamsSchema = z.object({
  issueId: z
    .string()
    .regex(/^[a-f0-9]{64}$/, "Issue ID must be a SHA-256 fingerprint"),
});

export type IssuesListQuery = z.infer<typeof issuesListQuerySchema>;
export type IssueDetailQuery = z.infer<typeof issueDetailQuerySchema>;
