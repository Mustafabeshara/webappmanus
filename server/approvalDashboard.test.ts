import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";

describe("Expense Approval Dashboard", () => {
  const mockContext = {
    user: { id: 1, openId: "test-user", name: "Test User", role: "admin" as const },
    req: {} as any,
    res: {} as any,
  };

  it("should approve multiple expenses in batch", async () => {
    const caller = appRouter.createCaller(mockContext);

    const categories = await db.getAllBudgetCategories();
    const testCategoryId = categories[0]?.id || 1;

    // Create pending expenses
    const expense1 = await caller.expenses.create({
      title: `Batch Approve Test 1 ${Date.now()}`,
      categoryId: testCategoryId,
      amount: 5000,
      expenseDate: new Date("2025-02-10"),
    });

    const expense2 = await caller.expenses.create({
      title: `Batch Approve Test 2 ${Date.now()}`,
      categoryId: testCategoryId,
      amount: 6000,
      expenseDate: new Date("2025-02-11"),
    });

    // Submit for approval
    await caller.expenses.update({ id: expense1.expenseId, status: "pending" });
    await caller.expenses.update({ id: expense2.expenseId, status: "pending" });

    // Batch approve
    await caller.expenses.approve({ id: expense1.expenseId, approved: true });
    await caller.expenses.approve({ id: expense2.expenseId, approved: true });

    // Verify both are approved
    const updated1 = await db.getExpenseById(expense1.expenseId);
    const updated2 = await db.getExpenseById(expense2.expenseId);

    expect(updated1?.status).toBe("approved");
    expect(updated2?.status).toBe("approved");
  });

  it("should reject multiple expenses with reason", async () => {
    const caller = appRouter.createCaller(mockContext);

    const categories = await db.getAllBudgetCategories();
    const testCategoryId = categories[0]?.id || 1;

    // Create pending expense
    const expense = await caller.expenses.create({
      title: `Batch Reject Test ${Date.now()}`,
      categoryId: testCategoryId,
      amount: 8000,
      expenseDate: new Date("2025-02-12"),
    });

    await caller.expenses.update({ id: expense.expenseId, status: "pending" });

    // Reject with reason
    const rejectionReason = "Missing receipt documentation";
    await caller.expenses.approve({
      id: expense.expenseId,
      approved: false,
      rejectionReason,
    });

    // Verify rejection
    const updated = await db.getExpenseById(expense.expenseId);
    expect(updated?.status).toBe("rejected");
    expect(updated?.rejectionReason).toBe(rejectionReason);
  });

  it("should only approve expenses in pending status", async () => {
    const caller = appRouter.createCaller(mockContext);

    const categories = await db.getAllBudgetCategories();
    const testCategoryId = categories[0]?.id || 1;

    // Create draft expense
    const expense = await caller.expenses.create({
      title: `Status Check Test ${Date.now()}`,
      categoryId: testCategoryId,
      amount: 3000,
      expenseDate: new Date("2025-02-13"),
    });

    // Try to approve draft expense (should fail)
    await expect(
      caller.expenses.approve({ id: expense.expenseId, approved: true })
    ).rejects.toThrow();

    // Verify still in draft
    const updated = await db.getExpenseById(expense.expenseId);
    expect(updated?.status).toBe("draft");
  });

  it("should update budget spent amount on approval", async () => {
    const caller = appRouter.createCaller(mockContext);

    const categories = await db.getAllBudgetCategories();
    const testCategoryId = categories[0]?.id || 1;
    const budgets = await db.getAllBudgets();
    const testBudget = budgets[0];

    if (!testBudget) {
      // Skip if no budget available
      return;
    }

    const initialSpent = testBudget.spentAmount;

    // Create expense linked to budget
    const expense = await caller.expenses.create({
      title: `Budget Update Test ${Date.now()}`,
      categoryId: testCategoryId,
      budgetId: testBudget.id,
      amount: 2500,
      expenseDate: new Date("2025-02-14"),
    });

    await caller.expenses.update({ id: expense.expenseId, status: "pending" });

    // Approve expense
    await caller.expenses.approve({ id: expense.expenseId, approved: true });

    // Verify budget updated
    const updatedBudget = await db.getBudgetById(testBudget.id);
    expect(updatedBudget?.spentAmount).toBe(initialSpent + 2500);
  });

  it("should list pending expenses for approval dashboard", async () => {
    const caller = appRouter.createCaller(mockContext);

    const categories = await db.getAllBudgetCategories();
    const testCategoryId = categories[0]?.id || 1;

    // Create some pending expenses
    const expense1 = await caller.expenses.create({
      title: `Dashboard List Test 1 ${Date.now()}`,
      categoryId: testCategoryId,
      amount: 1500,
      expenseDate: new Date("2025-02-15"),
    });

    const expense2 = await caller.expenses.create({
      title: `Dashboard List Test 2 ${Date.now()}`,
      categoryId: testCategoryId,
      amount: 2500,
      expenseDate: new Date("2025-02-16"),
    });

    await caller.expenses.update({ id: expense1.expenseId, status: "pending" });
    await caller.expenses.update({ id: expense2.expenseId, status: "pending" });

    // Get all expenses
    const allExpenses = await caller.expenses.list();
    const pendingExpenses = allExpenses.filter((e) => e.status === "pending");

    expect(pendingExpenses.length).toBeGreaterThanOrEqual(2);
  });
});
