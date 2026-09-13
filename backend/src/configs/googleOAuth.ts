import { google } from "googleapis";
import { config } from "./env.js";

export const googleOAuthClient = new google.auth.OAuth2(
  config.google_client_id,
  config.google_client_secret,
  config.google_redirect_uri,
);
