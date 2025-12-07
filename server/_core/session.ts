import type { User } from "../../drizzle/schema";

/**
 * Session timeout configuration
 * Implements H5: Session Timeout Configuration
 */

// Session timeout: 24 hours
export const SESSION_TIMEOUT_MS = 24 * 60 * 60 * 1000;

// Inactivity timeout: 2 hours
export const INACTIVITY_TIMEOUT_MS = 2 * 60 * 60 * 1000;

/**
 * Check if user session has expired
 */
export function isSessionExpired(user: User | null): boolean {
  if (!user || !user.lastSignedIn) {
    return true;
  }

  const lastSignIn = new Date(user.lastSignedIn).getTime();
  const now = Date.now();
  const sessionAge = now - lastSignIn;

  return sessionAge > SESSION_TIMEOUT_MS;
}

/**
 * Check if user session is inactive
 */
export function isSessionInactive(lastActivity: Date | null): boolean {
  if (!lastActivity) {
    return false;
  }

  const lastActivityTime = new Date(lastActivity).getTime();
  const now = Date.now();
  const inactivityDuration = now - lastActivityTime;

  return inactivityDuration > INACTIVITY_TIMEOUT_MS;
}
