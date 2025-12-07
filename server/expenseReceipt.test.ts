import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";
import * as fs from "fs";
import * as path from "path";

describe("Expense Receipt Upload", () => {
  // OCR and AI extraction can take time, increase timeout
  const TEST_TIMEOUT = 30000; // 30 seconds
  const mockContext = {
    user: { id: 1, openId: "test-user", name: "Test User", role: "admin" as const },
    req: {} as any,
    res: {} as any,
  };

  it.skip("should upload receipt and return URL (requires OCR service)", async () => {
    const caller = appRouter.createCaller(mockContext);

    // Create a simple test image (1x1 red pixel PNG in base64)
    const testImageBase64 =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==";

    const result = await caller.expenses.uploadReceipt({
      file: testImageBase64,
      filename: "test-receipt.png",
    });

    expect(result.success).toBe(true);
    expect(result.receiptUrl).toBeTruthy();
    expect(result.receiptUrl).toContain("receipts/");
    expect(result.extractedData).toBeTruthy();
  });

  it("should create expense with receipt URL", async () => {
    const caller = appRouter.createCaller(mockContext);

    // Get existing category
    const categories = await db.getAllBudgetCategories();
    const testCategoryId = categories[0]?.id || 1;

    // Create expense with receipt URL
    const receiptUrl = "https://example.com/receipts/test-receipt.jpg";
    const result = await caller.expenses.create({
      title: "Expense with Receipt",
      categoryId: testCategoryId,
      amount: 50000, // $500
      expenseDate: new Date("2025-02-25"),
      receiptUrl,
    });

    expect(result.success).toBe(true);
    expect(result.expenseId).toBeGreaterThan(0);

    // Verify receipt URL was saved
    const expense = await db.getExpenseById(result.expenseId);
    expect(expense?.receiptUrl).toBe(receiptUrl);
  });

  it.skip("should handle OCR extraction result", async () => {
    const caller = appRouter.createCaller(mockContext);

    // Create a test image
    const testImageBase64 =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==";

    const result = await caller.expenses.uploadReceipt({
      file: testImageBase64,
      filename: "receipt-with-text.png",
    });

    expect(result.success).toBe(true);
    expect(result.extractedData).toBeTruthy();
    
    // extractedData should have the structure from aiService
    if (result.extractedData.success) {
      expect(result.extractedData.data).toBeDefined();
      expect(result.extractedData.confidence).toBeDefined();
      expect(result.extractedData.provider).toBeDefined();
    }
  });

  it("should update expense with receipt URL", async () => {
    const caller = appRouter.createCaller(mockContext);

    // Get existing category
    const categories = await db.getAllBudgetCategories();
    const testCategoryId = categories[0]?.id || 1;

    // Create expense without receipt
    const createResult = await caller.expenses.create({
      title: "Expense to Update",
      categoryId: testCategoryId,
      amount: 30000, // $300
      expenseDate: new Date("2025-02-26"),
    });

    // Update with receipt URL
    const receiptUrl = "https://example.com/receipts/updated-receipt.jpg";
    const updateResult = await caller.expenses.update({
      id: createResult.expenseId,
      receiptUrl,
    });

    expect(updateResult.success).toBe(true);

    // Verify receipt URL was updated
    const expense = await db.getExpenseById(createResult.expenseId);
    expect(expense?.receiptUrl).toBe(receiptUrl);
  });

  it.skip("should handle base64 with and without data URI prefix", async () => {
    const caller = appRouter.createCaller(mockContext);

    // Test with data URI prefix
    const withPrefix =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==";
    
    const result1 = await caller.expenses.uploadReceipt({
      file: withPrefix,
      filename: "test1.png",
    });

    expect(result1.success).toBe(true);
    expect(result1.receiptUrl).toBeTruthy();

    // Test without data URI prefix
    const withoutPrefix =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==";
    
    const result2 = await caller.expenses.uploadReceipt({
      file: withoutPrefix,
      filename: "test2.png",
    });

    expect(result2.success).toBe(true);
    expect(result2.receiptUrl).toBeTruthy();
  });
});
