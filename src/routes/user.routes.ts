import {
  loginUserController,
  logoutUserController,
  registerUserController,
} from "../controllers/user.controller.js";
import app from "../app.js";
import Router, { Application } from "express";
import {
  loginUserValidation,
  registerUserValidation,
} from "../middlewares/validation.middleware.js";
import { authRateLimit } from "../middlewares/rateLimit.middleware.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const userRouter: Application = Router();

userRouter.post(
  "/register",
  registerUserValidation,
  authRateLimit,
  registerUserController,
);
userRouter.post(
  "/login",
  loginUserValidation,
  authRateLimit,
  loginUserController,
);
userRouter.post("/logout", authMiddleware, logoutUserController);

export default userRouter;
