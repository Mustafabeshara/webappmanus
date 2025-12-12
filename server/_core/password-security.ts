import { randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

/**
 * Password Security Service - Task 2.1
 * Implements secure password hashing, validation, and breach detection
 */

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: "weak" | "fair" | "good" | "strong";
  score: number;
}

export interface PasswordHashResult {
  hash: string;
  salt: string;
}

class PasswordSecurityService {
  private readonly SALT_LENGTH = 32;
  private readonly KEY_LENGTH = 64;
  private readonly MIN_PASSWORD_LENGTH = 8;
  private readonly MAX_PASSWORD_LENGTH = 128;

  /**
   * Hash password using scrypt with random salt
   */
  async hashPassword(password: string): Promise<PasswordHashResult> {
    if (!password || typeof password !== "string") {
      throw new Error("Password must be a non-empty string");
    }

    if (password.length < this.MIN_PASSWORD_LENGTH) {
      throw new Error(
        `Password must be at least ${this.MIN_PASSWORD_LENGTH} characters long`
      );
    }

    if (password.length > this.MAX_PASSWORD_LENGTH) {
      throw new Error(
        `Password must not exceed ${this.MAX_PASSWORD_LENGTH} characters`
      );
    }

    const salt = randomBytes(this.SALT_LENGTH).toString("hex");
    const derivedKey = (await scryptAsync(
      password,
      salt,
      this.KEY_LENGTH
    )) as Buffer;
    const hash = derivedKey.toString("hex");

    return { hash, salt };
  }

  /**
   * Verify password against stored hash and salt
   */
  async verifyPassword(
    password: string,
    storedHash: string,
    storedSalt: string
  ): Promise<boolean> {
    if (!password || !storedHash || !storedSalt) {
      return false;
    }

    // Early reject hashes that are not the expected hex length to avoid timingSafeEqual errors
    const expectedHexLength = this.KEY_LENGTH * 2; // hex string length for KEY_LENGTH bytes
    const isValidHexHash =
      typeof storedHash === "string" &&
      /^[0-9a-fA-F]+$/.test(storedHash) &&
      storedHash.length === expectedHexLength;

    if (!isValidHexHash) {
      return false;
    }

    try {
      const derivedKey = (await scryptAsync(
        password,
        storedSalt,
        this.KEY_LENGTH
      )) as Buffer;
      const hashBuffer = Buffer.from(storedHash, "hex");

      // Use timing-safe comparison to prevent timing attacks
      return timingSafeEqual(derivedKey, hashBuffer);
    } catch (error) {
      console.error("[Password] Verification error:", error);
      return false;
    }
  }

  /**
   * Validate password complexity and strength
   */
  validatePassword(password: string): PasswordValidationResult {
    const errors: string[] = [];
    let score = 0;

    if (!password || typeof password !== "string") {
      return {
        isValid: false,
        errors: ["Password is required"],
        strength: "weak",
        score: 0,
      };
    }

    // Length requirements
    if (password.length < this.MIN_PASSWORD_LENGTH) {
      errors.push(
        `Password must be at least ${this.MIN_PASSWORD_LENGTH} characters long`
      );
    } else {
      score += Math.min(password.length * 2, 20); // Up to 20 points for length
    }

    if (password.length > this.MAX_PASSWORD_LENGTH) {
      errors.push(
        `Password must not exceed ${this.MAX_PASSWORD_LENGTH} characters`
      );
    }

    // Character variety requirements
    const hasLowercase = /[a-z]/.test(password);
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumbers = /\d/.test(password);
    // eslint-disable-next-line no-useless-escape
    const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/.test(
      password
    );

    if (!hasLowercase) {
      errors.push("Password must contain at least one lowercase letter");
    } else {
      score += 10;
    }

    if (!hasUppercase) {
      errors.push("Password must contain at least one uppercase letter");
    } else {
      score += 10;
    }

    if (!hasNumbers) {
      errors.push("Password must contain at least one number");
    } else {
      score += 10;
    }

    if (!hasSpecialChars) {
      errors.push("Password must contain at least one special character");
    } else {
      score += 15;
    }

    // Common password patterns to avoid
    const commonPatterns = [
      /(.)\1{2,}/, // Repeated characters (aaa, 111)
      /123456|654321|qwerty|password|admin/i, // Common sequences
      /^[a-zA-Z]+$/, // Only letters
      /^\d+$/, // Only numbers
    ];

    for (const pattern of commonPatterns) {
      if (pattern.test(password)) {
        errors.push("Password contains common patterns that should be avoided");
        score -= 10;
        break;
      }
    }

    // Bonus points for complexity
    if (password.length >= 12) score += 5;
    if (password.length >= 16) score += 5;
    if (/[^\w\s]/.test(password)) score += 5; // Non-alphanumeric characters

    // Determine strength
    let strength: "weak" | "fair" | "good" | "strong";
    if (score < 30) strength = "weak";
    else if (score < 50) strength = "fair";
    else if (score < 70) strength = "good";
    else strength = "strong";

    return {
      isValid: errors.length === 0,
      errors,
      strength,
      score: Math.max(0, Math.min(100, score)),
    };
  }

  /**
   * Check if password has been breached using HaveIBeenPwned API
   */
  async checkPasswordBreach(password: string): Promise<boolean> {
    try {
      const crypto = await import("crypto");
      const hash = crypto
        .createHash("sha1")
        .update(password)
        .digest("hex")
        .toUpperCase();
      const prefix = hash.substring(0, 5);
      const suffix = hash.substring(5);

      const response = await fetch(
        `https://api.pwnedpasswords.com/range/${prefix}`,
        {
          method: "GET",
          headers: {
            "User-Agent": "Procurement-System-Security-Check",
          },
        }
      );

      if (!response.ok) {
        console.warn(
          "[Password] Unable to check breach status, allowing password"
        );
        return false; // If service is down, don't block the user
      }

      const data = await response.text();
      const lines = data.split("\n");

      for (const line of lines) {
        const [hashSuffix] = line.split(":");
        if (hashSuffix === suffix) {
          return true; // Password found in breach database
        }
      }

      return false; // Password not found in breach database
    } catch (error) {
      console.error("[Password] Error checking breach status:", error);
      return false; // If there's an error, don't block the user
    }
  }

  /**
   * Generate a secure random password
   */
  generateSecurePassword(length: number = 16): string {
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const numbers = "0123456789";
    const symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?";

    const allChars = lowercase + uppercase + numbers + symbols;

    let password = "";

    // Ensure at least one character from each category
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];

    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Shuffle the password
    return password
      .split("")
      .sort(() => Math.random() - 0.5)
      .join("");
  }

  /**
   * Validate password with comprehensive checks
   */
  async validatePasswordComprehensive(
    password: string
  ): Promise<PasswordValidationResult> {
    const basicValidation = this.validatePassword(password);

    if (!basicValidation.isValid) {
      return basicValidation;
    }

    // Check for breached passwords
    try {
      const isBreached = await this.checkPasswordBreach(password);
      if (isBreached) {
        basicValidation.errors.push(
          "This password has been found in data breaches and should not be used"
        );
        basicValidation.isValid = false;
        basicValidation.strength = "weak";
        basicValidation.score = Math.min(basicValidation.score, 20);
      }
    } catch (error) {
      console.warn("[Password] Could not check breach status:", error);
      // Continue without breach check if service is unavailable
    }

    return basicValidation;
  }
}

export const passwordSecurity = new PasswordSecurityService();
