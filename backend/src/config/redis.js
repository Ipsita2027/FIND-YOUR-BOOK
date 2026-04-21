import "dotenv/config";
import { createClient } from "redis";

let redisClient;

function createRedisClient() {
  if (redisClient) {
    return redisClient;
  }

  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    throw new Error("REDIS_URL is required to connect to Redis.");
  }

  redisClient = createClient({ url: redisUrl });

  redisClient.on("error", (error) => {
    // eslint-disable-next-line no-console
    console.error("Redis client error:", error);
  });

  return redisClient;
}

export { createRedisClient };