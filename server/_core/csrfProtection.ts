/**
 * CSRF Protection Service
 *
 * Provides Cross-Site Request Forgery protection for state-changing operations.
 * Implements double-submit cookie pattern with secure token generation.
 */

import { createHash, randomBytes } from "node:crypto";
import { auditLogger } from "./auditLogger";
import type { TrpcContext } from "./context";

export interface CsrfTokenInfo {
  token: string;
  expires: number;
}

/**
 * CSRF token configuration
 */
const CSRF_CONFIG = {
  TOKEN_LENGTH: 32,
  TOKEN_EXPIRY_MS: 60 * 60 * 1000, // 1 hour
  COOKIE_NAME: "csrf-token",
  HEADER_NAME: "x-csrf-token",
  SECURE_COOKIE: process.env.NODE_ENV === "production",
  SAME_SITE: "strict" as const,
};

class CsrfProtectionService {
  private readonly tokenStore = new Map<string, CsrfTokenInfo>();

  /**
   * Generate a new CSRF token
   */
  generateToken(): string {
    const token = randomBytes(CSRF_CONFIG.TOKEN_LENGTH).toString("hex");
    const expires = Date.now() + CSRF_CONFIG.TOKEN_EXPIRY_MS;

    // Store token with expiry
    this.tokenStore.set(token, { token, expires });

    // Clean up expired tokens periodically
    this.cleanupExpiredTokens();

    return token;
  }

  /**
   * Validate CSRF token from request
   */
  validateToken(
    tokenFromHeader: string | undefined,
    tokenFromCookie: string | undefined,
    ctx: TrpcContext
  ): boolean {
    // Extract request info for logging
    const ipAddress =
      ctx.req.ip || ctx.req.headers["x-forwarded-for"]?.toString() || "unknown";
    const userAgent = ctx.req.headers["user-agent"] || "unknown";
    const endpoint = ctx.req.url || "unknown";
    const userId = ctx.user?.id;

    // Both tokens must be present
    if (!tokenFromHeader || !tokenFromCookie) {
      this.logCsrfViolation(
        "Missing CSRF tokens",
        {
          tokenFromHeader: !!tokenFromHeader,
          tokenFromCookie: !!tokenFromCookie,
        },
        userId,
        ipAddress,
        userAgent,
        endpoint
      );
      return false;
    }

    // Tokens must match (double-submit cookie pattern)
    if (tokenFromHeader !== tokenFromCookie) {
      this.logCsrfViolation(
        "CSRF token mismatch",
        {
          headerToken: this.hashToken(tokenFromHeader),
          cookieToken: this.hashToken(tokenFromCookie),
        },
        userId,
        ipAddress,
        userAgent,
        endpoint
      );
      return false;
    }

    // Token must exist in our store and not be expired
    const tokenInfo = this.tokenStore.get(tokenFromHeader);
    if (!tokenInfo) {
      this.logCsrfViolation(
        "Invalid CSRF token",
        { token: this.hashToken(tokenFromHeader) },
        userId,
        ipAddress,
        userAgent,
        endpoint
      );
      return false;
    }

    // Check if token is expired
    if (Date.now() > tokenInfo.expires) {
      this.tokenStore.delete(tokenFromHeader);
      this.logCsrfViolation(
        "Expired CSRF token",
        { token: this.hashToken(tokenFromHeader), expires: tokenInfo.expires },
        userId,
        ipAddress,
        userAgent,
        endpoint
      );
      return false;
    }

    return true;
  }

  /**
   * Invalidate a CSRF token
   */
  invalidateToken(token: string): void {
    this.tokenStore.delete(token);
  }

  /**
   * Get CSRF token from request headers
   */
  getTokenFromHeaders(ctx: TrpcContext): string | undefined {
    return ctx.req.headers[CSRF_CONFIG.HEADER_NAME] as string | undefined;
  }

  /**
   * Get CSRF token from cookies
   */
  getTokenFromCookies(ctx: TrpcContext): string | undefined {
    // Parse cookies manually since we don't have cookie parser middleware
    const cookieHeader = ctx.req.headers.cookie;
    if (!cookieHeader) return undefined;

    const cookies = cookieHeader.split(";").reduce(
      (acc, cookie) => {
        const [name, value] = cookie.trim().split("=");
        acc[name] = value;
        return acc;
      },
      {} as Record<string, string>
    );

    return cookies[CSRF_CONFIG.COOKIE_NAME];
  }

  /**
   * Set CSRF token cookie in response
   */
  setCsrfCookie(ctx: TrpcContext, token: string): void {
    const cookieValue = `${CSRF_CONFIG.COOKIE_NAME}=${token}; HttpOnly; SameSite=${CSRF_CONFIG.SAME_SITE}; Path=/; Max-Age=${CSRF_CONFIG.TOKEN_EXPIRY_MS / 1000}`;

    if (CSRF_CONFIG.SECURE_COOKIE) {
      ctx.res.setHeader("Set-Cookie", `${cookieValue}; Secure`);
    } else {
      ctx.res.setHeader("Set-Cookie", cookieValue);
    }
  }

  /**
   * Clean up expired tokens from memory
   */
  private cleanupExpiredTokens(): void {
    const now = Date.now();
    for (const [token, info] of this.tokenStore.entries()) {
      if (now > info.expires) {
        this.tokenStore.delete(token);
      }
    }
  }

  /**
   * Hash token for safe logging
   */
  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex").substring(0, 16);
  }

  /**
   * Log CSRF protection violations
   */
  private async logCsrfViolation(
    reason: string,
    details: Record<string, any>,
    userId?: number,
    ipAddress?: string,
    userAgent?: string,
    endpoint?: string
  ): Promise<void> {
    try {
      await auditLogger.logSecurityEvent({
        type: "unauthorized_access",
        severity: "high",
        description: `CSRF protection violation: ${reason}`,
        details: {
          reason,
          ...details,
        },
        userId,
        ipAddress,
        userAgent,
        endpoint,
      });
    } catch (error) {
      console.error("[CSRF PROTECTION] Failed to log violation:", error);
    }
  }
}

// Export singleton instance
export const csrfProtectionService = new CsrfProtectionService();

// Export configuration for use in other modules
export { CSRF_CONFIG };
