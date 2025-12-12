import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, protectedMutationProcedure } from "../_core/trpc";
import * as db from "../db";
import * as utils from "../utils";
import { analyzeExpenses } from "../ai/expense-analysis";
import { isAIConfigured, getAvailableProviders } from "../ai/config";

/**
 * Helper function to send notifications to the project owner
 */
async function notifyOwner(payload: {
  title: string;
  content: string;
}): Promise<boolean> {
  const { notifyOwner: notify } = await import("../_core/notification");
  return notify(payload);
}

export const expensesRouter = router({
  /**
   * List all expenses with pagination support
   */
  list: protectedProcedure
    .input(
      z
        .object({
          page: z.number().int().min(1).default(1),
          pageSize: z.number().int().min(1).max(100).default(20),
        })
        .optional()
    )
    .query(async ({ input }) => {
      if (!input) {
        return await db.getAllExpenses();
      }

      const { data, totalCount } = await db.getExpensesPaginated(
        input.page,
        input.pageSize
      );
      const totalPages = Math.ceil(totalCount / input.pageSize);

      return {
        data,
        pagination: {
          page: input.page,
          pageSize: input.pageSize,
          totalCount,
          totalPages,
        },
      };
    }),

  /**
   * Get a single expense by ID
   */
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const expense = await db.getExpenseById(input.id);
      if (!expense) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Expense not found",
        });
      }
      return expense;
    }),

  /**
   * Create a new expense
   */
  create: protectedMutationProcedure
    .input(
      z.object({
        title: z.string().min(1, "Title is required"),
        description: z.string().optional(),
        categoryId: z.number(),
        budgetId: z.number().optional(),
        departmentId: z.number().optional(),
        tenderId: z.number().optional(),
        amount: z.number().positive("Amount must be positive"),
        expenseDate: z.date().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const expenseNumber = utils.generateExpenseNumber();

      const result = await db.createExpense({
        ...input,
        expenseNumber,
        createdBy: ctx.user.id,
      } as any);

      return {
        success: true,
        expenseNumber,
        id: Number(result.insertId),
      };
    }),

  /**
   * Update an existing expense
   */
  update: protectedMutationProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        amount: z.number().positive().optional(),
        status: z
          .enum(["draft", "pending", "approved", "rejected", "paid"])
          .optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;

      // Verify expense exists
      const expense = await db.getExpenseById(id);
      if (!expense) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Expense not found",
        });
      }

      await db.updateExpense(id, data);
      return { success: true };
    }),

  /**
   * Approve or reject an expense with budget tracking
   */
  approve: protectedMutationProcedure
    .input(
      z.object({
        id: z.number(),
        approved: z.boolean(),
        rejectionReason: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const expense = await db.getExpenseById(input.id);
      if (!expense) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Expense not found",
        });
      }

      // Update expense status
      await db.updateExpense(input.id, {
        status: input.approved ? "approved" : "rejected",
        approvedBy: ctx.user.id,
        approvedAt: new Date(),
        rejectionReason: input.rejectionReason,
      });

      // Update budget spent amount if approved
      if (input.approved && expense.budgetId) {
        await db.updateBudgetSpent(expense.budgetId, expense.amount);

        // Check for budget overrun and notify if >90%
        const budget = await db.getBudgetById(expense.budgetId);
        if (budget) {
          const newSpentAmount = budget.spentAmount + expense.amount;
          const percentUsed = (newSpentAmount / budget.allocatedAmount) * 100;

          if (percentUsed >= 90) {
            await notifyOwner({
              title: "Budget Alert: 90% Threshold Reached",
              content: `Budget "${budget.name}" has reached ${percentUsed.toFixed(1)}% of allocated amount (${utils.formatCurrency(newSpentAmount)} / ${utils.formatCurrency(budget.allocatedAmount)})`,
            });
          }
        }
      }

      return { success: true };
    }),

  /**
   * AI-powered expense analysis
   */
  analyze: protectedMutationProcedure.mutation(async () => {
    // Check if AI is configured
    if (!isAIConfigured()) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "AI service is not configured. Please set up an AI provider API key.",
      });
    }

    // Get all expenses
    const expenses = await db.getAllExpenses();

    if (expenses.length === 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No expenses found to analyze",
      });
    }

    // Get budget categories for category suggestions
    const budgetCategories = await db.getAllBudgetCategories();
    const categoryNames = budgetCategories.map((c) => c.name);

    // Transform expenses for AI analysis
    const expenseData = expenses.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description || null,
      amount: e.amount,
      category: null, // We'll derive this from categoryId
      categoryId: e.categoryId,
      departmentId: e.departmentId,
      vendorName: null,
      expenseDate: e.expenseDate || e.createdAt || new Date(),
      status: e.status,
    }));

    // Run AI analysis
    const analysis = await analyzeExpenses(
      expenseData,
      categoryNames.length > 0
        ? categoryNames
        : [
            "Office Supplies",
            "Travel",
            "Software",
            "Equipment",
            "Marketing",
            "Professional Services",
            "Utilities",
            "Maintenance",
            "Training",
            "Medical",
          ]
    );

    return { analysis };
  }),

  /**
   * Get AI configuration status
   */
  getAIStatus: protectedProcedure.query(async () => {
    return {
      configured: isAIConfigured(),
      providers: getAvailableProviders(),
    };
  }),
});
