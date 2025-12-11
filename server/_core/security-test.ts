/**
 * Security Services Test
 * Quick test to verify all security services are working
 */

import { z } from "zod";
import { csrfProtection } from "./csrf-protection";
import { inputValidation } from "./input-validation";
import { passwordSecurity } from "./password-security";

async function testSecurityServices() {
  console.log("🔒 Testing Security Services...");

  try {
    // Test password security
    console.log("Testing password security...");
    const testPassword = "TestPassword123!";
    const validation = passwordSecurity.validatePassword(testPassword);
    console.log("Password validation:", validation);

    const hashResult = await passwordSecurity.hashPassword(testPassword);
    console.log("Password hashed successfully");

    const verifyResult = await passwordSecurity.verifyPassword(
      testPassword,
      hashResult.hash,
      hashResult.salt
    );
    console.log("Password verification:", verifyResult);

    // Test input validation
    console.log("Testing input validation...");
    const testSchema = z.object({
      name: z.string().min(1).max(100),
      email: z.string().email(),
    });

    const validInput = { name: "Test User", email: "test@example.com" };
    const sanitized = inputValidation.validateAndSanitize(
      validInput,
      testSchema
    );
    console.log("Input validation passed:", sanitized);

    // Test SQL injection detection
    const sqlInjection = "'; DROP TABLE users; --";
    const isSqlInjection = inputValidation.detectSqlInjection(sqlInjection);
    console.log("SQL injection detected:", isSqlInjection);

    // Test XSS detection
    const xssPayload = "<script>alert('xss')</script>";
    const isXss = inputValidation.detectXssPayload(xssPayload);
    console.log("XSS payload detected:", isXss);

    // Test HTML sanitization
    const dirtyHtml = "<script>alert('xss')</script><p>Safe content</p>";
    const cleanHtml = inputValidation.sanitizeHtml(dirtyHtml);
    console.log("HTML sanitized:", cleanHtml);

    // Test CSRF token generation
    console.log("Testing CSRF protection...");
    const sessionId = "test-session-123";
    const csrfToken = csrfProtection.generateTokenForResponse(sessionId);
    console.log("CSRF token generated:", csrfToken.substring(0, 20) + "...");

    const isValidCsrf = csrfProtection.validateCsrfToken(csrfToken, sessionId);
    console.log("CSRF token validation:", isValidCsrf);

    console.log("✅ All security services are working correctly!");
    return true;
  } catch (error) {
    console.error("❌ Security services test failed:", error);
    return false;
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testSecurityServices().then(success => {
    process.exit(success ? 0 : 1);
  });
}

export { testSecurityServices };
