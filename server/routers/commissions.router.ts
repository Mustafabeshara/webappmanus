import { z } from "zod";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";

/**
 * Commissions Router
 * Handles commission rules, assignments, and entries
 */
export const commissionsRouter = router({
  listRules: protectedProcedure.query(async () => {
    return await db.listCommissionRules();
  }),

  createRule: adminProcedure
    .input(
      z.object({
        name: z.string(),
        scopeType: z.enum(["all", "product", "category"]).default("all"),
        productId: z.number().optional(),
        category: z.string().optional(),
        rateBps: z.number().min(0),
        minMarginBps: z.number().min(0).optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await db.createCommissionRule(input as any);
    }),

  assignments: protectedProcedure.query(async () => {
    return await db.listCommissionAssignments();
  }),

  assignRule: adminProcedure
    .input(
      z.object({
        ruleId: z.number(),
        userId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      return await db.createCommissionAssignment(input as any);
    }),

  entries: protectedProcedure.query(async () => {
    return await db.listCommissionEntries();
  }),

  updateEntry: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["pending", "approved", "paid"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...rest } = input;
      await db.updateCommissionEntry(id, rest as any);
      return { success: true };
    }),
});
