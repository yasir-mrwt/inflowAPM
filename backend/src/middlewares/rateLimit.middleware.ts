import redisClient from "../utils/redis.js";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import redisStore from "rate-limit-redis";
import { Request } from "express";
import { config } from "../configs/env.js";

export const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  skip: () => config.node_env === "test", //directly skips the rate limit when the node env is test
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip || "unknown-ip"), //key generator
  store: new redisStore({
    sendCommand: (Command: string, ...args: string[]) =>
      redisClient.call(Command, ...args) as any,
    prefix: "rl:global",
  }),
  message: {
    success: false,
    message:
      "too many requests from this ip, wait for some time to processed again",
  },
});

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skip: () => config.node_env === "test", //directly skips the rate limit when the node env is test
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip || "unknown-ip"),
  store: new redisStore({
    sendCommand: (command: string, ...args: string[]) =>
      redisClient.call(command, ...args) as any,
    prefix: "rl:auth",
  }),
  message: {
    success: false,
    message: "too many authentications reqs try again later",
  },
});
