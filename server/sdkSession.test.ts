import { describe, expect, it } from "vitest";

// The legacy verification path in sdk.verifySession should work when no IP is provided
// because it skips the database-backed session validation and falls back to jose jwt verification.

describe("SDK legacy session verification (no DB)", () => {
  it("signs and verifies a legacy session token via jose fallback when no IP is given", async () => {
    process.env.ALLOW_INSECURE_DEV = "true";
    const { sdk } = await import("./_core/sdk");

    // Sign a legacy session (uses jose SignJWT with ENV cookie secret)
    const token = await sdk.signSession(
      { openId: "user-xyz", appId: "app", name: "Test User" },
      { expiresInMs: 60_000 }
    );

    // Verify without providing IP to skip sessionSecurity path
    const verified = await sdk.verifySession(
      token,
      undefined,
      "unit-test-agent"
    );
    expect(verified).not.toBeNull();
    expect(verified!.openId).toBe("user-xyz");
    expect(verified!.appId).toBe("app");
    expect(verified!.name).toBe("Test User");
  });
});
