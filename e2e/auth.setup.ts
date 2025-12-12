import { test as setup, expect } from "@playwright/test";
import path from "path";

const authFile = path.join(__dirname, ".auth/user.json");

/**
 * Authentication Setup
 *
 * This runs once before all tests to establish an authenticated session.
 * The session is saved and reused across all browser contexts.
 */
setup("authenticate", async ({ page }) => {
  // Navigate to login page
  await page.goto("/login");

  // Wait for the login form to be visible
  await expect(page.getByRole("heading", { name: /login|sign in/i })).toBeVisible();

  // Fill in credentials (use test credentials)
  // These should be test accounts created specifically for E2E testing
  await page.getByLabel(/email|username/i).fill(process.env.E2E_TEST_EMAIL || "test@example.com");
  await page.getByLabel(/password/i).fill(process.env.E2E_TEST_PASSWORD || "testpassword123");

  // Submit the form
  await page.getByRole("button", { name: /log in|sign in|submit/i }).click();

  // Wait for successful login - should redirect to dashboard or home
  await expect(page).toHaveURL(/\/(dashboard|home)?$/);

  // Verify we're logged in by checking for a user-specific element
  await expect(
    page.getByRole("button", { name: /profile|account|logout/i }).or(
      page.getByText(/welcome|dashboard/i)
    )
  ).toBeVisible({ timeout: 10000 });

  // Save the authentication state
  await page.context().storageState({ path: authFile });
});

/**
 * Admin Authentication Setup
 *
 * For tests that require admin privileges
 */
setup.describe("admin auth", () => {
  setup.skip(
    !process.env.E2E_ADMIN_EMAIL,
    "Admin credentials not configured"
  );

  setup("authenticate as admin", async ({ page }) => {
    const adminAuthFile = path.join(__dirname, ".auth/admin.json");

    await page.goto("/login");

    await page.getByLabel(/email|username/i).fill(process.env.E2E_ADMIN_EMAIL!);
    await page.getByLabel(/password/i).fill(process.env.E2E_ADMIN_PASSWORD!);
    await page.getByRole("button", { name: /log in|sign in|submit/i }).click();

    // Wait for admin dashboard
    await expect(page).toHaveURL(/\/(admin|dashboard)?$/);

    await page.context().storageState({ path: adminAuthFile });
  });
});
