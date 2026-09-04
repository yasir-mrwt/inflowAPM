import Router, { Application } from "express";
import {
  getProjectByQueryValidation,
  projectCreationValidation,
  projectIdValidation,
} from "../middlewares/validation.middleware.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import {
  createProjectController,
  deleteProjectController,
  searchProjctByUserIdController,
} from "../controllers/project.controller.js";

const projectRouter: Application = Router();

projectRouter.use(authMiddleware);

//for creating project
projectRouter.post("/", projectCreationValidation, createProjectController);

//for getting projects
projectRouter.get(
  "/",
  getProjectByQueryValidation,
  searchProjctByUserIdController,
);

//for deleting projects
projectRouter.delete("/:id", projectIdValidation, deleteProjectController);

export default projectRouter;
