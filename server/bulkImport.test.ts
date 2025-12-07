import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";

describe("Bulk Expense Import", () => {
  const mockContext = {
    user: { id: 1, openId: "test-user", name: "Test User", role: "admin" as const },
    req: {} as any,
    res: {} as any,
  };

  it("should import valid expenses successfully", async () => {
    const caller = appRouter.createCaller(mockContext);

    // Get existing category
    const categories = await db.getAllBudgetCategories();
    const testCategoryId = categories[0]?.id || 1;

    const expenses = [
      {
        title: `Bulk Import Test 1 ${Date.now()}`,
        categoryId: testCategoryId,
        amount: 10000, // $100
        expenseDate: "2025-02-01",
      },
      {
        title: `Bulk Import Test 2 ${Date.now()}`,
        categoryId: testCategoryId,
        amount: 20000, // $200
        expenseDate: "2025-02-02",
      },
    ];

    const result = await caller.expenses.bulkImport({ expenses });

    expect(result.success.length).toBe(2);
    expect(result.errors.length).toBe(0);
    expect(result.duplicates.length).toBe(0);
    expect(result.success[0].expenseNumber).toBeTruthy();
  });

  it("should detect duplicates within batch", async () => {
    const caller = appRouter.createCaller(mockContext);

    const categories = await db.getAllBudgetCategories();
    const testCategoryId = categories[0]?.id || 1;

    const expenses = [
      {
        title: "Duplicate Test",
        categoryId: testCategoryId,
        amount: 5000,
        expenseDate: "2025-02-03",
      },
      {
        title: "Duplicate Test",
        categoryId: testCategoryId,
        amount: 5000,
        expenseDate: "2025-02-03",
      },
    ];

    const result = await caller.expenses.bulkImport({ expenses });

    expect(result.success.length).toBe(1);
    expect(result.duplicates.length).toBe(1);
    expect(result.duplicates[0].reason).toContain("Duplicate within import batch");
  });

  it("should detect duplicates in database", async () => {
    const caller = appRouter.createCaller(mockContext);

    const categories = await db.getAllBudgetCategories();
    const testCategoryId = categories[0]?.id || 1;

    const uniqueTitle = `DB Duplicate Test ${Date.now()}`;

    // Create first expense
    await caller.expenses.create({
      title: uniqueTitle,
      categoryId: testCategoryId,
      amount: 7500,
      expenseDate: new Date("2025-02-04"),
    });

    // Try to import duplicate
    const result = await caller.expenses.bulkImport({
      expenses: [
        {
          title: uniqueTitle,
          categoryId: testCategoryId,
          amount: 7500,
          expenseDate: "2025-02-04",
        },
      ],
    });

    expect(result.success.length).toBe(0);
    expect(result.duplicates.length).toBe(1);
    expect(result.duplicates[0].reason).toContain("Already exists in database");
  });

  it("should handle mixed success, errors, and duplicates", async () => {
    const caller = appRouter.createCaller(mockContext);

    const categories = await db.getAllBudgetCategories();
    const testCategoryId = categories[0]?.id || 1;

    const expenses = [
      {
        title: `Valid Expense ${Date.now()}`,
        categoryId: testCategoryId,
        amount: 3000,
        expenseDate: "2025-02-05",
      },
      {
        title: "Duplicate in Batch",
        categoryId: testCategoryId,
        amount: 4000,
        expenseDate: "2025-02-06",
      },
      {
        title: "Duplicate in Batch",
        categoryId: testCategoryId,
        amount: 4000,
        expenseDate: "2025-02-06",
      },
    ];

    const result = await caller.expenses.bulkImport({ expenses });

    expect(result.success.length).toBe(2);
    expect(result.duplicates.length).toBe(1);
  });

  it("should support optional fields", async () => {
    const caller = appRouter.createCaller(mockContext);

    const categories = await db.getAllBudgetCategories();
    const testCategoryId = categories[0]?.id || 1;
    const budgets = await db.getAllBudgets();
    const testBudgetId = budgets[0]?.id;
    const departments = await db.getAllDepartments();
    const testDepartmentId = departments[0]?.id;

    const expenses = [
      {
        title: `Full Fields Test ${Date.now()}`,
        description: "Test description",
        categoryId: testCategoryId,
        budgetId: testBudgetId,
        departmentId: testDepartmentId,
        amount: 12000,
        expenseDate: "2025-02-07",
        notes: "Test notes",
      },
    ];

    const result = await caller.expenses.bulkImport({ expenses });

    expect(result.success.length).toBe(1);
    expect(result.errors.length).toBe(0);
  });
});
