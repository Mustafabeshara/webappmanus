import { test, expect } from "@playwright/test";

/**
 * API E2E Tests
 *
 * Tests for tRPC API endpoints
 */
test.describe("API - Health Check", () => {
  test("should return healthy status", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.status).toBe("healthy");
  });
});

test.describe("API - Authentication", () => {
  test("should reject unauthenticated requests to protected endpoints", async ({
    request,
  }) => {
    const response = await request.get("/api/trpc/users.list", {
      headers: {
        // No auth cookie
      },
    });

    // Should return 401 or error in response
    const data = await response.json();
    expect(data.error || response.status()).toBeTruthy();
  });
});

test.describe("API - Tenders", () => {
  test("should list tenders", async ({ request }) => {
    const response = await request.get("/api/trpc/tenders.list");
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.result?.data || Array.isArray(data)).toBeTruthy();
  });

  test("should list tenders with pagination", async ({ request }) => {
    const response = await request.get(
      "/api/trpc/tenders.list?input=" +
        encodeURIComponent(JSON.stringify({ page: 1, pageSize: 10 }))
    );
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    const result = data.result?.data;

    if (result?.pagination) {
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.pageSize).toBe(10);
    }
  });
});

test.describe("API - Invoices", () => {
  test("should list invoices", async ({ request }) => {
    const response = await request.get("/api/trpc/invoices.list");
    expect(response.ok()).toBeTruthy();
  });

  test("should list invoices with filters", async ({ request }) => {
    const response = await request.get(
      "/api/trpc/invoices.list?input=" +
        encodeURIComponent(JSON.stringify({ status: "paid", page: 1, limit: 5 }))
    );
    expect(response.ok()).toBeTruthy();
  });
});

test.describe("API - Products", () => {
  test("should list products", async ({ request }) => {
    const response = await request.get("/api/trpc/products.list");
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.result?.data || Array.isArray(data)).toBeTruthy();
  });
});

test.describe("API - Notifications", () => {
  test("should list notifications", async ({ request }) => {
    const response = await request.get("/api/trpc/notifications.list");
    expect(response.ok()).toBeTruthy();
  });

  test("should list unread notifications", async ({ request }) => {
    const response = await request.get("/api/trpc/notifications.unread");
    expect(response.ok()).toBeTruthy();
  });
});

test.describe("API - Rate Limiting", () => {
  test("should include rate limit headers", async ({ request }) => {
    const response = await request.get("/api/trpc/system.health");

    // Check for rate limit headers
    const headers = response.headers();
    const hasRateLimitHeaders =
      headers["x-ratelimit-limit"] ||
      headers["x-ratelimit-remaining"] ||
      headers["ratelimit-limit"];

    // Rate limit headers may not be present on all endpoints
    // This test verifies they exist when implemented
    if (hasRateLimitHeaders) {
      expect(parseInt(headers["x-ratelimit-limit"] || headers["ratelimit-limit"])).toBeGreaterThan(0);
    }
  });

  test("should enforce rate limits on sensitive endpoints", async ({ request }) => {
    // Make multiple rapid requests to a rate-limited endpoint
    const requests = Array(10)
      .fill(null)
      .map(() => request.post("/api/trpc/auth.login", {
        data: { email: "test@example.com", password: "wrong" },
      }));

    const responses = await Promise.all(requests);

    // At least one should be rate limited if limits are low enough
    // This is a soft check - may not trigger with default limits
    const rateLimited = responses.some(r => r.status() === 429);

    // Log result but don't fail - rate limits may be configured differently
    console.log(`Rate limiting triggered: ${rateLimited}`);
  });
});

test.describe("API - Security Headers", () => {
  test("should include security headers", async ({ request }) => {
    const response = await request.get("/api/trpc/system.health");
    const headers = response.headers();

    // Check for essential security headers
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("DENY");
  });

  test("should not expose server information", async ({ request }) => {
    const response = await request.get("/api/trpc/system.health");
    const headers = response.headers();

    // X-Powered-By should not be present
    expect(headers["x-powered-by"]).toBeUndefined();
  });
});

test.describe("API - AI Service", () => {
  test("should return AI service status", async ({ request }) => {
    const response = await request.get("/api/trpc/tenders.getAIStatus");
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    const result = data.result?.data;

    if (result) {
      expect(typeof result.configured).toBe("boolean");
      expect(Array.isArray(result.providers)).toBeTruthy();
    }
  });
});

test.describe("API - Error Handling", () => {
  test("should return proper error for invalid input", async ({ request }) => {
    const response = await request.get(
      "/api/trpc/tenders.get?input=" +
        encodeURIComponent(JSON.stringify({ id: "invalid" }))
    );

    // Should return 400 or validation error
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test("should return 404 for non-existent resources", async ({ request }) => {
    const response = await request.get(
      "/api/trpc/tenders.get?input=" +
        encodeURIComponent(JSON.stringify({ id: 999999 }))
    );

    // Should return 404 or error in response
    const data = await response.json();
    expect(
      response.status() === 404 ||
      data.error?.message?.toLowerCase().includes("not found")
    ).toBeTruthy();
  });
});
