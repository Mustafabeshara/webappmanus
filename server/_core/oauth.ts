import { COOKIE_NAME } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { expressRateLimit, RATE_LIMITS } from "./rate-limiting";
import { passwordSecurity } from "./password-security";
import { ENV } from "./env";

const SESSION_COOKIE_MAX_AGE = 1000 * 60 * 60 * 24 * 7; // 7 days
const ADMIN_OPEN_ID = "admin-primary"; // Single fixed admin account

/**
 * Initialize or get the single admin account with hashed password
 * This replaces the per-login account creation that was flooding the DB
 */
async function ensureAdminAccount(): Promise<{ id: number; openId: string } | null> {
  try {
    // Check if admin account exists
    let adminUser = await db.getUserByOpenId(ADMIN_OPEN_ID);

    if (!adminUser) {
      // Create admin account with hashed password from ENV
      const { hash, salt } = await passwordSecurity.hashPassword(ENV.adminPassword);

      await db.upsertUser({
        openId: ADMIN_OPEN_ID,
        name: "Admin",
        email: null,
        loginMethod: "password",
        role: "admin",
        passwordHash: hash,
        passwordSalt: salt,
        lastSignedIn: new Date(),
      });

      adminUser = await db.getUserByOpenId(ADMIN_OPEN_ID);
      console.log("[Auth] Created admin account with hashed password");
    }

    return adminUser;
  } catch (error) {
    console.error("[Auth] Failed to ensure admin account:", error);
    return null;
  }
}

export function registerOAuthRoutes(app: Express) {
  // Simple password login endpoint (replaces Manus OAuth)
  app.post("/api/auth/login", expressRateLimit(RATE_LIMITS.auth), async (req: Request, res: Response) => {
    const { password } = req.body;

    // Input validation
    if (!password || typeof password !== "string") {
      res.status(400).json({ error: "Password is required" });
      return;
    }

    if (password.length > 128) {
      res.status(400).json({ error: "Password too long" });
      return;
    }

    try {
      // Get or create the single admin account
      const adminUser = await ensureAdminAccount();
      if (!adminUser) {
        res.status(500).json({ error: "System error: admin account unavailable" });
        return;
      }

      // Get full user record for lockout check
      const user = await db.getUserById(adminUser.id);
      if (!user) {
        res.status(500).json({ error: "System error: admin account not found" });
        return;
      }

      // Check if account is locked (per-user lockout)
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        const retryAfterMs = user.lockedUntil.getTime() - Date.now();
        res.status(429).json({
          error: "LOCKED",
          message: "Account is temporarily locked due to too many failed attempts.",
          retryAfterMs,
        });
        return;
      }

      // Verify password against stored hash (uses sdk.verifyPassword which handles per-user lockouts)
      const isValid = await sdk.verifyPassword(password, user);

      if (!isValid) {
        res.status(401).json({ error: "Invalid password" });
        return;
      }

      // Create session for the single admin user
      const ipAddress = req.ip || req.headers["x-forwarded-for"]?.toString() || "unknown";
      const userAgent = req.headers["user-agent"];
      const sessionToken = await sdk.createSessionToken(
        user.id,
        ADMIN_OPEN_ID,
        "Admin",
        ipAddress,
        userAgent
      );

      // Update last sign-in
      await db.upsertUser({
        openId: ADMIN_OPEN_ID,
        lastSignedIn: new Date(),
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: SESSION_COOKIE_MAX_AGE });

      console.log("[Auth] Admin login successful");
      res.json({ success: true });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error("[Auth] Login failed:", errMsg);

      // Don't expose internal error details
      if (errMsg.includes("temporarily locked")) {
        res.status(429).json({ error: errMsg });
      } else {
        res.status(500).json({ error: "Login failed" });
      }
    }
  });

  // Logout endpoint
  app.post("/api/auth/logout", async (req: Request, res: Response) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME, cookieOptions);
    res.json({ success: true });
  });

  // Legacy OAuth callback - redirect to home (for compatibility)
  app.get("/api/oauth/callback", (req: Request, res: Response) => {
    res.redirect(302, "/");
  });
}
