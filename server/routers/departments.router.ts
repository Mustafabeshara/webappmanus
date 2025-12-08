import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";

export const departmentsRouter = router({
  list: protectedProcedure.query(async () => {
    return await db.getAllDepartments();
  }),

  create: protectedProcedure
    .input(z.object({
      name: z.string(),
      code: z.string(),
      description: z.string().optional(),
      managerId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      await db.createDepartment(input);
      return { success: true };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      managerId: z.number().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateDepartment(id, data);
      return { success: true };
    }),
});
