import { Redis } from "ioredis";
import { config } from "../configs/env.js";

const redisClient = new Redis(config.redis_url || "redis://redis:6379");

redisClient.on("connect", () => {
  console.log("connected to redis successfully");
});

redisClient.on("fail", (error: any) => {
  console.log("failed to connect to redis", error);
});

export default redisClient;
