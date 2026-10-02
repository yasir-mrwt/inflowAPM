import { z } from "zod";

import { analyticsRangeSchema } from "./analytics.schema.js";

export const MAX_REQUEST_PAGE_SIZE = 100;

export const telemetryRequestListQuerySchema = z.object({
  project_id: z.uuid("Project ID must be a valid UUID"),
  range: analyticsRangeSchema.default("24h"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_REQUEST_PAGE_SIZE)
    .default(20),
  method: z
    .enum(["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"])
    .optional(),
  status: z.coerce.number().int().min(100).max(599).optional(),
  search: z.string().trim().min(1).max(200).optional(),
});

export const telemetryRequestParamsSchema = z.object({
  requestId: z
    .string()
    .regex(/^[1-9]\d{0,18}$/, "Request ID must be a positive integer"),
});

export type TelemetryRequestListQuery = z.infer<
  typeof telemetryRequestListQuerySchema
>;
