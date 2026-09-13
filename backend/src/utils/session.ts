import session from "express-session";
import { RedisStore } from "connect-redis";
import { createClient } from "redis";
import { config } from "../configs/env.js";

// Create a dedicated Redis client for storing temporary OAuth sessions.
// This is separate from the ioredis client used by BullMQ.
export const sessionRedisClient = createClient({
  url: config.redis_url,
});

// Store Express session data inside Redis instead of server memory.
const redisStore = new RedisStore({
  client: sessionRedisClient,
  prefix: "oauth:",
});

// Express middleware that creates and manages the browser session cookie.
// The actual session data is stored in Redis.
export const sessionMiddleware = session({
  store: redisStore,

  secret: config.session_secret,

  resave: false,
  saveUninitialized: false,

  cookie: {
    httpOnly: true,
    secure: config.node_env === "production",
    sameSite: "lax",
    maxAge: 10 * 60 * 1000,
  },
});

// Connect the OAuth/session Redis client when the server starts.
// Avoid reconnecting if the client is already open.
export async function connectSessionRedis(): Promise<void> {
  if (!sessionRedisClient.isOpen) {
    await sessionRedisClient.connect();
  }
}

// Listen for Redis connection/runtime errors so OAuth session failures
// can be diagnosed without crashing silently.
sessionRedisClient.on("error", (error) => {
  console.error("Session Redis error:", error);
});

// Gracefully close the OAuth/session Redis connection when the server stops.
// This prevents open Redis handles during shutdown and tests.
export async function closeSessionRedis(): Promise<void> {
  if (sessionRedisClient.isOpen) {
    await sessionRedisClient.quit();
  }
}
