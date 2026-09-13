import { Request, Response, NextFunction } from "express";
import { catchAsync } from "../utils/catchAsync.js";
import crypto from "node:crypto";
import { googleOAuthClient } from "../configs/googleOAuth.js";
import { AppError } from "../utils/AppError.js";
import { config } from "../configs/env.js";
import {
  createOAuthExchangeCode,
  exchangeOAuthCodeService,
  googleOAuthService,
} from "../services/user.service.js";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../services/auth.service.js";
import { saveRefreshToken } from "../models/user.model.js";

function saveSession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.save((error) => error ? reject(error) : resolve());
  });
}

function statesMatch(received: string, saved: string): boolean {
  const receivedBuffer = Buffer.from(received);
  const savedBuffer = Buffer.from(saved);
  return receivedBuffer.length === savedBuffer.length && crypto.timingSafeEqual(receivedBuffer, savedBuffer);
}

export const googleLoginController = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Generate random state for OAuth CSRF protection.
    const state = crypto.randomBytes(32).toString("hex");

    // Save state in this browser's Redis-backed session.
    req.session.oauthState = state;

    // Build Google's login URL and include the same state.
    const googleAuthUrl = googleOAuthClient.generateAuthUrl({
      scope: ["openid", "email", "profile"],
      state,
    });

    // Wait until the session/state is actually saved in Redis.
    await saveSession(req);

    // Only redirect AFTER Redis has saved the session.
    res.redirect(googleAuthUrl);
  },
);

//google callback controller

export const googleCallbackController = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    // Google returned these in the callback URL.
    const { code, state } = res.locals.googleCallback as {
      code: string;
      state: string;
    };

    // Make sure this browser actually started OAuth.
    const savedState = req.session.oauthState;

    if (!savedState) {
      throw new AppError("OAuth session expired", 401);
    }

    // Protect against OAuth/CSRF attacks.
    if (!statesMatch(state, savedState)) {
      throw new AppError("Invalid OAuth state", 401);
    }

    // State is one-time use.
    delete req.session.oauthState;
    await saveSession(req);

    // Exchange Google's temporary code for Google tokens.
    const { tokens } = await googleOAuthClient.getToken(code);

    if (!tokens.id_token) {
      throw new AppError("Google authentication failed", 401);
    }

    // Verify that the ID token genuinely came from Google and was intended for our application.
    const ticket = await googleOAuthClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: config.google_client_id,
    });

    // Get verified Google identity information.
    const googleUser = ticket.getPayload();

    if (!googleUser?.sub || !googleUser.email) {
      throw new AppError("Google account information is incomplete", 401);
    }
    if (!googleUser.email_verified) {
      throw new AppError("Google email is not verified", 401);
    }
    // Find the existing InflowAPM user or create a new one.
    const user = await googleOAuthService({
      sub: googleUser.sub,
      email: googleUser.email,
      email_verified: googleUser.email_verified,
      given_name: googleUser.given_name,
      family_name: googleUser.family_name,
    });

    // Google authentication is now finished.
    // Create a temporary one-time code for the frontend.
    const exchangeCode = await createOAuthExchangeCode(user.id);

    // Redirect to the frontend.
    // IMPORTANT: This is NOT an access token or refresh token.
    const callbackURL = new URL("/oauth/callback", config.frontend_url);

    callbackURL.searchParams.set("code", exchangeCode);

    res.redirect(callbackURL.toString());
  },
);

//Oauth code exchange controller and generating new tokens
export const oauthExchangeController = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { code } = req.body;

    // Convert the one-time OAuth code into an InflowAPM user.
    const user = await exchangeOAuthCodeService(code);

    // From here this is exactly like normal login.
    const accessToken = await generateAccessToken(user.id, user.email);
    const refreshToken = await generateRefreshToken(user.id);

    // Your existing function hashes the refresh token
    // before storing it in the users table.
    await saveRefreshToken(refreshToken, user.id);

    res.status(200).json({
      success: true,
      message: "Google login successful",
      data: {
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role,
          created_at: user.created_at,
        },
        access_token: accessToken,
        refresh_token: refreshToken,
      },
    });
  },
);
