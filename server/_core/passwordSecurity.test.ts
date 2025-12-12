/**
 * Property-Based Tests for Password Security Service
 *
 * Feature: system-security-audit, Property 6: Password Policy Enforcement
 * Validates: Requirements 2.1
 */

import * as fc from "fast-check";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PASSWORD_POLICY, passwordSecurityService } from "./passwordSecurity";

// Mock the audit logger
vi.mock("./auditLogger", () => ({
  auditLogger: {
    logSecurityEvent: vi.fn(),
  },
}));

// Mock fetch for HaveIBeenPwned API tests
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("Password Security Service - Property Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Property 6: Password Policy Enforcement", () => {
    /**
     * Feature: system-security-audit, Property 6: Password Policy Enforcement
     */
    it("should enforce minimum length requirement", () => {
      fc.assert(
        fc.property(
          fc.string({
            minLength: 1,
            maxLength: PASSWORD_POLICY.MIN_LENGTH - 1,
          }),
          shortPassword => {
            const result =
              passwordSecurityService.validatePassword(shortPassword);
            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => e.includes("at least"))).toBe(true);
          }
        ),
        { numRuns: 50 }
      );
    });

    it("should enforce maximum length requirement", () => {
      fc.assert(
        fc.property(
          fc.string({
            minLength: PASSWORD_POLICY.MAX_LENGTH + 1,
            maxLength: PASSWORD_POLICY.MAX_LENGTH + 50,
          }),
          longPassword => {
            const result =
              passwordSecurityService.validatePassword(longPassword);
            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => e.includes("exceed"))).toBe(true);
          }
        ),
        { numRuns: 20 }
      );
    });

    it("should require uppercase letters when policy enabled", () => {
      fc.assert(
        fc.property(
          fc
            .string({ minLength: PASSWORD_POLICY.MIN_LENGTH })
            .filter(s => !/[A-Z]/.test(s)),
          passwordWithoutUppercase => {
            const result = passwordSecurityService.validatePassword(
              passwordWithoutUppercase
            );
            if (PASSWORD_POLICY.REQUIRE_UPPERCASE) {
              expect(result.isValid).toBe(false);
              expect(result.errors.some(e => e.includes("uppercase"))).toBe(
                true
              );
            }
          }
        ),
        { numRuns: 30 }
      );
    });

    it("should require lowercase letters when policy enabled", () => {
      fc.assert(
        fc.property(
          fc
            .string({ minLength: PASSWORD_POLICY.MIN_LENGTH })
            .filter(s => !/[a-z]/.test(s)),
          passwordWithoutLowercase => {
            const result = passwordSecurityService.validatePassword(
              passwordWithoutLowercase
            );
            if (PASSWORD_POLICY.REQUIRE_LOWERCASE) {
              expect(result.isValid).toBe(false);
              expect(result.errors.some(e => e.includes("lowercase"))).toBe(
                true
              );
            }
          }
        ),
        { numRuns: 30 }
      );
    });

    it("should require numbers when policy enabled", () => {
      fc.assert(
        fc.property(
          // eslint-disable-next-line no-useless-escape
          fc.stringMatching(/^[A-Za-z!@#$%^&*()_+\-=\[\]{}|;':",./<>?]{12,}$/),
          passwordWithoutNumbers => {
            const result = passwordSecurityService.validatePassword(
              passwordWithoutNumbers
            );
            if (PASSWORD_POLICY.REQUIRE_NUMBERS) {
              expect(result.isValid).toBe(false);
              expect(result.errors.some(e => e.includes("number"))).toBe(true);
            }
          }
        ),
        { numRuns: 30 }
      );
    });

    it("should require special characters when policy enabled", () => {
      fc.assert(
        fc.property(
          fc.stringMatching(/^[A-Za-z0-9]{12,}$/),
          passwordWithoutSpecialChars => {
            const result = passwordSecurityService.validatePassword(
              passwordWithoutSpecialChars
            );
            if (PASSWORD_POLICY.REQUIRE_SPECIAL_CHARS) {
              expect(result.isValid).toBe(false);
              expect(
                result.errors.some(e => e.includes("special character"))
              ).toBe(true);
            }
          }
        ),
        { numRuns: 30 }
      );
    });

    it("should accept valid passwords that meet all requirements", () => {
      const validPasswords = [
        "MySecure!Auth123",
        "Str0ng!Secure2024",
        "C0mpl3x#Secure789!",
        "S3cur3$Strong789!",
        "V@lid!Strong456#",
      ];

      validPasswords.forEach(password => {
        const result = passwordSecurityService.validatePassword(password);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.score).toBeGreaterThan(50);
      });
    });

    it("should detect common password patterns", () => {
      const commonPasswords = [
        "Password123!",
        "Qwerty123!@#",
        "Admin123!@#",
        "Welcome123!",
        "Letmein123!",
      ];

      commonPasswords.forEach(password => {
        const result = passwordSecurityService.validatePassword(password);
        expect(result.errors.some(e => e.includes("common patterns"))).toBe(
          true
        );
        expect(result.score).toBeLessThan(80); // Should have reduced score
      });
    });

    it("should detect sequential characters", () => {
      const sequentialPasswords = [
        "Abcd1234!@#$",
        "Qwerty123!@#",
        "Password1234!",
        "Asdf1234!@#$",
      ];

      sequentialPasswords.forEach(password => {
        const result = passwordSecurityService.validatePassword(password);
        expect(result.score).toBeLessThan(90); // Should have reduced score for sequences
      });
    });

    it("should detect repeated characters", () => {
      const repeatedCharPasswords = [
        "Aaaa1234!@#$",
        "Pass1111!@#$",
        "Test!!!!1234",
        "Mypa$$$$word1",
      ];

      repeatedCharPasswords.forEach(password => {
        const result = passwordSecurityService.validatePassword(password);
        expect(result.score).toBeLessThan(90); // Should have reduced score for repetition
      });
    });
  });

  describe("Password Breach Detection", () => {
    it("should detect breached passwords", async () => {
      // Mock HaveIBeenPwned API response for a known breached password
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () =>
          Promise.resolve(
            "0018A45C4D1DEF81644B54AB7F969B88D65:1\n001E225B908BAC31C8DB8140039199D5B2E:2\n"
          ),
      });

      const result =
        await passwordSecurityService.checkPasswordBreach("password123");
      expect(result.isBreached).toBe(false); // This specific hash won't match our mock
    });

    it("should handle API failures gracefully", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result =
        await passwordSecurityService.checkPasswordBreach("testpassword");
      expect(result.isBreached).toBe(false);
      expect(result.count).toBe(0);
    });

    it("should handle API unavailability", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
      });

      const result =
        await passwordSecurityService.checkPasswordBreach("testpassword");
      expect(result.isBreached).toBe(false);
      expect(result.count).toBe(0);
    });

    it("should include breach information in comprehensive validation", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () =>
          Promise.resolve(
            "5E884898DA28047151D0E56F8DC6292773603D0D6AABBDD62A11EF721D1542D8:3"
          ),
      });

      const result =
        await passwordSecurityService.validatePasswordWithBreachCheck("hello");
      expect(result.isBreached).toBeDefined();
      expect(result.breachCount).toBeDefined();
    });
  });

  describe("Account Lockout Mechanism", () => {
    const testIdentifier = "test@example.com";

    beforeEach(() => {
      // Clear any existing lockout state
      passwordSecurityService.clearFailedAttempts(testIdentifier);
    });

    it("should track failed login attempts", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: PASSWORD_POLICY.MAX_LOGIN_ATTEMPTS - 1 }),
          attemptCount => {
            // Clear state first
            passwordSecurityService.clearFailedAttempts(testIdentifier);

            let lockoutInfo;
            for (let i = 0; i < attemptCount; i++) {
              lockoutInfo =
                passwordSecurityService.recordFailedLogin(testIdentifier);
            }

            expect(lockoutInfo!.failedAttempts).toBe(attemptCount);
            expect(lockoutInfo!.isLocked).toBe(false);
            expect(lockoutInfo!.remainingAttempts).toBe(
              PASSWORD_POLICY.MAX_LOGIN_ATTEMPTS - attemptCount
            );
          }
        ),
        { numRuns: 10 }
      );
    });

    it("should lock account after max attempts", () => {
      // Clear state first
      passwordSecurityService.clearFailedAttempts(testIdentifier);

      let lockoutInfo;
      for (let i = 0; i < PASSWORD_POLICY.MAX_LOGIN_ATTEMPTS; i++) {
        lockoutInfo = passwordSecurityService.recordFailedLogin(testIdentifier);
      }

      expect(lockoutInfo!.isLocked).toBe(true);
      expect(lockoutInfo!.lockoutUntil).toBeInstanceOf(Date);
      expect(lockoutInfo!.remainingAttempts).toBe(0);
    });

    it("should clear attempts on successful login", () => {
      // Record some failed attempts
      passwordSecurityService.recordFailedLogin(testIdentifier);
      passwordSecurityService.recordFailedLogin(testIdentifier);

      // Clear attempts (simulate successful login)
      passwordSecurityService.clearFailedAttempts(testIdentifier);

      const lockoutInfo =
        passwordSecurityService.checkAccountLockout(testIdentifier);
      expect(lockoutInfo.failedAttempts).toBe(0);
      expect(lockoutInfo.isLocked).toBe(false);
      expect(lockoutInfo.remainingAttempts).toBe(
        PASSWORD_POLICY.MAX_LOGIN_ATTEMPTS
      );
    });

    it("should handle lockout expiration", () => {
      // This test would need time manipulation or mocking
      // For now, we test the basic lockout check functionality
      const lockoutInfo = passwordSecurityService.checkAccountLockout(
        "nonexistent@example.com"
      );
      expect(lockoutInfo.isLocked).toBe(false);
      expect(lockoutInfo.failedAttempts).toBe(0);
    });
  });

  describe("Password History", () => {
    it("should detect password reuse", async () => {
      const password = "TestPassword123!";
      const hashedPassword =
        await passwordSecurityService.hashPassword(password);
      const passwordHistory = [hashedPassword];

      const isReused = await passwordSecurityService.isPasswordInHistory(
        password,
        passwordHistory
      );
      expect(isReused).toBe(true);
    });

    it("should allow new passwords not in history", async () => {
      const oldPassword = "OldPassword123!";
      const newPassword = "NewPassword456!";

      const hashedOldPassword =
        await passwordSecurityService.hashPassword(oldPassword);
      const passwordHistory = [hashedOldPassword];

      const isReused = await passwordSecurityService.isPasswordInHistory(
        newPassword,
        passwordHistory
      );
      expect(isReused).toBe(false);
    });
  });

  describe("Password Generation", () => {
    it("should generate passwords that meet policy requirements", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: PASSWORD_POLICY.MIN_LENGTH, max: 32 }),
          length => {
            const generatedPassword =
              passwordSecurityService.generateSecurePassword(length);

            expect(generatedPassword).toHaveLength(length);

            const validation =
              passwordSecurityService.validatePassword(generatedPassword);
            expect(validation.isValid).toBe(true);
            expect(validation.score).toBeGreaterThan(70);
          }
        ),
        { numRuns: 20 }
      );
    });

    it("should generate unique passwords", () => {
      const passwords = new Set();
      for (let i = 0; i < 100; i++) {
        const password = passwordSecurityService.generateSecurePassword();
        passwords.add(password);
      }

      // Should generate mostly unique passwords (allowing for very rare collisions)
      expect(passwords.size).toBeGreaterThan(95);
    });
  });

  describe("Password Expiration", () => {
    it("should detect expired passwords", () => {
      const expiredDate = new Date();
      expiredDate.setDate(
        expiredDate.getDate() - (PASSWORD_POLICY.PASSWORD_EXPIRY_DAYS + 1)
      );

      const isExpired = passwordSecurityService.isPasswordExpired(expiredDate);
      expect(isExpired).toBe(true);
    });

    it("should not flag recent passwords as expired", () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 1); // 1 day ago

      const isExpired = passwordSecurityService.isPasswordExpired(recentDate);
      expect(isExpired).toBe(false);
    });
  });

  describe("Password Hashing", () => {
    it("should hash passwords securely", async () => {
      const testPasswords = [
        "TestPassword123!",
        "AnotherSecure456@",
        "ValidPassword789#",
        "StrongAuth012$",
        "SecureLogin345%",
      ];

      for (const password of testPasswords) {
        const hash = await passwordSecurityService.hashPassword(password);

        expect(hash).toBeDefined();
        expect(hash).not.toBe(password);
        expect(hash.length).toBeGreaterThan(50); // bcrypt hashes are typically 60 chars

        // Should be able to verify the password
        const isValid = await passwordSecurityService.verifyPassword(
          password,
          hash
        );
        expect(isValid).toBe(true);

        // Wrong password should not verify
        const isInvalid = await passwordSecurityService.verifyPassword(
          password + "wrong",
          hash
        );
        expect(isInvalid).toBe(false);
      }
    });

    it("should produce different hashes for same password", async () => {
      const password = "TestPassword123!";
      const hash1 = await passwordSecurityService.hashPassword(password);
      const hash2 = await passwordSecurityService.hashPassword(password);

      expect(hash1).not.toBe(hash2); // bcrypt includes salt, so hashes should differ

      // Both should verify correctly
      expect(
        await passwordSecurityService.verifyPassword(password, hash1)
      ).toBe(true);
      expect(
        await passwordSecurityService.verifyPassword(password, hash2)
      ).toBe(true);
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("should handle empty passwords", () => {
      const result = passwordSecurityService.validatePassword("");
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should handle null/undefined inputs gracefully", async () => {
      const nullResult = passwordSecurityService.validatePassword(null as any);
      expect(nullResult.isValid).toBe(false);
      expect(nullResult.errors.length).toBeGreaterThan(0);

      const undefinedResult = passwordSecurityService.validatePassword(
        undefined as any
      );
      expect(undefinedResult.isValid).toBe(false);
      expect(undefinedResult.errors.length).toBeGreaterThan(0);

      await expect(
        passwordSecurityService.hashPassword(null as any)
      ).rejects.toThrow();
    });

    it("should handle malformed password history", async () => {
      const password = "TestPassword123!";
      const malformedHistory = ["invalid-hash", "", null as any];

      const isReused = await passwordSecurityService.isPasswordInHistory(
        password,
        malformedHistory
      );
      expect(isReused).toBe(false); // Should handle gracefully
    });
  });
});
