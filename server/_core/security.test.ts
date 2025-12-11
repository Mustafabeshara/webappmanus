/**
 * Security Tests - P3 Security Audit
 * Tests for authentication, CSRF protection, rate limiting, and input validation
 *
 * Note: Environment variables are set in server/test/setupTests.ts
 */

import { describe, it, expect } from "vitest";
import { passwordSecurity } from "./password-security";
import { csrfProtection } from "./csrf-protection";
import { inputValidation } from "./input-validation";
import { RATE_LIMITS, getClientId, isRateLimited } from "./rate-limiting";

// Mock Express request/response
const createMockRequest = (overrides = {}) => ({
  ip: "127.0.0.1",
  method: "POST",
  path: "/api/test",
  headers: {
    "user-agent": "test-agent",
    "x-forwarded-for": undefined,
    "x-real-ip": undefined,
  },
  body: {},
  query: {},
  connection: { remoteAddress: "127.0.0.1" },
  socket: { remoteAddress: "127.0.0.1" },
  ...overrides,
});

// ============================================
// PASSWORD SECURITY TESTS
// ============================================

describe("Password Security", () => {
  describe("hashPassword", () => {
    it("should generate a hash and salt", async () => {
      const result = await passwordSecurity.hashPassword("testPassword123");

      expect(result).toHaveProperty("hash");
      expect(result).toHaveProperty("salt");
      expect(typeof result.hash).toBe("string");
      expect(typeof result.salt).toBe("string");
      expect(result.hash.length).toBeGreaterThan(0);
      expect(result.salt.length).toBeGreaterThan(0);
    });

    it("should generate different salts for same password", async () => {
      const result1 = await passwordSecurity.hashPassword("testPassword123");
      const result2 = await passwordSecurity.hashPassword("testPassword123");

      expect(result1.salt).not.toBe(result2.salt);
      expect(result1.hash).not.toBe(result2.hash);
    });

    it("should reject empty passwords", async () => {
      await expect(passwordSecurity.hashPassword("")).rejects.toThrow();
    });
  });

  describe("verifyPassword", () => {
    it("should verify correct password", async () => {
      const password = "securePassword123!";
      const { hash, salt } = await passwordSecurity.hashPassword(password);

      const isValid = await passwordSecurity.verifyPassword(password, hash, salt);
      expect(isValid).toBe(true);
    });

    it("should reject incorrect password", async () => {
      const password = "securePassword123!";
      const { hash, salt } = await passwordSecurity.hashPassword(password);

      const isValid = await passwordSecurity.verifyPassword("wrongPassword", hash, salt);
      expect(isValid).toBe(false);
    });

    it("should handle invalid hash gracefully", async () => {
      // Should not crash, just return false
      const isValid = await passwordSecurity.verifyPassword("test", "invalid", "salt");
      expect(isValid).toBe(false);
    });
  });

  describe("validatePassword", () => {
    it("should reject weak passwords", () => {
      const result = passwordSecurity.validatePassword("weak");
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should accept strong passwords", () => {
      const result = passwordSecurity.validatePassword("SecurePass123!");
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should require minimum length", () => {
      const result = passwordSecurity.validatePassword("Aa1!");
      expect(result.isValid).toBe(false);
    });
  });
});

// ============================================
// CSRF PROTECTION TESTS
// ============================================

describe("CSRF Protection", () => {
  const testSessionId = "test-session-123";

  describe("generateCsrfToken", () => {
    it("should generate a valid token", () => {
      const tokenData = csrfProtection.generateCsrfToken(testSessionId);

      expect(tokenData).toHaveProperty("token");
      expect(tokenData).toHaveProperty("secret");
      expect(tokenData).toHaveProperty("expiresAt");
      expect(tokenData.token.length).toBeGreaterThan(0);
    });

    it("should generate unique tokens for same session", () => {
      const token1 = csrfProtection.generateCsrfToken(testSessionId);
      const token2 = csrfProtection.generateCsrfToken(testSessionId);

      expect(token1.token).not.toBe(token2.token);
      expect(token1.secret).not.toBe(token2.secret);
    });

    it("should set future expiration time", () => {
      const tokenData = csrfProtection.generateCsrfToken(testSessionId);

      expect(tokenData.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe("validateCsrfToken", () => {
    it("should validate a correct token", () => {
      const tokenData = csrfProtection.generateCsrfToken(testSessionId);
      const isValid = csrfProtection.validateCsrfToken(tokenData.token, testSessionId);

      expect(isValid).toBe(true);
    });

    it("should reject token with wrong session ID", () => {
      const tokenData = csrfProtection.generateCsrfToken(testSessionId);
      const isValid = csrfProtection.validateCsrfToken(tokenData.token, "wrong-session");

      expect(isValid).toBe(false);
    });

    it("should reject malformed token", () => {
      const isValid = csrfProtection.validateCsrfToken("invalid-token", testSessionId);

      expect(isValid).toBe(false);
    });

    it("should reject empty token", () => {
      const isValid = csrfProtection.validateCsrfToken("", testSessionId);

      expect(isValid).toBe(false);
    });

    it("should reject empty session ID", () => {
      const tokenData = csrfProtection.generateCsrfToken(testSessionId);
      const isValid = csrfProtection.validateCsrfToken(tokenData.token, "");

      expect(isValid).toBe(false);
    });

    it("should reject tampered token", () => {
      const tokenData = csrfProtection.generateCsrfToken(testSessionId);
      const tamperedToken = tokenData.token.slice(0, -5) + "XXXXX";
      const isValid = csrfProtection.validateCsrfToken(tamperedToken, testSessionId);

      expect(isValid).toBe(false);
    });
  });

  describe("extractCsrfToken", () => {
    it("should extract token from X-CSRF-Token header", () => {
      const req = createMockRequest({
        headers: { "x-csrf-token": "header-token" },
      });

      const token = csrfProtection.extractCsrfToken(req as any);
      expect(token).toBe("header-token");
    });

    it("should extract token from body _csrf field", () => {
      const req = createMockRequest({
        body: { _csrf: "body-token" },
      });

      const token = csrfProtection.extractCsrfToken(req as any);
      expect(token).toBe("body-token");
    });

    it("should extract token from body csrfToken field", () => {
      const req = createMockRequest({
        body: { csrfToken: "body-csrf-token" },
      });

      const token = csrfProtection.extractCsrfToken(req as any);
      expect(token).toBe("body-csrf-token");
    });

    it("should extract token from query parameter", () => {
      const req = createMockRequest({
        query: { _csrf: "query-token" },
      });

      const token = csrfProtection.extractCsrfToken(req as any);
      expect(token).toBe("query-token");
    });

    it("should prefer header over body", () => {
      const req = createMockRequest({
        headers: { "x-csrf-token": "header-token" },
        body: { _csrf: "body-token" },
      });

      const token = csrfProtection.extractCsrfToken(req as any);
      expect(token).toBe("header-token");
    });

    it("should return null when no token present", () => {
      const req = createMockRequest();

      const token = csrfProtection.extractCsrfToken(req as any);
      expect(token).toBeNull();
    });
  });
});

// ============================================
// INPUT VALIDATION TESTS
// ============================================

describe("Input Validation", () => {
  describe("sanitizeString", () => {
    it("should trim whitespace", () => {
      const input = "  hello world  ";
      const result = inputValidation.sanitizeString(input);

      expect(result).toBe("hello world");
    });

    it("should handle empty strings", () => {
      const result = inputValidation.sanitizeString("");
      expect(result).toBe("");
    });

    it("should collapse multiple spaces", () => {
      const result = inputValidation.sanitizeString("hello    world");
      expect(result).toBe("hello world");
    });

    it("should remove null bytes", () => {
      const result = inputValidation.sanitizeString("hello\x00world");
      expect(result).not.toContain("\x00");
    });
  });

  describe("sanitizeHtml", () => {
    it("should sanitize HTML content", () => {
      const input = '<div onclick="alert(1)">Hello</div>';
      const result = inputValidation.sanitizeHtml(input);

      // Should remove onclick handler
      expect(result).not.toContain("onclick");
    });

    it("should handle empty strings", () => {
      const result = inputValidation.sanitizeHtml("");
      expect(result).toBe("");
    });
  });

  describe("validateFileUpload", () => {
    it("should validate allowed file types", () => {
      const result = inputValidation.validateFileUpload({
        originalname: "document.pdf",
        mimetype: "application/pdf",
        size: 1024,
      });

      expect(result.isValid).toBe(true);
    });

    it("should reject dangerous file types", () => {
      const result = inputValidation.validateFileUpload({
        originalname: "malware.exe",
        mimetype: "application/x-executable",
        size: 1024,
      });

      expect(result.isValid).toBe(false);
    });

    it("should reject oversized files", () => {
      const result = inputValidation.validateFileUpload({
        originalname: "large.pdf",
        mimetype: "application/pdf",
        size: 1024 * 1024 * 100, // 100MB
      });

      expect(result.isValid).toBe(false);
    });

    it("should reject files with path traversal in name", () => {
      const result = inputValidation.validateFileUpload({
        originalname: "../../../etc/passwd",
        mimetype: "text/plain",
        size: 1024,
      });

      expect(result.isValid).toBe(false);
    });
  });
});

// ============================================
// RATE LIMITING TESTS
// ============================================

describe("Rate Limiting", () => {
  describe("RATE_LIMITS configuration", () => {
    it("should have auth rate limits configured", () => {
      expect(RATE_LIMITS.auth).toBeDefined();
      expect(RATE_LIMITS.auth.maxRequests).toBeDefined();
      expect(RATE_LIMITS.auth.windowMs).toBeDefined();
    });

    it("should have upload rate limits configured", () => {
      expect(RATE_LIMITS.upload).toBeDefined();
      expect(RATE_LIMITS.upload.maxRequests).toBeDefined();
    });

    it("should have mutation rate limits configured", () => {
      expect(RATE_LIMITS.mutation).toBeDefined();
    });

    it("should have sensitive rate limits configured", () => {
      expect(RATE_LIMITS.sensitive).toBeDefined();
    });

    it("should have stricter limits for auth than mutation", () => {
      expect(RATE_LIMITS.auth.maxRequests).toBeLessThanOrEqual(
        RATE_LIMITS.mutation.maxRequests
      );
    });
  });

  describe("getClientId", () => {
    it("should extract IP from request", () => {
      const req = createMockRequest({ ip: "192.168.1.1" });
      const clientId = getClientId(req as any);

      expect(clientId).toContain("192.168.1.1");
    });

    it("should use x-forwarded-for if present", () => {
      const req = createMockRequest({
        ip: "127.0.0.1",
        headers: { "x-forwarded-for": "203.0.113.195, 70.41.3.18" },
      });
      const clientId = getClientId(req as any);

      expect(clientId).toContain("203.0.113.195");
    });
  });

  describe("isRateLimited", () => {
    it("should not rate limit first request", () => {
      const result = isRateLimited("unique-key-" + Date.now(), RATE_LIMITS.auth);

      expect(result.limited).toBe(false);
      expect(result.remaining).toBeGreaterThan(0);
    });

    it("should track remaining requests", () => {
      const key = "track-key-" + Date.now();

      const result1 = isRateLimited(key, RATE_LIMITS.auth);
      const result2 = isRateLimited(key, RATE_LIMITS.auth);

      expect(result2.remaining).toBeLessThan(result1.remaining);
    });

    it("should rate limit after exceeding max requests", () => {
      const key = "exceed-key-" + Date.now();
      const config = { maxRequests: 2, windowMs: 60000 };

      isRateLimited(key, config);
      isRateLimited(key, config);
      const result = isRateLimited(key, config);

      expect(result.limited).toBe(true);
      expect(result.remaining).toBe(0);
    });

    it("should include reset time when limited", () => {
      const key = "reset-key-" + Date.now();
      const config = { maxRequests: 1, windowMs: 60000 };

      isRateLimited(key, config);
      const result = isRateLimited(key, config);

      expect(result.limited).toBe(true);
      expect(result.resetIn).toBeGreaterThan(0);
    });
  });
});

// ============================================
// INTEGRATION TESTS
// ============================================

describe("Security Integration", () => {
  it("should handle complete auth flow", async () => {
    // 1. Hash a password
    const password = "SecureTestPass123!";
    const { hash, salt } = await passwordSecurity.hashPassword(password);

    // 2. Verify the password
    const isValid = await passwordSecurity.verifyPassword(password, hash, salt);
    expect(isValid).toBe(true);

    // 3. Generate CSRF token for session
    const sessionId = "test-session-" + Date.now();
    const csrfToken = csrfProtection.generateCsrfToken(sessionId);

    // 4. Validate CSRF token
    const csrfValid = csrfProtection.validateCsrfToken(csrfToken.token, sessionId);
    expect(csrfValid).toBe(true);
  });

  it("should sanitize user input properly", () => {
    // Test that basic sanitization works
    const input = "  Hello   World  ";
    const sanitized = inputValidation.sanitizeString(input);
    expect(sanitized).toBe("Hello World");
  });
});

// ============================================
// AUTH FLOW & LOCKOUT TESTS
// ============================================

describe("Auth Flow & Lockout", () => {
  describe("Password Hash Verification Flow", () => {
    it("should verify password only against stored hash", async () => {
      const password = "MySecurePassword123!";
      const wrongPassword = "WrongPassword456!";

      // Hash the password
      const { hash, salt } = await passwordSecurity.hashPassword(password);

      // Correct password should verify
      const validResult = await passwordSecurity.verifyPassword(password, hash, salt);
      expect(validResult).toBe(true);

      // Wrong password should fail
      const invalidResult = await passwordSecurity.verifyPassword(wrongPassword, hash, salt);
      expect(invalidResult).toBe(false);
    });

    it("should not verify against plaintext comparison", async () => {
      const password = "TestPassword123!";
      const { hash, salt } = await passwordSecurity.hashPassword(password);

      // Hash and salt should not equal the password
      expect(hash).not.toBe(password);
      expect(salt).not.toBe(password);

      // Verification should use crypto, not string comparison
      const isValid = await passwordSecurity.verifyPassword(password, hash, salt);
      expect(isValid).toBe(true);
    });

    it("should require both hash and salt for verification", async () => {
      const password = "TestPassword123!";
      const { hash, salt } = await passwordSecurity.hashPassword(password);

      // Missing salt should fail
      const resultNoSalt = await passwordSecurity.verifyPassword(password, hash, "");
      expect(resultNoSalt).toBe(false);

      // Missing hash should fail
      const resultNoHash = await passwordSecurity.verifyPassword(password, "", salt);
      expect(resultNoHash).toBe(false);
    });
  });

  describe("Rate Limiting for Auth", () => {
    it("should have strict rate limits for auth endpoints", () => {
      expect(RATE_LIMITS.auth.maxRequests).toBeLessThanOrEqual(10);
      expect(RATE_LIMITS.auth.windowMs).toBeGreaterThanOrEqual(60000); // At least 1 minute
    });

    it("should track failed attempts per client", () => {
      const clientKey = "auth-test-client-" + Date.now();

      // First few requests should pass
      const result1 = isRateLimited(clientKey, RATE_LIMITS.auth);
      expect(result1.limited).toBe(false);

      // Simulate multiple requests
      for (let i = 0; i < RATE_LIMITS.auth.maxRequests - 1; i++) {
        isRateLimited(clientKey, RATE_LIMITS.auth);
      }

      // Should be rate limited after exceeding max
      const finalResult = isRateLimited(clientKey, RATE_LIMITS.auth);
      expect(finalResult.limited).toBe(true);
    });

    it("should provide retry-after information when limited", () => {
      const clientKey = "retry-test-client-" + Date.now();
      const config = { maxRequests: 1, windowMs: 60000 };

      isRateLimited(clientKey, config);
      const result = isRateLimited(clientKey, config);

      expect(result.limited).toBe(true);
      expect(result.resetIn).toBeGreaterThan(0);
      expect(result.resetIn).toBeLessThanOrEqual(60000);
    });
  });

  describe("Password Rotation Support", () => {
    it("should generate different hashes for same password (salt randomization)", async () => {
      const password = "RotationTest123!";

      const hash1 = await passwordSecurity.hashPassword(password);
      const hash2 = await passwordSecurity.hashPassword(password);

      // Different salts mean different hashes
      expect(hash1.hash).not.toBe(hash2.hash);
      expect(hash1.salt).not.toBe(hash2.salt);

      // But both should verify correctly
      const valid1 = await passwordSecurity.verifyPassword(password, hash1.hash, hash1.salt);
      const valid2 = await passwordSecurity.verifyPassword(password, hash2.hash, hash2.salt);
      expect(valid1).toBe(true);
      expect(valid2).toBe(true);
    });

    it("should allow updating password hash", async () => {
      const oldPassword = "OldPassword123!";
      const newPassword = "NewPassword456!";

      // Hash old password
      const oldHash = await passwordSecurity.hashPassword(oldPassword);

      // Hash new password (simulating rotation)
      const newHash = await passwordSecurity.hashPassword(newPassword);

      // Old password should not verify with new hash
      const oldWithNew = await passwordSecurity.verifyPassword(oldPassword, newHash.hash, newHash.salt);
      expect(oldWithNew).toBe(false);

      // New password should verify with new hash
      const newWithNew = await passwordSecurity.verifyPassword(newPassword, newHash.hash, newHash.salt);
      expect(newWithNew).toBe(true);

      // Old password should still verify with old hash
      const oldWithOld = await passwordSecurity.verifyPassword(oldPassword, oldHash.hash, oldHash.salt);
      expect(oldWithOld).toBe(true);
    });
  });
});

// ============================================
// ENV SECRET ENFORCEMENT TESTS
// ============================================

describe("Environment Secret Enforcement", () => {
  it("should have JWT_SECRET configured in test environment", () => {
    expect(process.env.JWT_SECRET).toBeDefined();
    expect(process.env.JWT_SECRET!.length).toBeGreaterThanOrEqual(32);
  });

  it("should have ADMIN_PASSWORD configured in test environment", () => {
    expect(process.env.ADMIN_PASSWORD).toBeDefined();
    expect(process.env.ADMIN_PASSWORD!.length).toBeGreaterThanOrEqual(12);
  });

  it("should have ALLOW_INSECURE_DEV flag set for tests", () => {
    // Tests run with insecure dev mode to allow test secrets
    expect(process.env.ALLOW_INSECURE_DEV).toBe("true");
  });

  it("should reject weak passwords in validation", () => {
    // Test that password validation catches weak passwords
    const weakPasswords = [
      "123456",
      "password",
      "abc",
      "12345678",
      "qwerty",
    ];

    for (const weak of weakPasswords) {
      const result = passwordSecurity.validatePassword(weak);
      expect(result.isValid).toBe(false);
    }
  });

  it("should accept strong passwords in validation", () => {
    const strongPasswords = [
      "SecurePass123!",
      "MyP@ssw0rd!2024",
      "C0mpl3x!P@ss",
    ];

    for (const strong of strongPasswords) {
      const result = passwordSecurity.validatePassword(strong);
      expect(result.isValid).toBe(true);
    }
  });
});

// ============================================
// SECURITY EVENT LOGGING TESTS
// ============================================

describe("Security Event Handling", () => {
  it("should detect SQL injection patterns", () => {
    const sqlInjectionPatterns = [
      "'; DROP TABLE users; --",
      "1 OR 1=1",
      "UNION SELECT * FROM users",
    ];

    for (const pattern of sqlInjectionPatterns) {
      const detected = inputValidation.detectSqlInjection(pattern);
      expect(detected).toBe(true);
    }
  });

  it("should not flag safe strings as SQL injection", () => {
    const safeStrings = [
      "Hello World",
      "John Doe",
      "user@example.com",
      "Product description here",
    ];

    for (const safe of safeStrings) {
      const detected = inputValidation.detectSqlInjection(safe);
      expect(detected).toBe(false);
    }
  });

  it("should detect XSS patterns", () => {
    const xssPatterns = [
      "<script>alert('xss')</script>",
      "javascript:alert(1)",
      "<img onerror=alert(1)>",
    ];

    for (const pattern of xssPatterns) {
      const detected = inputValidation.detectXssPayload(pattern);
      expect(detected).toBe(true);
    }
  });

  it("should not flag safe HTML as XSS", () => {
    const safeStrings = [
      "Hello <b>World</b>",
      "Check out my website",
      "Normal text content",
    ];

    for (const safe of safeStrings) {
      const detected = inputValidation.detectXssPayload(safe);
      expect(detected).toBe(false);
    }
  });
});
