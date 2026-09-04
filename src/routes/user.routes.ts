import {
  loginUserController,
  logoutUserController,
  newAccessTokenController,
  registerUserController,
} from "../controllers/user.controller.js";
import Router, { Application } from "express";
import {
  loginUserValidation,
  refreshTokenValidation,
  registerUserValidation,
} from "../middlewares/validation.middleware.js";
import { authRateLimit } from "../middlewares/rateLimit.middleware.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const userRouter: Application = Router();

//for registering user
userRouter.post(
  "/register",
  registerUserValidation,
  authRateLimit,
  registerUserController,
);

//for logging in user
userRouter.post(
  "/login",
  loginUserValidation,
  authRateLimit,
  loginUserController,
);

//for logging out user
userRouter.post("/logout", authMiddleware, logoutUserController);

//for getting new access token
userRouter.post("/refresh", refreshTokenValidation, newAccessTokenController);

export default userRouter;
