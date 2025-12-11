// Note: crypto polyfill is injected by esbuild banner in package.json build script

import { ForbiddenError } from "@shared/_core/errors";
import { COOKIE_NAME } from "@shared/const";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";
import { passwordSecurity } from "./password-security";
import { sessionSecurity } from "./session-security";
import { createSecurityEvent } from "./input-validation";

// Constants
const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;

// Utility function
const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

export type SessionPayload = {
  openId: string;
  appId: string;
  name: string;
};

class SDKServer {
  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION_MS = 1000 * 60 * 15; // 15 minutes

  private parseCookies(cookieHeader: string | undefined) {
    if (!cookieHeader) {
      return new Map<string, string>();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }

  private getSessionSecret() {
    const secret = ENV.cookieSecret || "default-dev-secret-change-in-prod";
    return new TextEncoder().encode(secret);
  }

  /**
   * Verify password with enhanced security
   */
  async verifyPassword(password: string, user?: User): Promise<boolean> {
    // For backward compatibility, check against ENV.adminPassword if no user provided
    if (!user) {
      return password === ENV.adminPassword;
    }

    // Check if user account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new Error(
        "Account is temporarily locked due to too many failed login attempts"
      );
    }

    // If user has no password hash, fall back to ENV.adminPassword (migration period)
    if (!user.passwordHash || !user.passwordSalt) {
      const isValid = password === ENV.adminPassword;
      if (!isValid) {
        await this.handleFailedLogin(user.id);
      }
      return isValid;
    }

    // Verify against stored hash
    const isValid = await passwordSecurity.verifyPassword(
      password,
      user.passwordHash,
      user.passwordSalt
    );

    if (!isValid) {
      await this.handleFailedLogin(user.id);
    } else {
      await this.handleSuccessfulLogin(user.id);
    }

    return isValid;
  }

  /**
   * Handle failed login attempt
   */
  private async handleFailedLogin(userId: number): Promise<void> {
    try {
      const user = await db.getUserById(userId);
      if (!user) return;

      const failedAttempts = (user.failedLoginAttempts || 0) + 1;
      const now = new Date();

      let lockedUntil: Date | null = null;
      if (failedAttempts >= this.MAX_LOGIN_ATTEMPTS) {
        lockedUntil = new Date(now.getTime() + this.LOCKOUT_DURATION_MS);
      }

      await db.updateUser(userId, {
        failedLoginAttempts: failedAttempts,
        lastFailedLoginAt: now,
        lockedUntil,
      });

      // Log security event
      await createSecurityEvent({
        type: "unauthorized_access",
        severity: failedAttempts >= this.MAX_LOGIN_ATTEMPTS ? "high" : "medium",
        description: `Failed login attempt ${failedAttempts}/${this.MAX_LOGIN_ATTEMPTS}`,
        userId,
        ipAddress: "unknown", // Will be filled by middleware
        resolved: false,
        createdAt: now,
      });
    } catch (error) {
      console.error("[Auth] Failed to handle failed login:", error);
    }
  }

  /**
   * Handle successful login
   */
  private async handleSuccessfulLogin(userId: number): Promise<void> {
    try {
      await db.updateUser(userId, {
        failedLoginAttempts: 0,
        lastFailedLoginAt: null,
        lockedUntil: null,
        lastLoginAt: new Date(),
      });
    } catch (error) {
      console.error("[Auth] Failed to handle successful login:", error);
    }
  }

  /**
   * Create a session token for a user with enhanced security
   */
  async createSessionToken(
    userId: number,
    openId: string,
    name: string,
    ipAddress: string,
    userAgent?: string
  ): Promise<string> {
    const { sessionToken } = await sessionSecurity.createSession(
      userId,
      openId,
      name,
      ipAddress,
      userAgent
    );
    return sessionToken;
  }

  /**
   * Legacy method for backward compatibility
   */
  async signSession(
    payload: SessionPayload,
    options: { expiresInMs?: number } = {}
  ): Promise<string> {
    const issuedAt = Date.now();
    const expiresInMs =
      options.expiresInMs ??
      (ENV.isProduction ? 1000 * 60 * 60 * 8 : ONE_YEAR_MS);
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1000);
    const secretKey = this.getSessionSecret();

    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name,
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(expirationSeconds)
      .sign(secretKey);
  }

  /**
   * Verify session with enhanced security
   */
  async verifySession(
    cookieValue: string | undefined | null,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{
    openId: string;
    appId: string;
    name: string;
    userId: number;
    sessionId: string;
  } | null> {
    if (!cookieValue) {
      return null;
    }

    // Try new session security first
    if (ipAddress) {
      const validation = await sessionSecurity.validateSession(
        cookieValue,
        ipAddress,
        userAgent
      );
      if (validation.isValid && validation.session) {
        return {
          openId: validation.session.openId,
          appId: ENV.appId,
          name: validation.session.name,
          userId: validation.session.userId,
          sessionId: validation.session.sessionId,
        };
      }
    }

    // Fallback to legacy JWT verification for backward compatibility
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"],
      });
      const { openId, appId, name } = payload as Record<string, unknown>;

      if (
        !isNonEmptyString(openId) ||
        !isNonEmptyString(appId) ||
        !isNonEmptyString(name)
      ) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }

      // For legacy sessions, we don't have userId or sessionId
      return { openId, appId, name, userId: 0, sessionId: "" };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }

  async authenticateRequest(
    req: Request
  ): Promise<User & { sessionId?: string }> {
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionCookie = cookies.get(COOKIE_NAME);
    const ipAddress = this.getClientIp(req);
    const userAgent = req.headers["user-agent"];

    const session = await this.verifySession(
      sessionCookie,
      ipAddress,
      userAgent
    );

    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }

    const sessionUserId = session.openId;
    const signedInAt = new Date();
    let user = await db.getUserByOpenId(sessionUserId);

    // If user not in DB, create them
    if (!user) {
      await db.upsertUser({
        openId: sessionUserId,
        name: session.name || "Admin",
        email: null,
        loginMethod: "password",
        lastSignedIn: signedInAt,
      });
      user = await db.getUserByOpenId(sessionUserId);
    }

    if (!user) {
      throw ForbiddenError("User not found");
    }

    await db.upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt,
    });

    return { ...user, sessionId: session.sessionId };
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

    return (
      req.connection?.remoteAddress || req.socket?.remoteAddress || "unknown"
    );
  }

  /**
   * Logout user by invalidating session
   */
  async logout(sessionId: string): Promise<void> {
    if (sessionId) {
      await sessionSecurity.invalidateSession(sessionId);
    }
  }

  /**
   * Logout user from all devices
   */
  async logoutAllDevices(userId: number): Promise<void> {
    await sessionSecurity.invalidateAllUserSessions(userId);
  }
}

export const sdk = new SDKServer();
