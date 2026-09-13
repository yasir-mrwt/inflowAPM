import "express-session";

declare module "express-session" {
  interface SessionData {
    // Temporary value used to verify that the same browser
    // started and completed the Google OAuth flow.
    oauthState?: string;
  }
}
