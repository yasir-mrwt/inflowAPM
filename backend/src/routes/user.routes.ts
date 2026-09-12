import {
  forgotPasswordController,
  loginUserController,
  logoutUserController,
  newAccessTokenController,
  registerUserController,
  resetPasswordController,
} from "../controllers/user.controller.js";
import Router, { Application } from "express";
import {
  forgotPasswordValidation,
  loginUserValidation,
  refreshTokenValidation,
  registerUserValidation,
  resetPasswordValidation,
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

//forgot password route
userRouter.post(
  "/forgot-password",
  forgotPasswordValidation,
  authRateLimit,
  forgotPasswordController,
);

//reset password route
userRouter.post(
  "/reset-password",
  resetPasswordValidation,
  authRateLimit,
  resetPasswordController,
);

export default userRouter;
