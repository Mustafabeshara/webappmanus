import type { NextFunction, Request, Response } from "express";
import { createHmac, randomBytes } from "node:crypto";
import { ENV } from "./env";
import { createSecurityEvent } from "./input-validation";

/**
 * CSRF Protection Service - Task 1.4
 * Implements CSRF token generation, validation, and middleware
 */

export interface CsrfTokenData {
  token: string;
  secret: string;
  expiresAt: Date;
}

class CsrfProtectionService {
  private readonly TOKEN_LENGTH = 32;
  private readonly SECRET_LENGTH = 32;
  private readonly TOKEN_EXPIRY_MS = 1000 * 60 * 60 * 2; // 2 hours
  private readonly HMAC_ALGORITHM = "sha256";

  /**
   * Get CSRF secret for HMAC signing
   */
  private getCsrfSecret(): string {
    const secret = ENV.cookieSecret;
    if (!secret || secret.length < 32) {
      throw new Error(
        "[CSRF] cookieSecret must be set and at least 32 characters; set JWT_SECRET or cookieSecret"
      );
    }
    return secret;
  }

  /**
   * Generate a new CSRF token
   */
  generateCsrfToken(sessionId: string): CsrfTokenData {
    const secret = randomBytes(this.SECRET_LENGTH).toString("hex");
    const timestamp = Date.now().toString();
    const expiresAt = new Date(Date.now() + this.TOKEN_EXPIRY_MS);

    // Create token payload: sessionId:timestamp:secret
    const payload = `${sessionId}:${timestamp}:${secret}`;

    // Sign the payload with HMAC
    const hmac = createHmac(this.HMAC_ALGORITHM, this.getCsrfSecret());
    hmac.update(payload);
    const signature = hmac.digest("hex");

    // Token format: base64(payload:signature)
    const token = Buffer.from(`${payload}:${signature}`).toString("base64");

    return {
      token,
      secret,
      expiresAt,
    };
  }

  /**
   * Validate CSRF token
   */
  validateCsrfToken(token: string, sessionId: string): boolean {
    if (!token || !sessionId) {
      return false;
    }

    try {
      // Decode the token
      const decoded = Buffer.from(token, "base64").toString("utf8");
      const parts = decoded.split(":");

      if (parts.length !== 4) {
        return false;
      }

      const [tokenSessionId, timestamp, secret, signature] = parts;

      // Verify session ID matches
      if (tokenSessionId !== sessionId) {
        return false;
      }

      // Check if token has expired
      const tokenTime = Number.parseInt(timestamp, 10);
      if (
        Number.isNaN(tokenTime) ||
        Date.now() - tokenTime > this.TOKEN_EXPIRY_MS
      ) {
        return false;
      }

      // Verify HMAC signature
      const payload = `${tokenSessionId}:${timestamp}:${secret}`;
      const hmac = createHmac(this.HMAC_ALGORITHM, this.getCsrfSecret());
      hmac.update(payload);
      const expectedSignature = hmac.digest("hex");

      // Use timing-safe comparison
      return this.timingSafeEqual(signature, expectedSignature);
    } catch (error) {
      console.warn("[CSRF] Token validation error:", error);
      return false;
    }
  }

  /**
   * Timing-safe string comparison to prevent timing attacks
   */
  private timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      const ca = a.codePointAt(i) ?? 0;
      const cb = b.codePointAt(i) ?? 0;
      result |= ca ^ cb;
    }

    return result === 0;
  }

  /**
   * Extract CSRF token from request headers or body
   */
  extractCsrfToken(req: Request): string | null {
    // Check X-CSRF-Token header first
    const headerToken = req.headers["x-csrf-token"] as string;
    if (headerToken) {
      return headerToken;
    }

    // Check request body
    const bodyToken = req.body?._csrf || req.body?.csrfToken;
    if (bodyToken) {
      return bodyToken;
    }

    // Check query parameters (less secure, but sometimes necessary)
    const queryToken = req.query._csrf || req.query.csrfToken;
    if (typeof queryToken === "string") {
      return queryToken;
    }

    return null;
  }

  /**
   * CSRF protection middleware
   */
  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      // Skip CSRF protection for safe methods
      const safeMethods = ["GET", "HEAD", "OPTIONS"];
      if (safeMethods.includes(req.method)) {
        return next();
      }

      // Skip for API endpoints that use other authentication methods
      const skipPaths = ["/api/auth/login", "/api/auth/logout"];
      if (skipPaths.some(path => req.path.startsWith(path))) {
        return next();
      }

      try {
        // Get session ID from request (assuming it's available from auth middleware)
        const sessionId = (req as any).sessionId;
        if (!sessionId) {
          return res.status(401).json({ error: "No active session" });
        }

        // Extract CSRF token from request
        const csrfToken = this.extractCsrfToken(req);
        if (!csrfToken) {
          await this.logCsrfViolation(req, "Missing CSRF token");
          return res.status(403).json({ error: "CSRF token required" });
        }

        // Validate CSRF token
        const isValid = this.validateCsrfToken(csrfToken, sessionId);
        if (!isValid) {
          await this.logCsrfViolation(req, "Invalid CSRF token");
          return res.status(403).json({ error: "Invalid CSRF token" });
        }

        next();
      } catch (error) {
        console.error("[CSRF] Middleware error:", error);
        res.status(500).json({ error: "CSRF validation error" });
      }
    };
  }

  /**
   * Log CSRF violation as security event
   */
  private async logCsrfViolation(
    req: Request,
    description: string
  ): Promise<void> {
    try {
      await createSecurityEvent({
        type: "csrf_violation",
        severity: "high",
        description,
        details: JSON.stringify({
          method: req.method,
          path: req.path,
          headers: {
            "user-agent": req.headers["user-agent"],
            referer: req.headers.referer,
            "x-csrf-token": req.headers["x-csrf-token"],
          },
        }),
        userId: (req as any).userId,
        ipAddress: this.getClientIp(req),
        userAgent: req.headers["user-agent"],
        endpoint: `${req.method} ${req.path}`,
        resolved: false,
        createdAt: new Date(),
      });
    } catch (error) {
      console.error("[CSRF] Failed to log violation:", error);
    }
  }

  /**
   * Get client IP address from request
   */
  private getClientIp(req: Request): string {
    const forwarded = req.headers["x-forwarded-for"] as string;
    if (forwarded) {
      return forwarded.split(",")[0].trim();
    }

    const realIp = req.headers["x-real-ip"] as string;
    if (realIp) {
      return realIp;
    }

    return req.socket.remoteAddress || "unknown";
  }

  /**
   * Generate CSRF token for response
   */
  generateTokenForResponse(sessionId: string): string {
    const tokenData = this.generateCsrfToken(sessionId);
    return tokenData.token;
  }

  /**
   * Add CSRF token to response headers
   */
  addTokenToResponse(res: Response, sessionId: string): void {
    const token = this.generateTokenForResponse(sessionId);
    res.setHeader("X-CSRF-Token", token);
  }

  // =============================================================================
  // TRPC COMPATIBILITY METHODS (for use in trpc.ts middleware)
  // =============================================================================

  /**
   * Get CSRF token from TRPC context headers
   * Compatible with csrfProtectionService.getTokenFromHeaders
   */
  getTokenFromHeaders(ctx: { req: Request }): string | undefined {
    return this.extractCsrfToken(ctx.req) || undefined;
  }

  /**
   * Get CSRF token from TRPC context cookies
   * Compatible with csrfProtectionService.getTokenFromCookies
   */
  getTokenFromCookies(ctx: { req: Request }): string | undefined {
    const cookieHeader = ctx.req.headers.cookie;
    if (!cookieHeader) return undefined;

    // Parse cookies and look for CSRF token cookie
    const cookies = cookieHeader.split(";").reduce(
      (acc, cookie) => {
        const [key, value] = cookie.trim().split("=");
        if (key && value) {
          acc[key] = decodeURIComponent(value);
        }
        return acc;
      },
      {} as Record<string, string>
    );

    return cookies["csrf-token"] || cookies["_csrf"] || undefined;
  }

  /**
   * Validate CSRF token for TRPC context
   * Compatible with csrfProtectionService.validateToken
   */
  validateToken(
    tokenFromHeader: string | undefined,
    tokenFromCookie: string | undefined,
    ctx: { user?: { sessionId?: string } }
  ): boolean {
    const token = tokenFromHeader || tokenFromCookie;
    if (!token) return false;

    // Get session ID from context
    const sessionId = ctx.user?.sessionId;
    if (!sessionId) {
      // For unauthenticated requests, just check token format validity
      return token.length > 0;
    }

    return this.validateCsrfToken(token, sessionId);
  }
}

export const csrfProtection = new CsrfProtectionService();

// Re-export as csrfProtectionService for backward compatibility with trpc.ts
export const csrfProtectionService = csrfProtection;
