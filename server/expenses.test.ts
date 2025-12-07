import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";

describe("Expenses Module", () => {
  let testCategoryId: number;
  let testBudgetId: number;
  let testDepartmentId: number;
  let testUserId: number;

  const mockContext = {
    user: { id: 1, openId: "test-user", name: "Test User", role: "admin" as const },
    req: {} as any,
    res: {} as any,
  };

  beforeAll(async () => {
    // Use existing category
    const categories = await db.getAllBudgetCategories();
    testCategoryId = categories[0]?.id || 1;

    // Create test budget
    const timestamp = Date.now();
    const budgetResult = await db.createBudget({
      name: `Test Budget for Expenses ${timestamp}`,
      fiscalYear: 2025,
      allocatedAmount: 50000000, // $500,000
      spentAmount: 0,
      categoryId: testCategoryId,
      departmentId: 1,
      startDate: new Date("2025-01-01"),
      endDate: new Date("2025-12-31"),
      status: "active",
      createdBy: 1,
    } as any);
    testBudgetId = Number(budgetResult.insertId);

    // Use existing department
    const departments = await db.getAllDepartments();
    testDepartmentId = departments[0]?.id || 1;

    testUserId = 1;
  });

  it("should create an expense", async () => {
    const caller = appRouter.createCaller(mockContext);

    const result = await caller.expenses.create({
      title: "Office Supplies Purchase",
      description: "Monthly office supplies for the team",
      categoryId: testCategoryId,
      budgetId: testBudgetId,
      departmentId: testDepartmentId,
      amount: 15000, // $150
      expenseDate: new Date("2025-01-15"),
      notes: "Purchased from Office Depot",
    });

    expect(result.success).toBe(true);
    expect(result.expenseNumber).toMatch(/^EXP-\d{6}-[A-Z0-9]{6}$/);
    expect(result.expenseId).toBeGreaterThan(0);

    // Verify expense was created
    const expense = await db.getExpenseById(result.expenseId);
    expect(expense).toBeTruthy();
    expect(expense?.title).toBe("Office Supplies Purchase");
    expect(expense?.categoryId).toBe(testCategoryId);
    expect(expense?.budgetId).toBe(testBudgetId);
    expect(expense?.amount).toBe(15000);
    expect(expense?.status).toBe("draft");
  });

  it("should update expense to pending status", async () => {
    const caller = appRouter.createCaller(mockContext);

    // Create expense
    const createResult = await caller.expenses.create({
      title: "Travel Expense",
      categoryId: testCategoryId,
      amount: 25000, // $250
      expenseDate: new Date("2025-01-20"),
    });

    // Update to pending
    const updateResult = await caller.expenses.update({
      id: createResult.expenseId,
      status: "pending",
    });

    expect(updateResult.success).toBe(true);

    // Verify status updated
    const expense = await db.getExpenseById(createResult.expenseId);
    expect(expense?.status).toBe("pending");
  });

  it("should approve an expense and update budget", async () => {
    const caller = appRouter.createCaller(mockContext);

    // Create expense
    const createResult = await caller.expenses.create({
      title: "Equipment Purchase",
      categoryId: testCategoryId,
      budgetId: testBudgetId,
      amount: 100000, // $1,000
      expenseDate: new Date("2025-01-25"),
    });

    // Update to pending
    await caller.expenses.update({
      id: createResult.expenseId,
      status: "pending",
    });

    // Get budget before approval
    const budgetBefore = await db.getBudgetById(testBudgetId);
    const spentBefore = budgetBefore?.spentAmount || 0;

    // Approve expense
    const approveResult = await caller.expenses.approve({
      id: createResult.expenseId,
      approved: true,
    });

    expect(approveResult.success).toBe(true);

    // Verify expense status updated
    const expense = await db.getExpenseById(createResult.expenseId);
    expect(expense?.status).toBe("approved");
    expect(expense?.approvedBy).toBe(testUserId);
    expect(expense?.approvedAt).toBeTruthy();

    // Verify budget spent amount updated
    const budgetAfter = await db.getBudgetById(testBudgetId);
    expect(budgetAfter?.spentAmount).toBe(spentBefore + 100000);
  });

  it("should reject an expense with reason", async () => {
    const caller = appRouter.createCaller(mockContext);

    // Create expense
    const createResult = await caller.expenses.create({
      title: "Unauthorized Purchase",
      categoryId: testCategoryId,
      amount: 50000, // $500
      expenseDate: new Date("2025-01-30"),
    });

    // Update to pending
    await caller.expenses.update({
      id: createResult.expenseId,
      status: "pending",
    });

    // Reject expense
    const rejectResult = await caller.expenses.approve({
      id: createResult.expenseId,
      approved: false,
      rejectionReason: "Purchase not authorized by department head",
    });

    expect(rejectResult.success).toBe(true);

    // Verify expense status and rejection reason
    const expense = await db.getExpenseById(createResult.expenseId);
    expect(expense?.status).toBe("rejected");
    expect(expense?.rejectionReason).toBe("Purchase not authorized by department head");
    expect(expense?.approvedBy).toBe(testUserId);
  });

  it("should not update budget for rejected expense", async () => {
    const caller = appRouter.createCaller(mockContext);

    // Create expense
    const createResult = await caller.expenses.create({
      title: "Test Expense for Rejection",
      categoryId: testCategoryId,
      budgetId: testBudgetId,
      amount: 30000, // $300
      expenseDate: new Date("2025-02-01"),
    });

    // Update to pending
    await caller.expenses.update({
      id: createResult.expenseId,
      status: "pending",
    });

    // Get budget before rejection
    const budgetBefore = await db.getBudgetById(testBudgetId);
    const spentBefore = budgetBefore?.spentAmount || 0;

    // Reject expense
    await caller.expenses.approve({
      id: createResult.expenseId,
      approved: false,
      rejectionReason: "Not necessary",
    });

    // Verify budget not updated
    const budgetAfter = await db.getBudgetById(testBudgetId);
    expect(budgetAfter?.spentAmount).toBe(spentBefore);
  });

  it("should mark approved expense as paid", async () => {
    const caller = appRouter.createCaller(mockContext);

    // Create and approve expense
    const createResult = await caller.expenses.create({
      title: "Vendor Payment",
      categoryId: testCategoryId,
      amount: 75000, // $750
      expenseDate: new Date("2025-02-05"),
    });

    await caller.expenses.update({
      id: createResult.expenseId,
      status: "pending",
    });

    await caller.expenses.approve({
      id: createResult.expenseId,
      approved: true,
    });

    // Mark as paid
    const paidResult = await caller.expenses.update({
      id: createResult.expenseId,
      status: "paid",
    });

    expect(paidResult.success).toBe(true);

    // Verify status
    const expense = await db.getExpenseById(createResult.expenseId);
    expect(expense?.status).toBe("paid");
  });

  it("should list all expenses", async () => {
    const caller = appRouter.createCaller(mockContext);

    const expenses = await caller.expenses.list();

    expect(Array.isArray(expenses)).toBe(true);
    expect(expenses.length).toBeGreaterThan(0);
    expect(expenses[0]).toHaveProperty("expenseNumber");
    expect(expenses[0]).toHaveProperty("title");
    expect(expenses[0]).toHaveProperty("categoryId");
    expect(expenses[0]).toHaveProperty("amount");
    expect(expenses[0]).toHaveProperty("status");
  });

  it("should get expense details", async () => {
    const caller = appRouter.createCaller(mockContext);

    // Create expense
    const createResult = await caller.expenses.create({
      title: "Test Expense for Details",
      description: "Detailed test expense",
      categoryId: testCategoryId,
      budgetId: testBudgetId,
      amount: 20000, // $200
      expenseDate: new Date("2025-02-10"),
      notes: "Test notes",
    });

    // Get expense details
    const expense = await caller.expenses.get({ id: createResult.expenseId });

    expect(expense).toBeTruthy();
    expect(expense?.id).toBe(createResult.expenseId);
    expect(expense?.expenseNumber).toBe(createResult.expenseNumber);
    expect(expense?.title).toBe("Test Expense for Details");
    expect(expense?.description).toBe("Detailed test expense");
    expect(expense?.notes).toBe("Test notes");
  });

  it("should prevent approval without pending status", async () => {
    const caller = appRouter.createCaller(mockContext);

    // Create expense in draft status
    const createResult = await caller.expenses.create({
      title: "Draft Expense",
      categoryId: testCategoryId,
      amount: 10000, // $100
      expenseDate: new Date("2025-02-15"),
    });

    // Try to approve without changing to pending
    await expect(
      caller.expenses.approve({
        id: createResult.expenseId,
        approved: true,
      })
    ).rejects.toThrow();
  });

  it("should calculate budget utilization correctly", async () => {
    const caller = appRouter.createCaller(mockContext);

    // Get current budget state
    const budgetBefore = await db.getBudgetById(testBudgetId);
    const utilizationBefore =
      ((budgetBefore?.spentAmount || 0) / (budgetBefore?.allocatedAmount || 1)) * 100;

    // Create and approve new expense
    const expenseAmount = 50000; // $500
    const createResult = await caller.expenses.create({
      title: "Budget Utilization Test",
      categoryId: testCategoryId,
      budgetId: testBudgetId,
      amount: expenseAmount,
      expenseDate: new Date("2025-02-20"),
    });

    await caller.expenses.update({
      id: createResult.expenseId,
      status: "pending",
    });

    await caller.expenses.approve({
      id: createResult.expenseId,
      approved: true,
    });

    // Get updated budget state
    const budgetAfter = await db.getBudgetById(testBudgetId);
    const utilizationAfter =
      ((budgetAfter?.spentAmount || 0) / (budgetAfter?.allocatedAmount || 1)) * 100;

    // Verify utilization increased
    expect(utilizationAfter).toBeGreaterThan(utilizationBefore);
    expect(budgetAfter?.spentAmount).toBe((budgetBefore?.spentAmount || 0) + expenseAmount);
  });
});
