import { NextFunction, Request, Response } from "express";
import {
  adminAuditQuerySchema,
  adminChangePasswordSchema,
  adminLoginSchema,
  adminProjectIdSchema,
  adminProjectsQuerySchema,
  adminProjectStatusSchema,
  adminUserIdSchema,
  adminUsersQuerySchema,
  adminUserStatusSchema,
} from "../schemas/admin.schema.js";

type Source = "body" | "params" | "query";

function validate(schema: { safeParse: (value: unknown) => any }, source: Source) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);
    if (!result.success) return next(result.error);
    if (source === "query") res.locals.adminQuery = result.data;
    else if (source === "body") req.body = result.data;
    else Object.assign(req.params, result.data);
    next();
  };
}

export const adminLoginValidation = validate(adminLoginSchema, "body");
export const adminChangePasswordValidation = validate(
  adminChangePasswordSchema,
  "body",
);
export const adminUsersQueryValidation = validate(
  adminUsersQuerySchema,
  "query",
);
export const adminProjectsQueryValidation = validate(
  adminProjectsQuerySchema,
  "query",
);
export const adminAuditQueryValidation = validate(
  adminAuditQuerySchema,
  "query",
);
export const adminUserIdValidation = validate(adminUserIdSchema, "params");
export const adminProjectIdValidation = validate(
  adminProjectIdSchema,
  "params",
);
export const adminUserStatusValidation = validate(
  adminUserStatusSchema,
  "body",
);
export const adminProjectStatusValidation = validate(
  adminProjectStatusSchema,
  "body",
);
