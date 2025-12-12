import type { NextFunction, Request, Response } from "express";
import * as db from "../db";
import { createSecurityEvent } from "./input-validation";
// Import for Express Request augmentation side effects
import "../types/db";

/**
 * Rate Limiting Service - Task 7.1, 7.2, 7.3
 * Implements rate limiting with progressive penalties and DDoS protection
 */

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  message?: string; // Custom error message when rate limited
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
  onLimitReached?: (req: Request, res: Response) => void;
}

export interface RateLimitInfo {
  limit: number;
  current: number;
  remaining: number;
  resetTime: Date;
}

class RateLimitingService {
  private readonly DEFAULT_WINDOW_MS = 1000 * 60 * 15; // 15 minutes
  private readonly DEFAULT_MAX_REQUESTS = 100;
  private readonly PROGRESSIVE_PENALTY_MULTIPLIER = 2;
  private readonly MAX_PENALTY_DURATION_MS = 1000 * 60 * 60 * 24; // 24 hours

  // In-memory store for rate limiting (in production, use Redis)
  private readonly store = new Map<
    string,
    {
      count: number;
      resetTime: number;
      violations: number;
      penaltyUntil?: number;
    }
  >();

  /**
   * Default key generator using IP address
   */
  private defaultKeyGenerator(req: Request): string {
    const forwarded = req.headers["x-forwarded-for"] as string;
    if (forwarded) {
      return forwarded.split(",")[0].trim();
    }

    const realIp = req.headers["x-real-ip"] as string;
    if (realIp) {
      return realIp;
    }

    return (
      req.connection?.remoteAddress || req.socket?.remoteAddress || "unknown"
    );
  }

  /**
   * Get rate limit configuration based on endpoint and user type
   */
  private getRateLimitConfig(req: Request): RateLimitConfig {
    const path = req.path;
    const method = req.method;
    const isAuthenticated = !!req.userId;

    // API endpoints have stricter limits
    if (path.startsWith("/api/")) {
      if (path.includes("/auth/")) {
        return {
          windowMs: 1000 * 60 * 15, // 15 minutes
          maxRequests: 5, // Very strict for auth endpoints
        };
      }

      if (method === "POST" || method === "PUT" || method === "DELETE") {
        return {
          windowMs: 1000 * 60 * 5, // 5 minutes
          maxRequests: isAuthenticated ? 50 : 10,
        };
      }

      return {
        windowMs: 1000 * 60 * 15, // 15 minutes
        maxRequests: isAuthenticated ? 200 : 50,
      };
    }

    // File upload endpoints
    if (path.includes("/upload")) {
      return {
        windowMs: 1000 * 60 * 60, // 1 hour
        maxRequests: isAuthenticated ? 20 : 5,
      };
    }

    // Default limits for other endpoints
    return {
      windowMs: this.DEFAULT_WINDOW_MS,
      maxRequests: isAuthenticated
        ? this.DEFAULT_MAX_REQUESTS * 2
        : this.DEFAULT_MAX_REQUESTS,
    };
  }

  /**
   * Check if request should be rate limited
   */
  async checkRateLimit(
    req: Request
  ): Promise<{ allowed: boolean; info: RateLimitInfo }> {
    const config = this.getRateLimitConfig(req);
    const key = config.keyGenerator
      ? config.keyGenerator(req)
      : this.defaultKeyGenerator(req);
    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Get or create rate limit entry
    let entry = this.store.get(key);
    if (!entry || entry.resetTime <= now) {
      entry = {
        count: 0,
        resetTime: now + config.windowMs,
        violations: entry?.violations || 0,
      };
      this.store.set(key, entry);
    }

    // Check if currently under penalty
    if (entry.penaltyUntil && entry.penaltyUntil > now) {
      return {
        allowed: false,
        info: {
          limit: config.maxRequests,
          current: entry.count,
          remaining: 0,
          resetTime: new Date(entry.penaltyUntil),
        },
      };
    }

    // Increment request count
    entry.count++;

    const info: RateLimitInfo = {
      limit: config.maxRequests,
      current: entry.count,
      remaining: Math.max(0, config.maxRequests - entry.count),
      resetTime: new Date(entry.resetTime),
    };

    // Check if limit exceeded
    if (entry.count > config.maxRequests) {
      await this.handleRateLimitViolation(req, key, entry);
      return { allowed: false, info };
    }

    return { allowed: true, info };
  }

  /**
   * Handle rate limit violation with progressive penalties
   */
  private async handleRateLimitViolation(
    req: Request,
    key: string,
    entry: {
      count: number;
      resetTime: number;
      violations: number;
      penaltyUntil?: number;
    }
  ): Promise<void> {
    entry.violations++;

    // Calculate progressive penalty duration
    const basePenaltyMs = 1000 * 60 * 5; // 5 minutes base penalty
    const penaltyMs = Math.min(
      basePenaltyMs *
        Math.pow(this.PROGRESSIVE_PENALTY_MULTIPLIER, entry.violations - 1),
      this.MAX_PENALTY_DURATION_MS
    );

    entry.penaltyUntil = Date.now() + penaltyMs;

    // Log rate limit violation
    try {
      await db.createRateLimitViolation({
        identifier: key,
        endpoint: `${req.method} ${req.path}`,
        violationCount: entry.violations,
        windowStart: new Date(
          entry.resetTime - this.getRateLimitConfig(req).windowMs
        ),
        windowEnd: new Date(entry.resetTime),
        blocked: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Create security event
      await createSecurityEvent({
        type: "rate_limit_exceeded",
        severity: entry.violations > 3 ? "high" : "medium",
        description: `Rate limit exceeded ${entry.violations} times`,
        details: JSON.stringify({
          endpoint: `${req.method} ${req.path}`,
          violations: entry.violations,
          penaltyUntil: entry.penaltyUntil,
        }),
        userId: req.userId,
        ipAddress: key,
        userAgent: req.headers["user-agent"],
        endpoint: `${req.method} ${req.path}`,
        resolved: false,
        createdAt: new Date(),
      });
    } catch (error) {
      console.error("[RateLimit] Failed to log violation:", error);
    }
  }

  /**
   * Rate limiting middleware
   */
  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { allowed, info } = await this.checkRateLimit(req);

        // Add rate limit headers
        res.setHeader("X-RateLimit-Limit", info.limit);
        res.setHeader("X-RateLimit-Remaining", info.remaining);
        res.setHeader(
          "X-RateLimit-Reset",
          Math.ceil(info.resetTime.getTime() / 1000)
        );

        if (!allowed) {
          const retryAfter = Math.ceil(
            (info.resetTime.getTime() - Date.now()) / 1000
          );
          res.setHeader("Retry-After", retryAfter);

          return res.status(429).json({
            error: "Too Many Requests",
            message: "Rate limit exceeded. Please try again later.",
            retryAfter,
          });
        }

        next();
      } catch (error) {
        console.error("[RateLimit] Middleware error:", error);
        next(); // Continue on error to avoid blocking legitimate requests
      }
    };
  }

  /**
   * Clean up expired entries (should be called periodically)
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (
        entry.resetTime <= now &&
        (!entry.penaltyUntil || entry.penaltyUntil <= now)
      ) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Get current rate limit status for a key
   */
  getStatus(key: string): RateLimitInfo | null {
    const entry = this.store.get(key);
    if (!entry) {
      return null;
    }

    return {
      limit: this.DEFAULT_MAX_REQUESTS,
      current: entry.count,
      remaining: Math.max(0, this.DEFAULT_MAX_REQUESTS - entry.count),
      resetTime: new Date(entry.resetTime),
    };
  }

  /**
   * Reset rate limit for a specific key (admin function)
   */
  reset(key: string): void {
    this.store.delete(key);
  }

  /**
   * Block IP address temporarily (DDoS protection)
   */
  async blockIpAddress(
    ipAddress: string,
    durationMs: number,
    reason: string
  ): Promise<void> {
    const entry = this.store.get(ipAddress) || {
      count: 0,
      resetTime: Date.now() + this.DEFAULT_WINDOW_MS,
      violations: 0,
    };

    entry.penaltyUntil = Date.now() + durationMs;
    entry.violations = Math.max(entry.violations, 10); // High violation count for blocked IPs
    this.store.set(ipAddress, entry);

    // Log the block
    try {
      await createSecurityEvent({
        type: "suspicious_activity",
        severity: "critical",
        description: `IP address blocked: ${reason}`,
        details: JSON.stringify({
          ipAddress,
          durationMs,
          reason,
        }),
        ipAddress,
        resolved: false,
        createdAt: new Date(),
      });
    } catch (error) {
      console.error("[RateLimit] Failed to log IP block:", error);
    }
  }

  /**
   * Check if IP is currently blocked
   */
  isBlocked(ipAddress: string): boolean {
    const entry = this.store.get(ipAddress);
    return !!(entry?.penaltyUntil && entry.penaltyUntil > Date.now());
  }
}

export const rateLimiting = new RateLimitingService();

// Start cleanup interval
setInterval(
  () => {
    rateLimiting.cleanup();
  },
  1000 * 60 * 5
); // Clean up every 5 minutes

// =============================================================================
// BACKWARD COMPATIBILITY EXPORTS (for trpc.ts and oauth.ts)
// =============================================================================

// Simple in-memory rate limit store for backward compatibility
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Get client identifier for rate limiting (compatible with old rateLimit.ts)
 */
export function getClientId(req: { ip?: string; headers: Record<string, string | string[] | undefined> }): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(",")[0];
    return ip.trim();
  }
  return req.ip || "unknown";
}

/**
 * Check if request is rate limited (compatible with old rateLimit.ts)
 */
export function isRateLimited(
  key: string,
  config: RateLimitConfig
): { limited: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // First request or window expired
  if (!entry || now >= entry.resetTime) {
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
 * Express middleware for rate limiting (compatible with old rateLimit.ts)
 */
export function expressRateLimit(config: RateLimitConfig) {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientId = getClientId(req);
    const key = `${clientId}:${req.url}`;
    const { limited, remaining, resetIn } = isRateLimited(key, config);

    // Set rate limit headers
    res.setHeader("X-RateLimit-Limit", config.maxRequests);
    res.setHeader("X-RateLimit-Remaining", remaining);
    res.setHeader("X-RateLimit-Reset", Math.ceil(resetIn / 1000));

    if (limited) {
      res.status(429).json({
        error: "RATE_LIMITED",
        message: config.message || "Too many requests",
        retryAfterMs: resetIn,
      });
      return;
    }

    next();
  };
}
