/**
 * Property-Based Tests for CSRF Protection
 *
 * Feature: system-security-audit, Property 3: CSRF Protection
 * Validates: Requirements 1.3
 */

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import { csrfProtection } from "./csrf-protection";

describe("CSRF Protection - Property Tests", () => {
  describe("Property 3: CSRF Protection", () => {
    /**
     * Feature: system-security-audit, Property 3: CSRF Protection
     * For any state-changing operation, the system should validate CSRF tokens
     */
    it("should generate and validate CSRF tokens correctly", () => {
      fc.assert(
        fc.property(
          fc
            .string({ minLength: 5, maxLength: 50 })
            .filter(s => /^[a-zA-Z0-9\-_]+$/.test(s)),
          sessionId => {
            // Generate token for session
            const tokenData = csrfProtection.generateCsrfToken(sessionId);

            // Token should be generated with all required properties
            expect(tokenData).toBeDefined();
            expect(tokenData.token).toBeDefined();
            expect(typeof tokenData.token).toBe("string");
            expect(tokenData.token.length).toBeGreaterThan(0);
            expect(tokenData.expiresAt).toBeInstanceOf(Date);
            expect(tokenData.expiresAt.getTime()).toBeGreaterThan(Date.now());

            // Token should validate for the same session
            const isValid = csrfProtection.validateCsrfToken(
              tokenData.token,
              sessionId
            );
            expect(isValid).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should reject tokens for different session IDs", () => {
      fc.assert(
        fc.property(
          fc
            .tuple(
              fc
                .string({ minLength: 5, maxLength: 30 })
                .filter(s => /^[a-zA-Z0-9\-_]+$/.test(s)),
              fc
                .string({ minLength: 5, maxLength: 30 })
                .filter(s => /^[a-zA-Z0-9\-_]+$/.test(s))
            )
            .filter(([session1, session2]) => session1 !== session2),
          ([originalSession, differentSession]) => {
            // Generate token for original session
            const token =
              csrfProtection.generateTokenForResponse(originalSession);

            // Token should NOT validate for different session
            const isValid = csrfProtection.validateCsrfToken(
              token,
              differentSession
            );
            expect(isValid).toBe(false);
          }
        ),
        { numRuns: 50 }
      );
    });

    it("should reject clearly invalid tokens", () => {
      fc.assert(
        fc.property(
          fc
            .string({ minLength: 5, maxLength: 30 })
            .filter(s => /^[a-zA-Z0-9\-_]+$/.test(s)),
          sessionId => {
            const invalidTokens = [
              "", // Empty token
              "invalid", // Too short
              "clearly-not-a-valid-csrf-token", // Wrong format
              "null", // String null
              "undefined", // String undefined
            ];

            invalidTokens.forEach(invalidToken => {
              const isValid = csrfProtection.validateCsrfToken(
                invalidToken,
                sessionId
              );
              expect(isValid).toBe(false);
            });
          }
        ),
        { numRuns: 20 }
      );
    });

    it("should extract tokens from request headers and body", () => {
      fc.assert(
        fc.property(fc.string({ minLength: 10, maxLength: 100 }), token => {
          // Test header extraction
          const reqWithHeader = {
            headers: { "x-csrf-token": token },
            body: {},
            query: {},
          } as any;
          expect(csrfProtection.extractCsrfToken(reqWithHeader)).toBe(token);

          // Test body extraction
          const reqWithBody = {
            headers: {},
            body: { _csrf: token },
            query: {},
          } as any;
          expect(csrfProtection.extractCsrfToken(reqWithBody)).toBe(token);
        }),
        { numRuns: 30 }
      );
    });

    it("should generate unique tokens", () => {
      fc.assert(
        fc.property(
          fc
            .string({ minLength: 5, maxLength: 30 })
            .filter(s => /^[a-zA-Z0-9\-_]+$/.test(s)),
          sessionId => {
            // Generate multiple tokens
            const token1 = csrfProtection.generateTokenForResponse(sessionId);
            const token2 = csrfProtection.generateTokenForResponse(sessionId);

            // Tokens should be different
            expect(token1).not.toBe(token2);

            // But both should be valid
            expect(csrfProtection.validateCsrfToken(token1, sessionId)).toBe(
              true
            );
            expect(csrfProtection.validateCsrfToken(token2, sessionId)).toBe(
              true
            );
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe("Edge Cases and Security", () => {
    it("should handle null and undefined inputs safely", () => {
      // Should not throw for invalid inputs
      expect(() => {
        csrfProtection.validateCsrfToken(null as any, "session");
        csrfProtection.validateCsrfToken(undefined as any, "session");
        csrfProtection.validateCsrfToken("token", null as any);
        csrfProtection.validateCsrfToken("token", undefined as any);
      }).not.toThrow();

      // All should return false
      expect(csrfProtection.validateCsrfToken(null as any, "session")).toBe(
        false
      );
      expect(
        csrfProtection.validateCsrfToken(undefined as any, "session")
      ).toBe(false);
      expect(csrfProtection.validateCsrfToken("token", null as any)).toBe(
        false
      );
      expect(csrfProtection.validateCsrfToken("token", undefined as any)).toBe(
        false
      );
    });

    it("should handle empty requests", () => {
      const emptyRequests = [
        { headers: {}, body: {}, query: {} },
        { headers: { "other-header": "value" }, body: {}, query: {} },
        { headers: {}, body: { otherField: "value" }, query: {} },
      ];

      emptyRequests.forEach(req => {
        const token = csrfProtection.extractCsrfToken(req as any);
        expect(token).toBeNull();
      });
    });

    it("should reject malformed base64 tokens", () => {
      const sessionId = "test-session-123";
      const malformedTokens = [
        "not-base64!@#$%",
        "invalid==content",
        "short",
        "!",
      ];

      malformedTokens.forEach(token => {
        expect(() => {
          const isValid = csrfProtection.validateCsrfToken(token, sessionId);
          expect(isValid).toBe(false);
        }).not.toThrow();
      });
    });
  });

  describe("Integration and Real-world Scenarios", () => {
    it("should handle complete token lifecycle", () => {
      const sessionId = "user-session-456";

      // 1. Generate token
      const tokenData = csrfProtection.generateCsrfToken(sessionId);

      // 2. Token should validate
      expect(csrfProtection.validateCsrfToken(tokenData.token, sessionId)).toBe(
        true
      );

      // 3. Token should extract from request
      const request = {
        headers: { "x-csrf-token": tokenData.token },
        body: {},
        query: {},
      } as any;

      const extracted = csrfProtection.extractCsrfToken(request);
      expect(extracted).toBe(tokenData.token);

      // 4. Extracted token should validate
      expect(csrfProtection.validateCsrfToken(extracted!, sessionId)).toBe(
        true
      );
    });

    it("should prevent cross-session attacks", () => {
      const session1 = "user-session-1";
      const session2 = "user-session-2";

      // Generate token for session 1
      const token1 = csrfProtection.generateTokenForResponse(session1);

      // Token should work for session 1
      expect(csrfProtection.validateCsrfToken(token1, session1)).toBe(true);

      // Token should NOT work for session 2
      expect(csrfProtection.validateCsrfToken(token1, session2)).toBe(false);
    });

    it("should reject common attack patterns", () => {
      const sessionId = "target-session";

      const attackTokens = [
        "", // Empty
        "admin", // Predictable
        "12345", // Simple
        "fake-token", // Obvious fake
        Buffer.from("fake:data:here").toString("base64"), // Fake structure
      ];

      attackTokens.forEach(attackToken => {
        const isValid = csrfProtection.validateCsrfToken(
          attackToken,
          sessionId
        );
        expect(isValid).toBe(false);
      });
    });

    it("should handle various request formats", () => {
      const testToken = "test-csrf-token-abc123";

      // Header format
      const headerReq = {
        headers: { "x-csrf-token": testToken },
        body: {},
        query: {},
      } as any;
      expect(csrfProtection.extractCsrfToken(headerReq)).toBe(testToken);

      // Body format
      const bodyReq = {
        headers: {},
        body: { _csrf: testToken },
        query: {},
      } as any;
      expect(csrfProtection.extractCsrfToken(bodyReq)).toBe(testToken);

      // Alternative body format
      const altBodyReq = {
        headers: {},
        body: { csrfToken: testToken },
        query: {},
      } as any;
      expect(csrfProtection.extractCsrfToken(altBodyReq)).toBe(testToken);
    });
  });

  describe("Security Properties Validation", () => {
    it("should ensure token uniqueness and validity", () => {
      const sessionId = "security-test-session";

      // Generate multiple tokens
      const tokens = Array.from({ length: 10 }, () =>
        csrfProtection.generateTokenForResponse(sessionId)
      );

      // All tokens should be unique
      const uniqueTokens = new Set(tokens);
      expect(uniqueTokens.size).toBe(tokens.length);

      // All tokens should validate for correct session
      tokens.forEach(token => {
        expect(csrfProtection.validateCsrfToken(token, sessionId)).toBe(true);
      });

      // No token should validate for wrong session
      tokens.forEach(token => {
        expect(csrfProtection.validateCsrfToken(token, "wrong-session")).toBe(
          false
        );
      });
    });
  });
});
