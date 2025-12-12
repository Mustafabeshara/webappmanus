import type { NextFunction, Request, Response } from "express";
import * as db from "../db";
import { auditLogging } from "./audit-logging";
import { csrfProtection } from "./csrf-protection";
import { inputValidation } from "./input-validation";
import { rateLimiting } from "./rate-limiting";
import { sdk } from "./sdk";

/**
 * Enhanced Authentication Middleware
 * Integrates all security services for comprehensive protection
 */

export interface AuthenticatedRequest extends Request {
  user: any;
  userId: number;
  sessionId: string;
  ipAddress: string;
}

/**
 * Authentication middleware with enhanced security
 */
export function authenticateRequest() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Rate limiting check
      const rateLimitResult = await rateLimiting.checkRateLimit(req);
      if (!rateLimitResult.allowed) {
        res.setHeader("X-RateLimit-Limit", rateLimitResult.info.limit);
        res.setHeader("X-RateLimit-Remaining", rateLimitResult.info.remaining);
        res.setHeader(
          "X-RateLimit-Reset",
          Math.ceil(rateLimitResult.info.resetTime.getTime() / 1000)
        );
        res.setHeader(
          "Retry-After",
          Math.ceil(
            (rateLimitResult.info.resetTime.getTime() - Date.now()) / 1000
          )
        );

        return res.status(429).json({
          error: "Too Many Requests",
          message: "Rate limit exceeded. Please try again later.",
        });
      }

      // Authenticate user
      const user = await sdk.authenticateRequest(req);

      // Add user info to request
      (req as any).user = user;
      (req as any).userId = user.id;
      (req as any).sessionId = user.sessionId || "";
      (req as any).ipAddress = getClientIp(req);

      // Add CSRF token to response for authenticated users
      if (user.sessionId) {
        csrfProtection.addTokenToResponse(res, user.sessionId);
      }

      next();
    } catch (error) {
      console.error("[Auth] Authentication failed:", error);
      res.status(401).json({ error: "Authentication required" });
    }
  };
}

/**
 * Optional authentication middleware (doesn't fail if no auth)
 */
export function optionalAuthentication() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await sdk.authenticateRequest(req);
      (req as any).user = user;
      (req as any).userId = user.id;
      (req as any).sessionId = user.sessionId || "";
      (req as any).ipAddress = getClientIp(req);
    } catch (error) {
      // Continue without authentication
      (req as any).ipAddress = getClientIp(req);
    }
    next();
  };
}

/**
 * Permission checking middleware
 */
export function requirePermission(
  module: string,
  action: "view" | "create" | "edit" | "delete" | "approve"
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const user = await db.getUserById(userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      // Admin users have all permissions
      if (user.role === "admin") {
        return next();
      }

      // Check specific permissions
      const permissions = await db.getUserPermissions(userId);
      const modulePermission = permissions.find(p => p.module === module);

      if (!modulePermission) {
        await auditLogging.logAction({
          userId,
          action: "permission_denied",
          entityType: "permission",
          entityId: 0,
          metadata: { module, action, reason: "no_permission_record" },
          ipAddress: getClientIp(req),
          userAgent: req.headers["user-agent"],
          sessionId: (req as any).sessionId,
        });

        return res
          .status(403)
          .json({ error: "Access denied: No permissions for this module" });
      }

      let hasPermission = false;
      switch (action) {
        case "view":
          hasPermission = modulePermission.canView;
          break;
        case "create":
          hasPermission = modulePermission.canCreate;
          break;
        case "edit":
          hasPermission = modulePermission.canEdit;
          break;
        case "delete":
          hasPermission = modulePermission.canDelete;
          break;
        case "approve":
          hasPermission = modulePermission.canApprove;
          break;
      }

      if (!hasPermission) {
        await auditLogging.logAction({
          userId,
          action: "permission_denied",
          entityType: "permission",
          entityId: modulePermission.id,
          metadata: { module, action, reason: "insufficient_permission" },
          ipAddress: getClientIp(req),
          userAgent: req.headers["user-agent"],
          sessionId: (req as any).sessionId,
        });

        return res
          .status(403)
          .json({ error: `Access denied: Cannot ${action} in ${module}` });
      }

      next();
    } catch (error) {
      console.error("[Auth] Permission check failed:", error);
      res.status(500).json({ error: "Permission check failed" });
    }
  };
}

/**
 * Admin-only middleware
 */
export function requireAdmin() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const user = await db.getUserById(userId);
      if (!user || user.role !== "admin") {
        await auditLogging.logAction({
          userId,
          action: "admin_access_denied",
          entityType: "user",
          entityId: userId,
          metadata: { reason: "not_admin", userRole: user?.role },
          ipAddress: getClientIp(req),
          userAgent: req.headers["user-agent"],
          sessionId: (req as any).sessionId,
        });

        return res.status(403).json({ error: "Admin access required" });
      }

      next();
    } catch (error) {
      console.error("[Auth] Admin check failed:", error);
      res.status(500).json({ error: "Admin check failed" });
    }
  };
}

/**
 * Input validation middleware
 */
export function validateInput(schema: any) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = await inputValidation.validateWithThreatDetection(
        req.body,
        schema,
        {
          userId: (req as any).userId,
          ipAddress: getClientIp(req),
          userAgent: req.headers["user-agent"],
          endpoint: `${req.method} ${req.path}`,
        }
      );

      req.body = validatedData;
      next();
    } catch (error) {
      console.error("[Validation] Input validation failed:", error);
      res.status(400).json({
        error: "Invalid input",
        message: error instanceof Error ? error.message : "Validation failed",
      });
    }
  };
}

/**
 * CSRF protection middleware
 */
export function csrfProtectionMiddleware() {
  return csrfProtection.middleware();
}

/**
 * Rate limiting middleware
 */
export function rateLimitingMiddleware() {
  return rateLimiting.middleware();
}

/**
 * Audit logging middleware
 */
export function auditLoggingMiddleware() {
  return auditLogging.middleware();
}

/**
 * Security headers middleware
 */
export function securityHeaders() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Prevent clickjacking
    res.setHeader("X-Frame-Options", "DENY");

    // Prevent MIME type sniffing
    res.setHeader("X-Content-Type-Options", "nosniff");

    // Enable XSS protection
    res.setHeader("X-XSS-Protection", "1; mode=block");

    // Strict transport security (HTTPS only)
    if (req.secure) {
      res.setHeader(
        "Strict-Transport-Security",
        "max-age=31536000; includeSubDomains"
      );
    }

    // Content Security Policy
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: https:; " +
        "font-src 'self' data:; " +
        "connect-src 'self'; " +
        "frame-ancestors 'none';"
    );

    // Referrer Policy
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

    next();
  };
}

/**
 * Get client IP address from request
 */
function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"] as string;
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  const realIp = req.headers["x-real-ip"] as string;
  if (realIp) {
    return realIp;
  }

  return (
    req.socket?.remoteAddress || "unknown"
  );
}
