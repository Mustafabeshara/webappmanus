/**
 * Redis-backed Rate Limiting Service
 *
 * Provides distributed rate limiting for multi-instance deployments.
 * Falls back to in-memory store when Redis is not available.
 *
 * Features:
 * - Sliding window rate limiting
 * - Progressive penalties for repeat offenders
 * - DDoS protection with IP blocking
 * - Automatic fallback to in-memory when Redis unavailable
 */

import type { NextFunction, Request, Response } from "express";
import { RATE_LIMITS as RATE_LIMIT_CONSTANTS } from "@shared/constants";

// Redis client interface for dependency injection
export interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options?: { EX?: number; PX?: number }): Promise<void>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<void>;
  del(key: string): Promise<void>;
  ttl(key: string): Promise<number>;
  isReady: boolean;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message?: string;
  keyPrefix?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export interface RateLimitInfo {
  limit: number;
  current: number;
  remaining: number;
  resetTime: Date;
  isBlocked: boolean;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
  violations: number;
  blockedUntil?: number;
}

/**
 * In-memory fallback store
 */
class InMemoryStore {
  private store = new Map<string, RateLimitEntry>();

  async get(key: string): Promise<RateLimitEntry | null> {
    const entry = this.store.get(key);
    if (!entry) return null;

    // Check if expired
    if (entry.resetTime < Date.now() && (!entry.blockedUntil || entry.blockedUntil < Date.now())) {
      this.store.delete(key);
      return null;
    }

    return entry;
  }

  async set(key: string, entry: RateLimitEntry, ttlMs: number): Promise<void> {
    this.store.set(key, entry);
    // Auto-cleanup after TTL
    setTimeout(() => {
      const current = this.store.get(key);
      if (current && current.resetTime === entry.resetTime) {
        this.store.delete(key);
      }
    }, ttlMs);
  }

  async increment(key: string, windowMs: number): Promise<RateLimitEntry> {
    const now = Date.now();
    let entry = await this.get(key);

    if (!entry || entry.resetTime < now) {
      entry = {
        count: 1,
        resetTime: now + windowMs,
        violations: entry?.violations || 0,
      };
    } else {
      entry.count++;
    }

    await this.set(key, entry, windowMs);
    return entry;
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetTime < now && (!entry.blockedUntil || entry.blockedUntil < now)) {
        this.store.delete(key);
      }
    }
  }
}

/**
 * Redis-backed rate limiting service with in-memory fallback
 */
export class RedisRateLimitingService {
  private redis: RedisClient | null = null;
  private fallbackStore = new InMemoryStore();
  private readonly KEY_PREFIX = "ratelimit:";
  private readonly BLOCK_PREFIX = "ratelimit:block:";
  private readonly PROGRESSIVE_MULTIPLIER = 2;
  private readonly MAX_BLOCK_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

  constructor(redisClient?: RedisClient) {
    this.redis = redisClient || null;

    // Start cleanup interval for fallback store
    setInterval(() => this.fallbackStore.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Set Redis client (for late initialization)
   */
  setRedisClient(client: RedisClient): void {
    this.redis = client;
    console.log("[RateLimit] Redis client configured for distributed rate limiting");
  }

  /**
   * Check if Redis is available
   */
  isRedisAvailable(): boolean {
    return this.redis?.isReady ?? false;
  }

  /**
   * Get rate limit key for a request
   */
  private getKey(identifier: string, endpoint?: string): string {
    const base = `${this.KEY_PREFIX}${identifier}`;
    return endpoint ? `${base}:${endpoint}` : base;
  }

  /**
   * Check rate limit using Redis or fallback
   */
  async checkRateLimit(
    identifier: string,
    config: RateLimitConfig,
    endpoint?: string
  ): Promise<{ allowed: boolean; info: RateLimitInfo }> {
    const key = config.keyPrefix
      ? `${this.KEY_PREFIX}${config.keyPrefix}:${identifier}`
      : this.getKey(identifier, endpoint);

    const now = Date.now();
    const windowSeconds = Math.ceil(config.windowMs / 1000);

    // Check if blocked first
    const blockKey = `${this.BLOCK_PREFIX}${identifier}`;
    const blockedUntil = await this.getBlockedUntil(blockKey);

    if (blockedUntil && blockedUntil > now) {
      return {
        allowed: false,
        info: {
          limit: config.maxRequests,
          current: config.maxRequests + 1,
          remaining: 0,
          resetTime: new Date(blockedUntil),
          isBlocked: true,
        },
      };
    }

    // Use Redis if available, otherwise fallback
    if (this.isRedisAvailable() && this.redis) {
      return this.checkRateLimitRedis(key, config, windowSeconds);
    }

    return this.checkRateLimitFallback(key, config);
  }

  /**
   * Check rate limit using Redis
   */
  private async checkRateLimitRedis(
    key: string,
    config: RateLimitConfig,
    windowSeconds: number
  ): Promise<{ allowed: boolean; info: RateLimitInfo }> {
    try {
      const redis = this.redis!;

      // Increment counter
      const count = await redis.incr(key);

      // Set expiry on first request
      if (count === 1) {
        await redis.expire(key, windowSeconds);
      }

      // Get TTL for reset time
      const ttl = await redis.ttl(key);
      const resetTime = new Date(Date.now() + (ttl > 0 ? ttl * 1000 : config.windowMs));

      const info: RateLimitInfo = {
        limit: config.maxRequests,
        current: count,
        remaining: Math.max(0, config.maxRequests - count),
        resetTime,
        isBlocked: false,
      };

      const allowed = count <= config.maxRequests;

      // Track violations if exceeded
      if (!allowed) {
        await this.recordViolation(key.replace(this.KEY_PREFIX, ""), config);
      }

      return { allowed, info };
    } catch (error) {
      console.error("[RateLimit] Redis error, falling back to in-memory:", error);
      // Fall back to in-memory on Redis error
      return this.checkRateLimitFallback(key, config);
    }
  }

  /**
   * Check rate limit using in-memory fallback
   */
  private async checkRateLimitFallback(
    key: string,
    config: RateLimitConfig
  ): Promise<{ allowed: boolean; info: RateLimitInfo }> {
    const entry = await this.fallbackStore.increment(key, config.windowMs);

    const info: RateLimitInfo = {
      limit: config.maxRequests,
      current: entry.count,
      remaining: Math.max(0, config.maxRequests - entry.count),
      resetTime: new Date(entry.resetTime),
      isBlocked: false,
    };

    const allowed = entry.count <= config.maxRequests;

    if (!allowed) {
      await this.recordViolation(key.replace(this.KEY_PREFIX, ""), config);
    }

    return { allowed, info };
  }

  /**
   * Get blocked until timestamp
   */
  private async getBlockedUntil(blockKey: string): Promise<number | null> {
    if (this.isRedisAvailable() && this.redis) {
      try {
        const value = await this.redis.get(blockKey);
        return value ? parseInt(value, 10) : null;
      } catch {
        return null;
      }
    }

    const entry = await this.fallbackStore.get(blockKey);
    return entry?.blockedUntil || null;
  }

  /**
   * Record a rate limit violation and apply progressive penalties
   */
  private async recordViolation(identifier: string, config: RateLimitConfig): Promise<void> {
    const violationKey = `${this.KEY_PREFIX}violations:${identifier}`;

    try {
      let violations = 1;

      if (this.isRedisAvailable() && this.redis) {
        violations = await this.redis.incr(violationKey);
        await this.redis.expire(violationKey, 24 * 60 * 60); // 24 hour window for violations
      } else {
        const entry = await this.fallbackStore.get(violationKey);
        violations = (entry?.violations || 0) + 1;
        await this.fallbackStore.set(
          violationKey,
          { count: 0, resetTime: Date.now() + 24 * 60 * 60 * 1000, violations },
          24 * 60 * 60 * 1000
        );
      }

      // Apply progressive block for repeat offenders (after 3 violations)
      if (violations >= 3) {
        const blockDuration = Math.min(
          5 * 60 * 1000 * Math.pow(this.PROGRESSIVE_MULTIPLIER, violations - 3),
          this.MAX_BLOCK_DURATION_MS
        );
        await this.blockIdentifier(identifier, blockDuration);
      }
    } catch (error) {
      console.error("[RateLimit] Failed to record violation:", error);
    }
  }

  /**
   * Block an identifier for a specified duration
   */
  async blockIdentifier(identifier: string, durationMs: number): Promise<void> {
    const blockKey = `${this.BLOCK_PREFIX}${identifier}`;
    const blockedUntil = Date.now() + durationMs;

    if (this.isRedisAvailable() && this.redis) {
      try {
        await this.redis.set(blockKey, blockedUntil.toString(), {
          PX: durationMs,
        });
      } catch (error) {
        console.error("[RateLimit] Failed to block in Redis:", error);
      }
    }

    // Always set in fallback too
    await this.fallbackStore.set(
      blockKey,
      { count: 0, resetTime: blockedUntil, violations: 0, blockedUntil },
      durationMs
    );

    console.log(`[RateLimit] Blocked ${identifier} for ${Math.round(durationMs / 1000)}s`);
  }

  /**
   * Unblock an identifier
   */
  async unblockIdentifier(identifier: string): Promise<void> {
    const blockKey = `${this.BLOCK_PREFIX}${identifier}`;

    if (this.isRedisAvailable() && this.redis) {
      try {
        await this.redis.del(blockKey);
      } catch (error) {
        console.error("[RateLimit] Failed to unblock in Redis:", error);
      }
    }

    await this.fallbackStore.delete(blockKey);
    console.log(`[RateLimit] Unblocked ${identifier}`);
  }

  /**
   * Reset rate limit for an identifier
   */
  async reset(identifier: string, endpoint?: string): Promise<void> {
    const key = this.getKey(identifier, endpoint);

    if (this.isRedisAvailable() && this.redis) {
      try {
        await this.redis.del(key);
      } catch (error) {
        console.error("[RateLimit] Failed to reset in Redis:", error);
      }
    }

    await this.fallbackStore.delete(key);
  }

  /**
   * Create Express middleware
   */
  middleware(config: RateLimitConfig) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const identifier = this.getClientIdentifier(req);
        const endpoint = `${req.method}:${req.baseUrl || ""}${req.path}`;

        const { allowed, info } = await this.checkRateLimit(identifier, config, endpoint);

        // Set rate limit headers
        res.setHeader("X-RateLimit-Limit", info.limit);
        res.setHeader("X-RateLimit-Remaining", info.remaining);
        res.setHeader("X-RateLimit-Reset", Math.ceil(info.resetTime.getTime() / 1000));

        if (!allowed) {
          const retryAfter = Math.ceil((info.resetTime.getTime() - Date.now()) / 1000);
          res.setHeader("Retry-After", Math.max(1, retryAfter));

          return res.status(429).json({
            error: "RATE_LIMITED",
            message: info.isBlocked
              ? "You have been temporarily blocked due to excessive requests."
              : config.message || "Too many requests. Please try again later.",
            retryAfter: Math.max(1, retryAfter),
          });
        }

        next();
      } catch (error) {
        console.error("[RateLimit] Middleware error:", error);
        // Continue on error to avoid blocking legitimate requests
        next();
      }
    };
  }

  /**
   * Get client identifier from request
   */
  private getClientIdentifier(req: Request): string {
    // Check X-Forwarded-For header (set by proxies/load balancers)
    const forwarded = req.headers["x-forwarded-for"];
    if (forwarded) {
      const forwardedStr = Array.isArray(forwarded) ? forwarded[0] : forwarded;
      if (forwardedStr) {
        const firstIp = forwardedStr.split(",")[0]?.trim();
        if (firstIp) return firstIp;
      }
    }

    // Check X-Real-IP header
    const realIp = req.headers["x-real-ip"];
    if (realIp) {
      const realIpStr = Array.isArray(realIp) ? realIp[0] : realIp;
      if (realIpStr) return realIpStr.trim();
    }

    // Fallback to socket address
    return req.socket?.remoteAddress || req.ip || "unknown";
  }

  /**
   * Get rate limiting stats
   */
  getStats(): {
    redisAvailable: boolean;
    mode: "redis" | "memory";
  } {
    return {
      redisAvailable: this.isRedisAvailable(),
      mode: this.isRedisAvailable() ? "redis" : "memory",
    };
  }
}

// Create singleton instance
export const redisRateLimiting = new RedisRateLimitingService();

// Predefined configurations using constants
export const REDIS_RATE_LIMITS = {
  auth: {
    windowMs: 60_000,
    maxRequests: RATE_LIMIT_CONSTANTS.LOGIN_PER_MINUTE,
    message: "Too many authentication attempts. Please try again later.",
    keyPrefix: "auth",
  },
  upload: {
    windowMs: 60_000,
    maxRequests: RATE_LIMIT_CONSTANTS.UPLOAD_PER_MINUTE,
    message: "Too many file uploads. Please wait before uploading more files.",
    keyPrefix: "upload",
  },
  mutation: {
    windowMs: 60_000,
    maxRequests: RATE_LIMIT_CONSTANTS.GENERAL_MUTATION_PER_MINUTE,
    message: "Too many requests. Please slow down.",
    keyPrefix: "mutation",
  },
  sensitive: {
    windowMs: 60_000,
    maxRequests: RATE_LIMIT_CONSTANTS.SENSITIVE_PER_MINUTE,
    message: "Too many sensitive operations. Please try again later.",
    keyPrefix: "sensitive",
  },
  ai: {
    windowMs: 60_000,
    maxRequests: RATE_LIMIT_CONSTANTS.AI_PER_MINUTE,
    message: "Too many AI requests. Please wait before making more requests.",
    keyPrefix: "ai",
  },
} as const;

/**
 * Initialize Redis rate limiting with a client
 *
 * @example
 * ```typescript
 * import { createClient } from "redis";
 *
 * const redis = createClient({ url: process.env.REDIS_URL });
 * await redis.connect();
 *
 * initializeRedisRateLimiting({
 *   get: (key) => redis.get(key),
 *   set: (key, value, opts) => redis.set(key, value, opts),
 *   incr: (key) => redis.incr(key),
 *   expire: (key, seconds) => redis.expire(key, seconds),
 *   del: (key) => redis.del(key),
 *   ttl: (key) => redis.ttl(key),
 *   isReady: redis.isReady,
 * });
 * ```
 */
export function initializeRedisRateLimiting(client: RedisClient): void {
  redisRateLimiting.setRedisClient(client);
}
