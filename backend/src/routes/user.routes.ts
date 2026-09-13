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
  googleCallbackValidation,
  googleExchangeCodeValidation,
} from "../middlewares/validation.middleware.js";
import { authRateLimit } from "../middlewares/rateLimit.middleware.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import {
  googleLoginController,
  googleCallbackController,
  oauthExchangeController,
} from "../controllers/googleLogin.controller.js";

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

//google login -Oauth
userRouter.get("/google", googleLoginController);

//google callback
userRouter.get(
  "/google/callback",
  googleCallbackValidation,
  googleCallbackController,
);

//google oauth code exchange
userRouter.post(
  "/oauth/exchange",
  googleExchangeCodeValidation,
  oauthExchangeController,
);

export default userRouter;
