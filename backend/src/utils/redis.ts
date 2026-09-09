import { Redis } from "ioredis";
import type { ConnectionOptions } from "bullmq";
import { config } from "../configs/env.js";

const redisClient = new Redis(config.redis_url || "redis://redis:6379");

redisClient.on("connect", () => {
  console.log("connected to redis successfully");
});

redisClient.on("error", (error: Error) => {
  console.log("failed to connect to redis", error);
});

const redisUrl = new URL(config.redis_url);
const redisDatabase = Number(redisUrl.pathname.slice(1) || "0");
const redisUrlOptions = Object.fromEntries(redisUrl.searchParams.entries());

export const redisConnectionOptions = {
  ...redisUrlOptions,
  host: redisUrl.hostname,
  port: Number(redisUrl.port || 6379),
  db: Number.isInteger(redisDatabase) && redisDatabase >= 0 ? redisDatabase : 0,
  ...(redisUrl.username
    ? { username: decodeURIComponent(redisUrl.username) }
    : {}),
  ...(redisUrl.password
    ? { password: decodeURIComponent(redisUrl.password) }
    : {}),
  ...(redisUrl.protocol === "rediss:" ? { tls: {} } : {}),
  maxRetriesPerRequest: null,
} as ConnectionOptions;
export default redisClient;
