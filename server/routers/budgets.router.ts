import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, protectedMutationProcedure } from "../_core/trpc";
import * as db from "../db";
import { budgetSchemas } from "../_core/validationSchemas";
import { notifyOwner } from "../_core/notification";
import {
  generateBudgetForecast,
  isAIConfigured,
  getAvailableProviders,
} from "../ai";

export const budgetsRouter = router({
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
      const allBudgets = await db.getAllBudgets();

      if (!input) {
        return allBudgets;
      }

      const { page, pageSize } = input;
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;

      return {
        budgets: allBudgets.slice(startIndex, endIndex),
        total: allBudgets.length,
        page,
        pageSize,
        totalPages: Math.ceil(allBudgets.length / pageSize),
      };
    }),

  get: protectedProcedure
    .input(budgetSchemas.get)
    .query(async ({ input }) => {
      return await db.getBudgetById(input.id);
    }),

  create: protectedMutationProcedure
    .input(budgetSchemas.create)
    .mutation(async ({ input, ctx }) => {
      await db.createBudget({
        ...input,
        createdBy: ctx.user.id,
      } as any);
      return { success: true };
    }),

  update: protectedMutationProcedure
    .input(budgetSchemas.update)
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateBudget(id, data);
      return { success: true };
    }),

  approve: protectedMutationProcedure
    .input(budgetSchemas.approve)
    .mutation(async ({ input, ctx }) => {
      const budget = await db.getBudgetById(input.id);
      if (!budget) throw new TRPCError({ code: "NOT_FOUND" });

      await db.updateBudget(input.id, {
        approvalStatus: input.approved ? "approved" : "rejected",
        approvedBy: ctx.user.id,
        approvedAt: new Date(),
      });

      // Notify owner of budget approval/rejection
      await notifyOwner({
        title: `Budget ${input.approved ? "Approved" : "Rejected"}`,
        content: `Budget "${budget.name}" has been ${input.approved ? "approved" : "rejected"} by ${ctx.user.name}`,
      });

      return { success: true };
    }),

  // AI-powered budget forecasting
  forecast: protectedProcedure
    .input(
      z.object({
        timeframeDays: z.number().default(90),
      })
    )
    .mutation(async ({ input }) => {
      // Get all budgets
      const budgets = await db.getAllBudgets();

      // Get all expenses for trend analysis
      const expenses = await db.getAllExpenses();

      // Transform data for the AI forecasting service
      const budgetData = budgets.map((b) => ({
        id: b.id,
        name: b.name,
        fiscalYear: b.fiscalYear,
        allocatedAmount: b.allocatedAmount,
        spentAmount: b.spentAmount,
        departmentId: b.departmentId,
        status: b.status,
      }));

      const expenseData = expenses.map((e) => ({
        id: e.id,
        amount: e.amount,
        date: e.expenseDate || e.createdAt || new Date(),
        category: e.title || null,
        vendorName: null,
      }));

      // Generate forecast
      const forecast = await generateBudgetForecast(
        budgetData,
        expenseData,
        input.timeframeDays
      );

      return { forecast };
    }),

  getAIStatus: protectedProcedure.query(async () => {
    return {
      configured: isAIConfigured(),
      providers: getAvailableProviders(),
    };
  }),
});
