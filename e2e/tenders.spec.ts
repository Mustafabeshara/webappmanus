import { test, expect } from "@playwright/test";

/**
 * Tenders E2E Tests
 *
 * Tests for tender management functionality
 */
test.describe("Tenders", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/tenders");
  });

  test("should display tenders list", async ({ page }) => {
    // Wait for tenders to load
    await expect(page.getByRole("heading", { name: /tenders/i })).toBeVisible();

    // Check for table or list of tenders
    await expect(
      page.locator("table").or(page.locator("[data-testid='tenders-list']"))
    ).toBeVisible();
  });

  test("should filter tenders by status", async ({ page }) => {
    // Look for status filter
    const statusFilter = page
      .getByRole("combobox", { name: /status/i })
      .or(page.locator("[data-testid='status-filter']"));

    if (await statusFilter.isVisible()) {
      await statusFilter.click();
      await page.getByRole("option", { name: /open/i }).click();

      // Verify URL or content changed
      await expect(page).toHaveURL(/status=open/);
    }
  });

  test("should search tenders", async ({ page }) => {
    const searchInput = page
      .getByRole("searchbox")
      .or(page.getByPlaceholder(/search/i));

    if (await searchInput.isVisible()) {
      await searchInput.fill("test tender");
      await searchInput.press("Enter");

      // Wait for search results
      await page.waitForLoadState("networkidle");
    }
  });

  test("should open tender details", async ({ page }) => {
    // Wait for tenders to load
    await page.waitForSelector("table tbody tr, [data-testid='tender-row']", {
      timeout: 10000,
    });

    // Click on first tender
    const firstTender = page
      .locator("table tbody tr")
      .first()
      .or(page.locator("[data-testid='tender-row']").first());

    await firstTender.click();

    // Verify detail view opened
    await expect(page).toHaveURL(/\/tenders\/\d+/);
    await expect(
      page.getByRole("heading", { name: /tender details|tender #/i })
    ).toBeVisible();
  });

  test("should navigate to create tender form", async ({ page }) => {
    // Click create button
    const createButton = page
      .getByRole("button", { name: /create|new|add/i })
      .or(page.getByRole("link", { name: /create|new|add/i }));

    await createButton.click();

    // Verify form is displayed
    await expect(page).toHaveURL(/\/tenders\/(new|create)/);
    await expect(
      page.getByRole("heading", { name: /create|new/i })
    ).toBeVisible();
  });
});

test.describe("Tender Creation", () => {
  test("should create a new tender", async ({ page }) => {
    await page.goto("/tenders/new");

    // Fill in tender form
    await page.getByLabel(/title/i).fill("E2E Test Tender");
    await page.getByLabel(/description/i).fill("This is a test tender created by E2E tests");

    // Select customer if available
    const customerSelect = page.getByRole("combobox", { name: /customer/i });
    if (await customerSelect.isVisible()) {
      await customerSelect.click();
      await page.getByRole("option").first().click();
    }

    // Set deadline if available
    const deadlineInput = page.getByLabel(/deadline/i);
    if (await deadlineInput.isVisible()) {
      // Set deadline to next month
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      await deadlineInput.fill(nextMonth.toISOString().split("T")[0]);
    }

    // Submit form
    await page.getByRole("button", { name: /create|submit|save/i }).click();

    // Verify success
    await expect(
      page.getByText(/created|success/i).or(page.getByRole("alert"))
    ).toBeVisible();
  });

  test("should validate required fields", async ({ page }) => {
    await page.goto("/tenders/new");

    // Try to submit empty form
    await page.getByRole("button", { name: /create|submit|save/i }).click();

    // Verify validation errors
    await expect(
      page.getByText(/required|must be filled|cannot be empty/i).first()
    ).toBeVisible();
  });
});

test.describe("Tender Details", () => {
  test("should display tender items", async ({ page }) => {
    // Navigate to a specific tender (assumes ID 1 exists)
    await page.goto("/tenders");

    // Wait for and click first tender
    await page.waitForSelector("table tbody tr, [data-testid='tender-row']", {
      timeout: 10000,
    });

    await page.locator("table tbody tr").first().click();

    // Check for items section
    await expect(
      page.getByRole("heading", { name: /items/i }).or(page.getByText(/line items/i))
    ).toBeVisible();
  });

  test("should display tender participants/suppliers", async ({ page }) => {
    await page.goto("/tenders");
    await page.waitForSelector("table tbody tr", { timeout: 10000 });
    await page.locator("table tbody tr").first().click();

    // Check for participants section
    await expect(
      page
        .getByRole("heading", { name: /participants|suppliers|bids/i })
        .or(page.locator("[data-testid='participants-section']"))
    ).toBeVisible();
  });

  test("should run AI analysis on tender", async ({ page }) => {
    await page.goto("/tenders");
    await page.waitForSelector("table tbody tr", { timeout: 10000 });
    await page.locator("table tbody tr").first().click();

    // Look for analyze button
    const analyzeButton = page.getByRole("button", { name: /analyze|ai/i });

    if (await analyzeButton.isVisible()) {
      await analyzeButton.click();

      // Wait for analysis results
      await expect(
        page.getByText(/analysis|recommendation|insight/i)
      ).toBeVisible({ timeout: 30000 });
    }
  });
});
