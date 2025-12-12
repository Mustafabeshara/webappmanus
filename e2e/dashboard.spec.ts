import { test, expect } from "@playwright/test";

/**
 * Dashboard E2E Tests
 *
 * Tests for the main dashboard functionality
 */
test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard before each test
    await page.goto("/");
  });

  test("should display dashboard with key metrics", async ({ page }) => {
    // Check page title or heading
    await expect(
      page.getByRole("heading", { name: /dashboard/i }).or(page.getByText(/overview/i))
    ).toBeVisible();

    // Check for key dashboard components
    // These selectors should be adjusted based on actual dashboard structure
    await expect(page.locator("[data-testid='metrics-card']").or(page.locator(".metrics"))).toBeVisible();
  });

  test("should navigate to tenders page", async ({ page }) => {
    // Click on tenders link in navigation
    await page.getByRole("link", { name: /tenders/i }).click();

    // Verify URL changed
    await expect(page).toHaveURL(/\/tenders/);

    // Verify tenders page loaded
    await expect(page.getByRole("heading", { name: /tenders/i })).toBeVisible();
  });

  test("should navigate to invoices page", async ({ page }) => {
    await page.getByRole("link", { name: /invoices/i }).click();
    await expect(page).toHaveURL(/\/invoices/);
    await expect(page.getByRole("heading", { name: /invoices/i })).toBeVisible();
  });

  test("should navigate to inventory page", async ({ page }) => {
    await page.getByRole("link", { name: /inventory/i }).click();
    await expect(page).toHaveURL(/\/inventory/);
    await expect(page.getByRole("heading", { name: /inventory/i })).toBeVisible();
  });

  test("should show notifications", async ({ page }) => {
    // Click notification bell/icon
    const notificationButton = page
      .getByRole("button", { name: /notifications/i })
      .or(page.locator("[data-testid='notification-bell']"))
      .or(page.locator(".notification-icon"));

    await notificationButton.click();

    // Verify notification panel opens
    await expect(
      page.getByRole("dialog").or(page.locator("[data-testid='notification-panel']"))
    ).toBeVisible();
  });

  test("should handle user profile menu", async ({ page }) => {
    // Open user menu
    const profileButton = page
      .getByRole("button", { name: /profile|account|user/i })
      .or(page.locator("[data-testid='user-menu']"));

    await profileButton.click();

    // Verify menu options are visible
    await expect(
      page.getByRole("menuitem", { name: /settings|profile|logout/i }).first()
    ).toBeVisible();
  });
});

test.describe("Dashboard - Responsive", () => {
  test("should display mobile navigation on small screens", async ({ page }) => {
    // Set viewport to mobile size
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto("/");

    // Check for mobile menu button (hamburger)
    const mobileMenuButton = page
      .getByRole("button", { name: /menu|toggle/i })
      .or(page.locator("[data-testid='mobile-menu']"));

    await expect(mobileMenuButton).toBeVisible();

    // Click to open mobile menu
    await mobileMenuButton.click();

    // Verify navigation items are visible
    await expect(page.getByRole("link", { name: /tenders/i })).toBeVisible();
  });
});
