import { COOKIE_NAME } from "@shared/const";
import type { Express, Request, Response } from "express";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";
import { passwordSecurity } from "./password-security";
import { expressRateLimit, RATE_LIMITS } from "./rate-limiting";
import { sdk } from "./sdk";

const SESSION_COOKIE_MAX_AGE = 1000 * 60 * 60 * 24 * 7; // 7 days
const ADMIN_OPEN_ID = "admin-primary"; // Single fixed admin account
const allowInsecureDev =
  process.env.ALLOW_INSECURE_DEV === "true" && !ENV.isProduction;

/**
 * Initialize or get the single admin account with hashed password
 * This replaces the per-login account creation that was flooding the DB
 *
 * IMPORTANT: If ADMIN_PASSWORD env var changes, the stored hash will be
 * updated on next login attempt (password rotation support)
 */
async function ensureAdminAccount(): Promise<{
  id: number;
  openId: string;
} | null> {
  try {
    // Check if admin account exists
    let adminUser = await db.getUserByOpenId(ADMIN_OPEN_ID);

    if (!adminUser) {
      // Create admin account with hashed password from ENV
      const { hash, salt } = await passwordSecurity.hashPassword(
        ENV.adminPassword
      );

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

    return adminUser ?? null;
  } catch (error) {
    console.error("[Auth] Failed to ensure admin account:", error);
    return null;
  }
}

/**
 * Check if admin password needs rotation and update hash if ENV changed
 * Called when login fails - if ENV password validates but stored hash doesn't,
 * the ENV password was rotated and we need to update the stored hash
 */
async function checkAndRotateAdminPassword(user: any): Promise<boolean> {
  // Only applies to admin account
  if (user.openId !== ADMIN_OPEN_ID) return false;

  // If user has no hash, we can't determine if rotation is needed
  if (!user.passwordHash || !user.passwordSalt) return false;

  try {
    // Hash the current ENV password and compare
    const { hash: newHash, salt: newSalt } =
      await passwordSecurity.hashPassword(ENV.adminPassword);

    // Update the stored hash to match current ENV password
    await db.updateUser(user.id, {
      passwordHash: newHash,
      passwordSalt: newSalt,
      failedLoginAttempts: 0,
      lockedUntil: null,
    });

    console.log("[Auth] Admin password hash rotated to match ENV");
    return true;
  } catch (error) {
    console.error("[Auth] Failed to rotate admin password:", error);
    return false;
  }
}

function respondIfAdminPasswordInsecure(res: Response): boolean {
  if (!ENV.adminPassword || ENV.adminPassword.length < 12) {
    res
      .status(500)
      .json({ error: "Admin password is not configured securely" });
    return true;
  }

  if (!allowInsecureDev && ENV.adminPassword === "dev-admin-pass-12") {
    res
      .status(500)
      .json({ error: "Admin password is not configured securely" });
    return true;
  }

  return false;
}

function validatePasswordInput(
  password: unknown,
  res: Response
): password is string {
  if (!password || typeof password !== "string") {
    res.status(400).json({ error: "Password is required" });
    return false;
  }

  if (password.length > 128) {
    res.status(400).json({ error: "Password too long" });
    return false;
  }

  return true;
}

async function getAdminUserOrRespond(res: Response): Promise<User | null> {
  const adminUser = await ensureAdminAccount();
  if (!adminUser) {
    res.status(500).json({ error: "System error: admin account unavailable" });
    return null;
  }

  const user = await db.getUserById(adminUser.id);
  if (!user) {
    res.status(500).json({ error: "System error: admin account not found" });
    return null;
  }

  return user;
}

function respondIfLocked(user: any, res: Response): boolean {
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const retryAfterMs = user.lockedUntil.getTime() - Date.now();
    res.status(429).json({
      error: "LOCKED",
      message: "Account is temporarily locked due to too many failed attempts.",
      retryAfterMs,
    });
    return true;
  }

  return false;
}

async function verifyAdminPassword(
  password: string,
  user: any
): Promise<boolean> {
  let isValid = await sdk.verifyPassword(password, user);

  if (isValid || user.openId !== ADMIN_OPEN_ID) {
    return isValid;
  }

  if (password !== ENV.adminPassword) {
    return false;
  }

  const rotated = await checkAndRotateAdminPassword(user);
  if (!rotated) {
    return false;
  }

  const updatedUser = await db.getUserById(user.id);
  if (!updatedUser) {
    return false;
  }

  return sdk.verifyPassword(password, updatedUser);
}

export function registerOAuthRoutes(app: Express) {
  // Simple password login endpoint (replaces Manus OAuth)
  app.post(
    "/api/auth/login",
    expressRateLimit(RATE_LIMITS.auth),
    async (req: Request, res: Response) => {
      const { password } = req.body;

      if (respondIfAdminPasswordInsecure(res)) return;
      if (!validatePasswordInput(password, res)) return;

      try {
        const user = await getAdminUserOrRespond(res);
        if (!user) return;

        if (respondIfLocked(user, res)) return;

        const isValid = await verifyAdminPassword(password, user);

        if (!isValid) {
          res.status(401).json({ error: "Invalid password" });
          return;
        }

        // Create session for the single admin user
        const ipAddress =
          req.ip || req.headers["x-forwarded-for"]?.toString() || "unknown";
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
        res.cookie(COOKIE_NAME, sessionToken, {
          ...cookieOptions,
          maxAge: SESSION_COOKIE_MAX_AGE,
        });

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
    }
  );

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
