import { Request, Response, NextFunction } from "express";

export const catchAsync = (
  params: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    params(req, res, next).catch(next);
  };
};
