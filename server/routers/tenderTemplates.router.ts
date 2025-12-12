import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";

export const tenderTemplatesRouter = router({
  list: protectedProcedure.query(async () => {
    return await db.getAllTenderTemplates();
  }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const template = await db.getTenderTemplateById(input.id);
      const items = await db.getTemplateItems(input.id);
      return { template, items };
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        categoryId: z.number().optional(),
        departmentId: z.number().optional(),
        defaultRequirements: z.string().optional(),
        defaultTerms: z.string().optional(),
        items: z
          .array(
            z.object({
              productId: z.number().optional(),
              description: z.string(),
              quantity: z.number().optional(),
              unit: z.string().optional(),
              estimatedPrice: z.number().optional(),
              specifications: z.string().optional(),
            })
          )
          .optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { items, ...templateData } = input;

      const result = await db.createTenderTemplate({
        ...templateData,
        createdBy: ctx.user.id,
      } as any);

      const templateId = Number(result.insertId);

      if (items) {
        for (const item of items) {
          await db.createTemplateItem({
            templateId,
            ...item,
          } as any);
        }
      }

      return { success: true, templateId };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteTenderTemplate(input.id);
      return { success: true };
    }),
});
