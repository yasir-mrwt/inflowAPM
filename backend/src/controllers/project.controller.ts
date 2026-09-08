import {
  createProjectService,
  deleteProjectService,
  searchProjectByUserIdService,
} from "../services/project.service.js";
import { Response, NextFunction, Request } from "express";
import { AppError } from "../utils/AppError.js";
import { catchAsync } from "../utils/catchAsync.js";

//create project controller to pass the correct response to user on success or give error if any
export const createProjectController = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      throw next(
        new AppError("user not authenticated to create a project ", 401),
      );
    }
    const user_id = req.user.id;
    const name = req.body.name;
    const result = await createProjectService(name, user_id);
    res.status(201).json({
      success: true,
      message: `project created by user with id: ${user_id}`,
      data: result,
    });
  },
);

//create controller to search for project under a specific user id
export const searchProjctByUserIdController = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      return next(
        new AppError("user not authenticated to create a project ", 401),
      );
    }
    const { all: fetchAll, page, limit } = res.locals.projectQuery;

    const actualPage = fetchAll ? 1 : page;
    const actualLimit = fetchAll ? 100000 : limit;

    const offset = (actualPage - 1) * actualLimit;
    const result = await searchProjectByUserIdService(
      req.user.id,
      actualLimit,
      offset,
    );
    res.status(200).json({
      success: true,
      message: `here are all the projects listed under user id:${req.user.id}`,
      total_count: result.total_count,
      meta: {
        pagination: !fetchAll,
        ...(fetchAll ? {} : { current_page: page, page_limit: limit }),
      },
      data: result.projects, // Sends only the clean, safe array list to the client
    });
  },
);

//create controller to delete project
export async function deleteProjectController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (!req.user) {
    return next(new AppError("unauthenticated users cant delete post", 401));
  }
  const result = await deleteProjectService(
    req.params.id as string,
    req.user.id,
  );
  res.status(200).json({
    success: true,
    message: `$project id:{req.params.id} has been deleted successfully`,
    data: result,
  });
}
