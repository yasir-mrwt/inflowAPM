import { z } from "zod";

export const projectSchema = z.object({
  name: z
    .string({ message: "Project workspace name is required" })
    .trim()
    .min(3, "Workspace name cannot be less than 3 characters")
    .max(100, "Workspace name cannot exceed 100 characters"),
});
export type PorjectSchemaContract = z.infer<typeof projectSchema>;

export const querySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val && !isNaN(Number(val)) ? Number(val) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val && !isNaN(Number(val)) ? Number(val) : 10)),
  all: z
    .string()
    .optional()
    .transform((val) => val === "true"),
});
export type QuerySchemaContract = z.infer<typeof querySchema>;

export const projectIdSchema = z.object({
  id: z.uuid("Project ID must be a valid UUID string format").trim(),
});
export type PorjectIdContract = z.infer<typeof projectIdSchema>;
