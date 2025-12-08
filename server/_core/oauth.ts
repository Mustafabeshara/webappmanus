import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { expressRateLimit, RATE_LIMITS } from "./rateLimit";
import { nanoid } from "nanoid";

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
      const openId = `admin-${nanoid(10)}`;

      await db.upsertUser({
        openId,
        name: "Admin",
        email: null,
        loginMethod: "password",
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(openId, {
        name: "Admin",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.json({ success: true });
    } catch (error) {
      console.error("[Auth] Login failed", error);
      res.status(500).json({ error: "Login failed" });
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
