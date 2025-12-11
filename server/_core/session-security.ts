import { randomBytes } from "crypto";
import { SignJWT, jwtVerify } from "jose";
import * as db from "../db";
import { ENV } from "./env";

/**
 * Session Security Service - Task 2.3, 2.4, 2.5
 * Enhanced session management with secure token generation and validation
 */

export interface SessionData {
  sessionId: string;
  userId: number;
  openId: string;
  name: string;
  ipAddress: string;
  userAgent?: string;
  createdAt: Date;
  lastAccessedAt: Date;
  expiresAt: Date;
}

export interface SessionValidationResult {
  isValid: boolean;
  session?: SessionData;
  error?: string;
}

class SessionSecurityService {
  private readonly SESSION_DURATION_MS = ENV.isProduction
    ? 1000 * 60 * 60 * 8
    : 1000 * 60 * 60 * 24; // 8 hours prod, 24 hours dev
  private readonly REFRESH_THRESHOLD_MS = 1000 * 60 * 30; // 30 minutes before expiry
  private readonly MAX_SESSIONS_PER_USER = 5;

  /**
   * Generate cryptographically secure session ID
   */
  private generateSecureSessionId(): string {
    return randomBytes(32).toString("hex");
  }

  /**
   * Get session secret for JWT signing
   */
  private getSessionSecret(): Uint8Array {
    const secret = ENV.cookieSecret || "default-dev-secret-change-in-prod";
    return new TextEncoder().encode(secret);
  }

  /**
   * Create a new secure session
   */
  async createSession(
    userId: number,
    openId: string,
    name: string,
    ipAddress: string,
    userAgent?: string
  ): Promise<{ sessionToken: string; sessionId: string }> {
    const sessionId = this.generateSecureSessionId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.SESSION_DURATION_MS);

    // Clean up old sessions for this user (keep only the most recent ones)
    await this.cleanupUserSessions(userId);

    // Create session record in database
    const db_instance = await db.getDb();
    if (db_instance) {
      try {
        await db_instance.insert(db.sessions).values({
          sessionId,
          userId,
          createdAt: now,
          lastAccessedAt: now,
          expiresAt,
          ipAddress,
          userAgent: userAgent || null,
          isActive: true,
        });
      } catch (error) {
        console.error("[Session] Failed to create session record:", error);
      }
    }

    // Create JWT token
    const sessionToken = await this.signSessionToken({
      sessionId,
      userId,
      openId,
      name,
      ipAddress,
      createdAt: now,
      expiresAt,
    });

    return { sessionToken, sessionId };
  }

  /**
   * Sign session data into JWT token
   */
  private async signSessionToken(sessionData: {
    sessionId: string;
    userId: number;
    openId: string;
    name: string;
    ipAddress: string;
    createdAt: Date;
    expiresAt: Date;
  }): Promise<string> {
    const secretKey = this.getSessionSecret();
    const expirationSeconds = Math.floor(
      sessionData.expiresAt.getTime() / 1000
    );

    return new SignJWT({
      sessionId: sessionData.sessionId,
      userId: sessionData.userId,
      openId: sessionData.openId,
      name: sessionData.name,
      ipAddress: sessionData.ipAddress,
      createdAt: sessionData.createdAt.toISOString(),
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(expirationSeconds)
      .setIssuedAt()
      .setNotBefore(Math.floor(sessionData.createdAt.getTime() / 1000))
      .sign(secretKey);
  }

  /**
   * Validate and verify session token
   */
  async validateSession(
    sessionToken: string,
    currentIpAddress: string,
    currentUserAgent?: string
  ): Promise<SessionValidationResult> {
    if (!sessionToken) {
      return { isValid: false, error: "No session token provided" };
    }

    try {
      // Verify JWT token
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(sessionToken, secretKey, {
        algorithms: ["HS256"],
      });

      const sessionId = payload.sessionId as string;
      const userId = payload.userId as number;
      const openId = payload.openId as string;
      const name = payload.name as string;
      const tokenIpAddress = payload.ipAddress as string;
      const createdAt = new Date(payload.createdAt as string);

      if (!sessionId || !userId || !openId || !name) {
        return { isValid: false, error: "Invalid session token payload" };
      }

      // Verify session exists in database and is active
      const db_instance = await db.getDb();
      if (!db_instance) {
        return { isValid: false, error: "Database not available" };
      }

      const sessionRecord = await db_instance
        .select()
        .from(db.sessions)
        .where(db.eq(db.sessions.sessionId, sessionId))
        .limit(1);

      if (sessionRecord.length === 0) {
        return { isValid: false, error: "Session not found" };
      }

      const session = sessionRecord[0];

      if (!session.isActive) {
        return { isValid: false, error: "Session is inactive" };
      }

      if (session.expiresAt < new Date()) {
        // Session expired, mark as inactive
        await this.invalidateSession(sessionId);
        return { isValid: false, error: "Session expired" };
      }

      // IP address validation (with some flexibility for mobile networks)
      if (ENV.isProduction && tokenIpAddress !== currentIpAddress) {
        console.warn(
          `[Session] IP address mismatch for session ${sessionId}: ${tokenIpAddress} vs ${currentIpAddress}`
        );
        // In production, this might be too strict for mobile users, so we log but don't reject
        // await this.invalidateSession(sessionId);
        // return { isValid: false, error: 'Session security violation' };
      }

      // Update last accessed time
      await db_instance
        .update(db.sessions)
        .set({ lastAccessedAt: new Date() })
        .where(db.eq(db.sessions.sessionId, sessionId));

      const sessionData: SessionData = {
        sessionId,
        userId,
        openId,
        name,
        ipAddress: currentIpAddress,
        userAgent: currentUserAgent,
        createdAt,
        lastAccessedAt: new Date(),
        expiresAt: session.expiresAt,
      };

      return { isValid: true, session: sessionData };
    } catch (error) {
      console.warn("[Session] Token validation failed:", error);
      return { isValid: false, error: "Invalid session token" };
    }
  }

  /**
   * Refresh session if close to expiry
   */
  async refreshSessionIfNeeded(
    sessionToken: string,
    ipAddress: string,
    userAgent?: string
  ): Promise<{ newToken?: string; sessionId: string } | null> {
    const validation = await this.validateSession(
      sessionToken,
      ipAddress,
      userAgent
    );

    if (!validation.isValid || !validation.session) {
      return null;
    }

    const session = validation.session;
    const timeUntilExpiry = session.expiresAt.getTime() - Date.now();

    // If session expires within the refresh threshold, create a new one
    if (timeUntilExpiry < this.REFRESH_THRESHOLD_MS) {
      const { sessionToken: newToken, sessionId } = await this.createSession(
        session.userId,
        session.openId,
        session.name,
        ipAddress,
        userAgent
      );

      // Invalidate the old session
      await this.invalidateSession(session.sessionId);

      return { newToken, sessionId };
    }

    return { sessionId: session.sessionId };
  }

  /**
   * Invalidate a specific session
   */
  async invalidateSession(sessionId: string): Promise<void> {
    const db_instance = await db.getDb();
    if (!db_instance) {
      console.error(
        "[Session] Cannot invalidate session: database not available"
      );
      return;
    }

    try {
      await db_instance
        .update(db.sessions)
        .set({ isActive: false })
        .where(db.eq(db.sessions.sessionId, sessionId));
    } catch (error) {
      console.error("[Session] Failed to invalidate session:", error);
    }
  }

  /**
   * Invalidate all sessions for a user (logout from all devices)
   */
  async invalidateAllUserSessions(userId: number): Promise<void> {
    const db_instance = await db.getDb();
    if (!db_instance) {
      console.error(
        "[Session] Cannot invalidate user sessions: database not available"
      );
      return;
    }

    try {
      await db_instance
        .update(db.sessions)
        .set({ isActive: false })
        .where(db.eq(db.sessions.userId, userId));
    } catch (error) {
      console.error("[Session] Failed to invalidate user sessions:", error);
    }
  }

  /**
   * Clean up old sessions for a user (keep only the most recent ones)
   */
  private async cleanupUserSessions(userId: number): Promise<void> {
    const db_instance = await db.getDb();
    if (!db_instance) {
      return;
    }

    try {
      // Get all active sessions for the user, ordered by creation date
      const userSessions = await db_instance
        .select()
        .from(db.sessions)
        .where(
          db.and(
            db.eq(db.sessions.userId, userId),
            db.eq(db.sessions.isActive, true)
          )
        )
        .orderBy(db.desc(db.sessions.createdAt));

      // If user has too many sessions, deactivate the oldest ones
      if (userSessions.length >= this.MAX_SESSIONS_PER_USER) {
        const sessionsToDeactivate = userSessions.slice(
          this.MAX_SESSIONS_PER_USER - 1
        );

        for (const session of sessionsToDeactivate) {
          await this.invalidateSession(session.sessionId);
        }
      }
    } catch (error) {
      console.error("[Session] Failed to cleanup user sessions:", error);
    }
  }

  /**
   * Clean up expired sessions (should be run periodically)
   */
  async cleanupExpiredSessions(): Promise<void> {
    const db_instance = await db.getDb();
    if (!db_instance) {
      return;
    }

    try {
      const now = new Date();
      await db_instance
        .update(db.sessions)
        .set({ isActive: false })
        .where(
          db.and(
            db.eq(db.sessions.isActive, true),
            db.lt(db.sessions.expiresAt, now)
          )
        );
    } catch (error) {
      console.error("[Session] Failed to cleanup expired sessions:", error);
    }
  }

  /**
   * Get active sessions for a user
   */
  async getUserActiveSessions(userId: number): Promise<SessionData[]> {
    const db_instance = await db.getDb();
    if (!db_instance) {
      return [];
    }

    try {
      const sessions = await db_instance
        .select()
        .from(db.sessions)
        .where(
          db.and(
            db.eq(db.sessions.userId, userId),
            db.eq(db.sessions.isActive, true),
            db.gt(db.sessions.expiresAt, new Date())
          )
        )
        .orderBy(db.desc(db.sessions.lastAccessedAt));

      return sessions.map(session => ({
        sessionId: session.sessionId,
        userId: session.userId,
        openId: "", // Not stored in sessions table
        name: "", // Not stored in sessions table
        ipAddress: session.ipAddress,
        userAgent: session.userAgent || undefined,
        createdAt: session.createdAt,
        lastAccessedAt: session.lastAccessedAt,
        expiresAt: session.expiresAt,
      }));
    } catch (error) {
      console.error("[Session] Failed to get user sessions:", error);
      return [];
    }
  }
}

export const sessionSecurity = new SessionSecurityService();
