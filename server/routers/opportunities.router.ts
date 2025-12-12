import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";

/**
 * Opportunities (Pipeline) & Forecast Inputs Router
 * Handles sales pipeline and opportunity management
 */
export const opportunitiesRouter = router({
  list: protectedProcedure.query(async () => {
    return await db.getAllOpportunities();
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        customerId: z.number().optional(),
        amount: z.number().min(0),
        probability: z.number().min(0).max(100).default(50),
        stage: z
          .enum([
            "prospect",
            "proposal",
            "negotiation",
            "verbal",
            "won",
            "lost",
          ])
          .default("prospect"),
        expectedCloseDate: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await db.createOpportunity({
        ...input,
        expectedCloseDate: input.expectedCloseDate
          ? new Date(input.expectedCloseDate)
          : undefined,
        createdBy: ctx.user.id,
        ownerId: ctx.user.id,
      } as any);
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        amount: z.number().optional(),
        probability: z.number().min(0).max(100).optional(),
        stage: z
          .enum([
            "prospect",
            "proposal",
            "negotiation",
            "verbal",
            "won",
            "lost",
          ])
          .optional(),
        expectedCloseDate: z.string().optional(),
        status: z.enum(["open", "closed"]).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, expectedCloseDate, ...rest } = input;
      await db.updateOpportunity(id, {
        ...rest,
        expectedCloseDate: expectedCloseDate
          ? new Date(expectedCloseDate)
          : undefined,
      });
      return { success: true };
    }),
});
