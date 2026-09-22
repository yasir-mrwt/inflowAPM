import redisClient from "./redis.js";

const API_KEY_CACHE_PATTERN = "projects:apikey:check:*";

export async function invalidateProjectApiKeyCaches(): Promise<void> {
  let cursor = "0";
  do {
    const [nextCursor, keys] = await redisClient.scan(
      cursor,
      "MATCH",
      API_KEY_CACHE_PATTERN,
      "COUNT",
      100,
    );
    cursor = nextCursor;
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
  } while (cursor !== "0");
}
