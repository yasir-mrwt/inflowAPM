import { z } from "zod";

export const analyticsDashboardQuerySchema = z.object({
  project_id: z.uuid("Project ID must be a valid UUID"),
  range: z.enum(["1h", "24h", "7d", "30d"]).default("24h"),
});

export type AnalyticsDashboardQuery = z.infer<
  typeof analyticsDashboardQuerySchema
>;
