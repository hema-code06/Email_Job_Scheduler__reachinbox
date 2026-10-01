import { redis } from "../config/redis";

const HOUR_MS = 60 * 60 * 1000;

export async function checkHourlyLimit(senderId: string, limit: number) {
  const window = Math.floor(Date.now() / HOUR_MS);
  const key = `rl:${senderId}:${window}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, 2 * 60 * 60);
  return { allowed: count <= limit, retryAt: (window + 1) * HOUR_MS };
}