import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { expressRateLimit, RATE_LIMITS } from "./rateLimit";
import crypto from "crypto";

// Generate a random ID (replacement for nanoid to avoid crypto global issues)
function generateId(length = 10): string {
  return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
}

export function registerOAuthRoutes(app: Express) {
  // Simple password login endpoint (replaces Manus OAuth)
  app.post("/api/auth/login", expressRateLimit(RATE_LIMITS.auth), async (req: Request, res: Response) => {
    const { password } = req.body;

    if (!password) {
      res.status(400).json({ error: "Password is required" });
      return;
    }

    if (!sdk.verifyPassword(password)) {
      res.status(401).json({ error: "Invalid password" });
      return;
    }

    try {
      // Generate a unique user ID for this admin session
      const openId = `admin-${generateId(10)}`;
      console.log("[Auth] Creating user with openId:", openId);
      console.log("[Auth] DATABASE_URL:", process.env.DATABASE_URL?.substring(0, 30) + "...");

      await db.upsertUser({
        openId,
        name: "Admin",
        email: null,
        loginMethod: "password",
        role: "admin", // Admin password login grants admin role
        lastSignedIn: new Date(),
      });
      console.log("[Auth] User upserted successfully");

      const sessionToken = await sdk.createSessionToken(openId, {
        name: "Admin",
        expiresInMs: ONE_YEAR_MS,
      });
      console.log("[Auth] Session token created");

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.json({ success: true });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      const errStack = error instanceof Error ? error.stack : '';
      console.error("[Auth] Login failed:", errMsg);
      console.error("[Auth] Error stack:", errStack);
      res.status(500).json({ error: "Login failed", details: errMsg });
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
