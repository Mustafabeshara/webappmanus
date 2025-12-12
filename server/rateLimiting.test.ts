import { describe, expect, it } from "vitest";
import {
  RATE_LIMITS,
  expressRateLimit,
  getClientId,
  isRateLimited,
} from "./_core/rate-limiting";

// Minimal Request/Response types for testing middleware behavior
function mockReq(url: string, ip: string = "127.0.0.1") {
  return {
    url,
    headers: {},
    ip,
  } as any;
}

function mockRes() {
  const headers: Record<string, string | number> = {};
  return {
    status(code: number) {
      headers["status"] = code;
      return this;
    },
    setHeader(key: string, value: string | number) {
      headers[key] = value;
    },
    json(body: unknown) {
      return { headers, body };
    },
    _headers: headers,
  } as any;
}

describe("Rate Limiting (Unit)", () => {
  it("isRateLimited returns remaining and resetIn without limiting initially", () => {
    const cfg = { windowMs: 1000, maxRequests: 2 };
    const key = "client:/api/test";

    const first = isRateLimited(key, cfg);
    expect(first.limited).toBe(false);
    expect(first.remaining).toBe(1);
    expect(first.resetIn).toBeGreaterThan(0);

    const second = isRateLimited(key, cfg);
    expect(second.limited).toBe(false);
    expect(second.remaining).toBe(0);

    const third = isRateLimited(key, cfg);
    expect(third.limited).toBe(true);
    expect(third.remaining).toBe(0);
  });

  it("expressRateLimit returns 429 when over the limit", () => {
    const mw = expressRateLimit({ windowMs: 5000, maxRequests: 1 });
    const req = mockReq("/api/test");
    const res = mockRes();
    const next = () => {};

    // First call passes
    mw(req, res, next);
    // Second call triggers rate limit
    mw(req, res, next);
    expect(res._headers["X-RateLimit-Limit"]).toBe(1);
    expect(res._headers["X-RateLimit-Remaining"]).toBe(0);
    expect(res._headers["status"]).toBe(429);
  });

  it("getClientId prefers x-forwarded-for then req.ip", () => {
    const req1 = {
      headers: { "x-forwarded-for": "203.0.113.7, 70.41.3.18" },
      ip: "127.0.0.1",
    } as any;
    const req2 = { headers: {}, ip: "127.0.0.2" } as any;
    expect(getClientId(req1)).toBe("203.0.113.7");
    expect(getClientId(req2)).toBe("127.0.0.2");
  });

  it("predefined RATE_LIMITS contain expected configs", () => {
    expect(RATE_LIMITS.auth.maxRequests).toBeGreaterThan(0);
    expect(RATE_LIMITS.upload.windowMs).toBeGreaterThan(0);
    expect(RATE_LIMITS.mutation.message.length).toBeGreaterThan(0);
    expect(RATE_LIMITS.sensitive.maxRequests).toBeLessThanOrEqual(100);
  });
});
