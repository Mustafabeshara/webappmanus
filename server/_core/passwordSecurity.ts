/**
 * Password Security Service
 *
 * Provides secure password hashing, validation, and policy enforcement.
 * Implements bcrypt hashing, strong password policies, account lockout,
 * and password history to prevent reuse.
 */

import bcrypt from "bcrypt";
import { auditLogger } from "./auditLogger";

// Password policy configuration
export const PASSWORD_POLICY = {
  MIN_LENGTH: 12,
  MAX_LENGTH: 128,
  REQUIRE_UPPERCASE: true,
  REQUIRE_LOWERCASE: true,
  REQUIRE_NUMBERS: true,
  REQUIRE_SPECIAL_CHARS: true,
  SPECIAL_CHARS: "!@#$%^&*()_+-=[]{}|;':\",./<>?",
  BCRYPT_ROUNDS: 12,
  PASSWORD_HISTORY_COUNT: 5, // Number of previous passwords to remember
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION_MS: 15 * 60 * 1000, // 15 minutes
  PASSWORD_EXPIRY_DAYS: 90,
};

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  score: number; // 0-100 password strength score
}

export interface AccountLockoutInfo {
  isLocked: boolean;
  failedAttempts: number;
  lockoutUntil: Date | null;
  remainingAttempts: number;
}

// In-memory store for login attempts (should be Redis in production)
const loginAttempts = new Map<string, { count: number; lastAttempt: Date; lockoutUntil: Date | null }>();

class PasswordSecurityService {
  /**
   * Hash a password using bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, PASSWORD_POLICY.BCRYPT_ROUNDS);
  }

  /**
   * Verify a password against a hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch {
      return false;
    }
  }

  /**
   * Validate password against security policy
   */
  validatePassword(password: string): PasswordValidationResult {
    const errors: string[] = [];
    let score = 0;

    // Length checks
    if (password.length < PASSWORD_POLICY.MIN_LENGTH) {
      errors.push(`Password must be at least ${PASSWORD_POLICY.MIN_LENGTH} characters long`);
    } else {
      score += 20;
      if (password.length >= 16) score += 10;
      if (password.length >= 20) score += 10;
    }

    if (password.length > PASSWORD_POLICY.MAX_LENGTH) {
      errors.push(`Password must not exceed ${PASSWORD_POLICY.MAX_LENGTH} characters`);
    }

    // Uppercase check
    if (PASSWORD_POLICY.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
      errors.push("Password must contain at least one uppercase letter");
    } else if (/[A-Z]/.test(password)) {
      score += 15;
    }

    // Lowercase check
    if (PASSWORD_POLICY.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
      errors.push("Password must contain at least one lowercase letter");
    } else if (/[a-z]/.test(password)) {
      score += 15;
    }

    // Number check
    if (PASSWORD_POLICY.REQUIRE_NUMBERS && !/[0-9]/.test(password)) {
      errors.push("Password must contain at least one number");
    } else if (/[0-9]/.test(password)) {
      score += 15;
    }

    // Special character check
    const specialCharRegex = new RegExp(`[${PASSWORD_POLICY.SPECIAL_CHARS.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&")}]`);
    if (PASSWORD_POLICY.REQUIRE_SPECIAL_CHARS && !specialCharRegex.test(password)) {
      errors.push("Password must contain at least one special character (!@#$%^&*...)");
    } else if (specialCharRegex.test(password)) {
      score += 15;
    }

    // Check for common patterns (reduces score)
    if (this.hasCommonPatterns(password)) {
      score -= 20;
      errors.push("Password contains common patterns that make it easier to guess");
    }

    // Check for sequential characters
    if (this.hasSequentialChars(password)) {
      score -= 10;
    }

    // Check for repeated characters
    if (this.hasRepeatedChars(password)) {
      score -= 10;
    }

    // Ensure score is within bounds
    score = Math.max(0, Math.min(100, score));

    return {
      isValid: errors.length === 0,
      errors,
      score,
    };
  }

  /**
   * Check if password contains common patterns
   */
  private hasCommonPatterns(password: string): boolean {
    const commonPatterns = [
      "password",
      "123456",
      "qwerty",
      "abc123",
      "letmein",
      "welcome",
      "admin",
      "login",
      "passw0rd",
      "p@ssword",
      "p@ssw0rd",
    ];

    const lowerPassword = password.toLowerCase();
    return commonPatterns.some((pattern) => lowerPassword.includes(pattern));
  }

  /**
   * Check for sequential characters (abc, 123, etc.)
   */
  private hasSequentialChars(password: string): boolean {
    const sequences = [
      "abcdefghijklmnopqrstuvwxyz",
      "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
      "0123456789",
      "qwertyuiop",
      "asdfghjkl",
      "zxcvbnm",
    ];

    for (const seq of sequences) {
      for (let i = 0; i < seq.length - 3; i++) {
        const forward = seq.slice(i, i + 4);
        const backward = forward.split("").reverse().join("");
        if (password.includes(forward) || password.includes(backward)) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Check for repeated characters (aaaa, 1111, etc.)
   */
  private hasRepeatedChars(password: string): boolean {
    return /(.)\1{3,}/.test(password);
  }

  /**
   * Check if password was used before (password history)
   */
  async isPasswordInHistory(
    password: string,
    passwordHistory: string[]
  ): Promise<boolean> {
    for (const historicHash of passwordHistory) {
      if (await this.verifyPassword(password, historicHash)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Record a failed login attempt
   */
  recordFailedLogin(
    identifier: string,
    userId?: number,
    ipAddress?: string
  ): AccountLockoutInfo {
    const now = new Date();
    const existing = loginAttempts.get(identifier);

    // Check if lockout has expired
    if (existing?.lockoutUntil && existing.lockoutUntil < now) {
      loginAttempts.delete(identifier);
    }

    const current = loginAttempts.get(identifier) || {
      count: 0,
      lastAttempt: now,
      lockoutUntil: null,
    };

    current.count += 1;
    current.lastAttempt = now;

    // Check if we should lock the account
    if (current.count >= PASSWORD_POLICY.MAX_LOGIN_ATTEMPTS) {
      current.lockoutUntil = new Date(now.getTime() + PASSWORD_POLICY.LOCKOUT_DURATION_MS);

      // Log security event
      auditLogger.logSecurityEvent({
        type: "suspicious_activity",
        severity: "high",
        description: `Account locked after ${current.count} failed login attempts`,
        details: {
          identifier,
          failedAttempts: current.count,
          lockoutUntil: current.lockoutUntil,
        },
        userId,
        ipAddress,
      });
    }

    loginAttempts.set(identifier, current);

    return {
      isLocked: current.lockoutUntil !== null && current.lockoutUntil > now,
      failedAttempts: current.count,
      lockoutUntil: current.lockoutUntil,
      remainingAttempts: Math.max(0, PASSWORD_POLICY.MAX_LOGIN_ATTEMPTS - current.count),
    };
  }

  /**
   * Check if an account is locked
   */
  checkAccountLockout(identifier: string): AccountLockoutInfo {
    const now = new Date();
    const existing = loginAttempts.get(identifier);

    if (!existing) {
      return {
        isLocked: false,
        failedAttempts: 0,
        lockoutUntil: null,
        remainingAttempts: PASSWORD_POLICY.MAX_LOGIN_ATTEMPTS,
      };
    }

    // Check if lockout has expired
    if (existing.lockoutUntil && existing.lockoutUntil < now) {
      loginAttempts.delete(identifier);
      return {
        isLocked: false,
        failedAttempts: 0,
        lockoutUntil: null,
        remainingAttempts: PASSWORD_POLICY.MAX_LOGIN_ATTEMPTS,
      };
    }

    return {
      isLocked: existing.lockoutUntil !== null && existing.lockoutUntil > now,
      failedAttempts: existing.count,
      lockoutUntil: existing.lockoutUntil,
      remainingAttempts: Math.max(0, PASSWORD_POLICY.MAX_LOGIN_ATTEMPTS - existing.count),
    };
  }

  /**
   * Clear failed login attempts (called on successful login)
   */
  clearFailedAttempts(identifier: string): void {
    loginAttempts.delete(identifier);
  }

  /**
   * Check if password needs to be changed (expired)
   */
  isPasswordExpired(lastPasswordChange: Date): boolean {
    const expiryDate = new Date(lastPasswordChange);
    expiryDate.setDate(expiryDate.getDate() + PASSWORD_POLICY.PASSWORD_EXPIRY_DAYS);
    return new Date() > expiryDate;
  }

  /**
   * Generate a secure random password
   */
  generateSecurePassword(length: number = 16): string {
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const numbers = "0123456789";
    const special = PASSWORD_POLICY.SPECIAL_CHARS;
    const allChars = uppercase + lowercase + numbers + special;

    let password = "";

    // Ensure at least one of each required type
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];

    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Shuffle the password
    return password
      .split("")
      .sort(() => Math.random() - 0.5)
      .join("");
  }

  /**
   * Get password policy as human-readable requirements
   */
  getPasswordRequirements(): string[] {
    const requirements: string[] = [];

    requirements.push(`At least ${PASSWORD_POLICY.MIN_LENGTH} characters long`);

    if (PASSWORD_POLICY.REQUIRE_UPPERCASE) {
      requirements.push("At least one uppercase letter (A-Z)");
    }
    if (PASSWORD_POLICY.REQUIRE_LOWERCASE) {
      requirements.push("At least one lowercase letter (a-z)");
    }
    if (PASSWORD_POLICY.REQUIRE_NUMBERS) {
      requirements.push("At least one number (0-9)");
    }
    if (PASSWORD_POLICY.REQUIRE_SPECIAL_CHARS) {
      requirements.push("At least one special character (!@#$%^&*...)");
    }

    requirements.push("No common passwords or patterns");
    requirements.push(`Cannot reuse last ${PASSWORD_POLICY.PASSWORD_HISTORY_COUNT} passwords`);

    return requirements;
  }
}

// Export singleton instance
export const passwordSecurityService = new PasswordSecurityService();
