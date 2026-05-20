// rate-limit — Upstash Redis sliding-window limits for API and sign endpoints
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

function createRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url?.startsWith("https://") || !token || token.includes("...")) {
    return null;
  }
  return new Redis({ url, token });
}

function createLimiter(requests: number, prefix: string) {
  const redis = createRedis();
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, "1 m"),
    prefix,
  });
}

let apiRateLimitInstance: Ratelimit | null | undefined;
let v1ApiRateLimitInstance: Ratelimit | null | undefined;

export function getApiRateLimit() {
  if (apiRateLimitInstance === undefined) {
    apiRateLimitInstance = createLimiter(60, "sign:api");
  }
  return apiRateLimitInstance;
}

export function getV1ApiRateLimit() {
  if (v1ApiRateLimitInstance === undefined) {
    v1ApiRateLimitInstance = createLimiter(300, "sign:v1");
  }
  return v1ApiRateLimitInstance;
}

export async function limitV1Api(orgId: string): Promise<boolean> {
  const limiter = getV1ApiRateLimit();
  if (!limiter) return true;
  const { success } = await limiter.limit(orgId);
  return success;
}
