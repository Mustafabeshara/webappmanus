/**
 * Rate Limiting Middleware
 * Implements in-memory rate limiting for sensitive endpoints.
 * For production, consider using Redis for distributed rate limiting.
 */

import { TRPCError } from "@trpc/server";
import type { Request, Response, NextFunction } from "express";

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

export interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Maximum requests per window
  message?: string;      // Custom error message
}

// In-memory store for rate limiting (use Redis in production for distributed systems)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60_000); // Clean up every minute

/**
 * Get client identifier from request (IP address or user ID)
 */
function getClientId(req: Request, userId?: number): string {
  // Prefer user ID if authenticated, otherwise use IP
  if (userId) {
    return `user:${userId}`;
  }
  // Get IP address, considering proxies
  const forwarded = req.headers["x-forwarded-for"];
  const ip = typeof forwarded === "string"
    ? forwarded.split(",")[0].trim()
    : req.socket.remoteAddress || "unknown";
  return `ip:${ip}`;
}

/**
 * Check if request is rate limited
 */
function isRateLimited(key: string, config: RateLimitConfig): { limited: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetTime < now) {
    // Create new entry
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return { limited: false, remaining: config.maxRequests - 1, resetIn: config.windowMs };
  }

  // Increment count
  entry.count++;
  rateLimitStore.set(key, entry);

  const limited = entry.count > config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - entry.count);
  const resetIn = entry.resetTime - now;

  return { limited, remaining, resetIn };
}

// Predefined rate limit configurations
export const RATE_LIMITS = {
  // OAuth/Auth endpoints: 10 requests per minute
  auth: {
    windowMs: 60_000,
    maxRequests: 10,
    message: "Too many authentication attempts. Please try again later.",
  },
  // File uploads: 20 uploads per minute
  upload: {
    windowMs: 60_000,
    maxRequests: 20,
    message: "Too many file uploads. Please wait before uploading more files.",
  },
  // General mutations: 100 requests per minute
  mutation: {
    windowMs: 60_000,
    maxRequests: 100,
    message: "Too many requests. Please slow down.",
  },
  // Sensitive operations (delete, admin): 30 per minute
  sensitive: {
    windowMs: 60_000,
    maxRequests: 30,
    message: "Too many sensitive operations. Please try again later.",
  },
} as const;

/**
 * Express middleware for rate limiting
 */
export function expressRateLimit(config: RateLimitConfig) {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientId = getClientId(req);
    const key = `${clientId}:${req.path}`;
    const { limited, remaining, resetIn } = isRateLimited(key, config);

    // Set rate limit headers
    res.setHeader("X-RateLimit-Limit", config.maxRequests);
    res.setHeader("X-RateLimit-Remaining", remaining);
    res.setHeader("X-RateLimit-Reset", Math.ceil(resetIn / 1000));

    if (limited) {
      res.status(429).json({
        error: "TOO_MANY_REQUESTS",
        message: config.message || "Too many requests. Please try again later.",
        retryAfter: Math.ceil(resetIn / 1000),
      });
      return;
    }

    next();
  };
}

/**
 * tRPC middleware for rate limiting
 * Usage: protectedProcedure.use(rateLimitMiddleware(RATE_LIMITS.upload))
 */
export function createRateLimitMiddleware(config: RateLimitConfig, endpointName: string) {
  return async function rateLimitMiddleware(opts: {
    ctx: { user?: { id: number } | null; req: Request };
    next: () => Promise<unknown>;
  }) {
    const { ctx, next } = opts;
    const clientId = getClientId(ctx.req, ctx.user?.id);
    const key = `${clientId}:${endpointName}`;
    const { limited, resetIn } = isRateLimited(key, config);

    if (limited) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: `${config.message || "Too many requests."} Retry after ${Math.ceil(resetIn / 1000)} seconds.`,
      });
    }

    return next();
  };
}

/**
 * Helper to create a rate-limited procedure
 * This can be used to wrap existing procedures with rate limiting
 */
export { getClientId, isRateLimited };
