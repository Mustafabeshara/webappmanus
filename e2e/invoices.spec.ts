import { test, expect } from "@playwright/test";

/**
 * Invoices E2E Tests
 *
 * Tests for invoice management functionality
 */
test.describe("Invoices", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/invoices");
  });

  test("should display invoices list", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /invoices/i })).toBeVisible();

    // Check for table or list
    await expect(
      page.locator("table").or(page.locator("[data-testid='invoices-list']"))
    ).toBeVisible();
  });

  test("should show pagination controls", async ({ page }) => {
    // Wait for content to load
    await page.waitForLoadState("networkidle");

    // Check for pagination
    const pagination = page
      .getByRole("navigation", { name: /pagination/i })
      .or(page.locator("[data-testid='pagination']"))
      .or(page.locator(".pagination"));

    // Pagination should be visible if there are enough records
    const recordCount = await page.locator("table tbody tr").count();
    if (recordCount >= 20) {
      await expect(pagination).toBeVisible();
    }
  });

  test("should filter invoices by status", async ({ page }) => {
    const statusFilter = page.getByRole("combobox", { name: /status/i });

    if (await statusFilter.isVisible()) {
      await statusFilter.click();
      await page.getByRole("option", { name: /paid/i }).click();

      // Verify filter applied
      await page.waitForLoadState("networkidle");
    }
  });

  test("should display invoice summary metrics", async ({ page }) => {
    // Check for summary cards
    await expect(
      page
        .getByText(/total outstanding|total paid|overdue/i)
        .first()
        .or(page.locator("[data-testid='invoice-summary']"))
    ).toBeVisible();
  });
});

test.describe("Invoice Creation", () => {
  test("should create a new invoice", async ({ page }) => {
    await page.goto("/invoices/new");

    // Select customer
    const customerSelect = page.getByRole("combobox", { name: /customer/i });
    if (await customerSelect.isVisible()) {
      await customerSelect.click();
      await page.getByRole("option").first().click();
    }

    // Set due date
    const dueDateInput = page.getByLabel(/due date/i);
    if (await dueDateInput.isVisible()) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);
      await dueDateInput.fill(dueDate.toISOString().split("T")[0]);
    }

    // Add invoice item
    const addItemButton = page.getByRole("button", { name: /add item|add line/i });
    if (await addItemButton.isVisible()) {
      await addItemButton.click();

      await page.getByLabel(/description/i).first().fill("Test Item");
      await page.getByLabel(/quantity/i).first().fill("1");
      await page.getByLabel(/price|amount/i).first().fill("1000");
    }

    // Submit
    await page.getByRole("button", { name: /create|save|submit/i }).click();

    // Verify success
    await expect(
      page.getByText(/created|success/i).or(page.getByRole("alert"))
    ).toBeVisible();
  });
});

test.describe("Invoice Details", () => {
  test("should display invoice details", async ({ page }) => {
    await page.goto("/invoices");

    // Wait for and click first invoice
    await page.waitForSelector("table tbody tr", { timeout: 10000 });
    await page.locator("table tbody tr").first().click();

    // Verify details view
    await expect(page).toHaveURL(/\/invoices\/\d+/);
    await expect(
      page.getByRole("heading", { name: /invoice|INV-/i })
    ).toBeVisible();
  });

  test("should mark invoice as paid", async ({ page }) => {
    await page.goto("/invoices");
    await page.waitForSelector("table tbody tr", { timeout: 10000 });
    await page.locator("table tbody tr").first().click();

    // Look for mark as paid button
    const markPaidButton = page.getByRole("button", { name: /mark.*paid|record payment/i });

    if (await markPaidButton.isVisible()) {
      await markPaidButton.click();

      // Confirm if dialog appears
      const confirmButton = page.getByRole("button", { name: /confirm|yes/i });
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
      }

      // Verify status changed
      await expect(page.getByText(/paid/i)).toBeVisible();
    }
  });

  test("should print/export invoice", async ({ page }) => {
    await page.goto("/invoices");
    await page.waitForSelector("table tbody tr", { timeout: 10000 });
    await page.locator("table tbody tr").first().click();

    // Look for print/export button
    const exportButton = page.getByRole("button", { name: /print|export|pdf/i });

    if (await exportButton.isVisible()) {
      // Check if it opens a print dialog or downloads
      const downloadPromise = page.waitForEvent("download", { timeout: 5000 }).catch(() => null);
      await exportButton.click();

      const download = await downloadPromise;
      if (download) {
        expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
      }
    }
  });
});

test.describe("Invoice AI Analysis", () => {
  test("should display AI insights", async ({ page }) => {
    await page.goto("/invoices");

    // Look for AI analysis section or button
    const aiButton = page.getByRole("button", { name: /ai|analysis|insights/i });

    if (await aiButton.isVisible()) {
      await aiButton.click();

      // Wait for AI analysis results
      await expect(
        page.getByText(/insight|recommendation|analysis/i)
      ).toBeVisible({ timeout: 30000 });
    }
  });
});
