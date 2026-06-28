import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextRequest } from "next/server";

/**
 * Rate limiting for the handful of public-write endpoints that don't
 * require admin auth and could otherwise be spammed (Lost & Found posts,
 * Business Directory submissions, Family invites). Uses Upstash Redis —
 * the standard choice for Vercel serverless functions, since it's
 * connectionless (HTTP-based) and has no cold-start penalty.
 *
 * IMPORTANT: Upstash credentials (UPSTASH_REDIS_REST_URL,
 * UPSTASH_REDIS_REST_TOKEN) are not yet configured — per the project's
 * "wire up integrations at the end" convention, this code is complete and
 * correct, but isRateLimitingConfigured() will be false until those env
 * vars are set in Vercel. When unconfigured, checkRateLimit() fails OPEN
 * (allows the request) rather than blocking everything — a missing
 * rate-limiter should never be the reason legitimate users can't use the
 * app, but this means rate limiting genuinely does nothing until the
 * Upstash database is created and connected.
 */

let redis: Redis | null = null;
const limiters = new Map<string, Ratelimit>();

function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  redis = new Redis({ url, token });
  return redis;
}

export function isRateLimitingConfigured(): boolean {
  return getRedis() !== null;
}

const LIMITER_CONFIGS = {
  lostFoundPost: { requests: 5, window: "10 m" as const },
  businessDirectorySubmit: { requests: 5, window: "10 m" as const },
  familyInviteCreate: { requests: 10, window: "10 m" as const },
  mosqueAdminInviteCreate: { requests: 20, window: "10 m" as const },
} satisfies Record<string, { requests: number; window: `${number} ${"s" | "m" | "h"}` }>;

export type LimiterName = keyof typeof LIMITER_CONFIGS;

function getLimiter(name: LimiterName): Ratelimit | null {
  const client = getRedis();
  if (!client) return null;

  const cached = limiters.get(name);
  if (cached) return cached;

  const config = LIMITER_CONFIGS[name];
  const limiter = new Ratelimit({
    redis: client,
    limiter: Ratelimit.slidingWindow(config.requests, config.window),
    prefix: `masjid-connect:${name}`,
    analytics: true,
  });
  limiters.set(name, limiter);
  return limiter;
}

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

export async function checkRateLimit(
  name: LimiterName,
  request: NextRequest,
  userId?: string | null
): Promise<RateLimitResult> {
  const limiter = getLimiter(name);
  if (!limiter) {
    return { allowed: true, limit: 0, remaining: 0, reset: 0 };
  }

  const identifier = userId ?? getClientIp(request);
  const result = await limiter.limit(identifier);
  return {
    allowed: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  };
}
