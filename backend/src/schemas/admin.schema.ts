import { z } from "zod";

const paginationFields = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional().default(""),
};

export const adminLoginSchema = z.object({
  email: z.email().transform((value) => value.trim().toLowerCase()),
  password: z.string().min(5).max(100),
});

export const adminChangePasswordSchema = z
  .object({
    current_password: z.string().min(5).max(100),
    new_password: z.string().min(8).max(100),
  })
  .refine((value) => value.current_password !== value.new_password, {
    message: "New password must be different from the current password",
    path: ["new_password"],
  });

export const adminUsersQuerySchema = z.object({
  ...paginationFields,
  status: z.enum(["active", "suspended"]).optional(),
  role: z.enum(["user", "super_admin"]).optional(),
});

export const adminProjectsQuerySchema = z.object({
  ...paginationFields,
  status: z.enum(["active", "disabled"]).optional(),
});

export const adminAuditQuerySchema = z.object({
  page: paginationFields.page,
  limit: paginationFields.limit,
  action: z.string().trim().max(100).optional(),
});

export const adminUserIdSchema = z.object({ userId: z.uuid() });
export const adminProjectIdSchema = z.object({ projectId: z.uuid() });
export const adminUserStatusSchema = z.object({
  status: z.enum(["active", "suspended"]),
});
export const adminProjectStatusSchema = z.object({
  status: z.enum(["active", "disabled"]),
});

export type AdminUsersQuery = z.infer<typeof adminUsersQuerySchema>;
export type AdminProjectsQuery = z.infer<typeof adminProjectsQuerySchema>;
export type AdminAuditQuery = z.infer<typeof adminAuditQuerySchema>;
