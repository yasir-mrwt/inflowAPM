import { z } from "zod";

export const projectSchema = z.object({
  name: z
    .string({ message: "Project workspace name is required" })
    .trim()
    .min(3, "Workspace name cannot be less than 3 characters")
    .max(100, "Workspace name cannot exceed 100 characters"),
});
export type PorjectSchemaContract = z.infer<typeof projectSchema>;

export const MAX_PROJECT_PAGE_SIZE = 100;

export const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_PROJECT_PAGE_SIZE)
    .default(10),
  all: z
    .enum(["true", "false"])
    .default("false")
    .transform((val) => val === "true"),
});
export type QuerySchemaContract = z.infer<typeof querySchema>;

export const projectIdSchema = z.object({
  id: z.uuid("Project ID must be a valid UUID string format").trim(),
});
export type PorjectIdContract = z.infer<typeof projectIdSchema>;
