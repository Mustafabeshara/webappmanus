import { z } from "zod";
import { router } from "../_core/trpc";
import { adminProcedure } from "./shared";
import * as db from "../db";

export const usersRouter = router({
  list: adminProcedure.query(async () => {
    return await db.getAllUsers();
  }),

  updateRole: adminProcedure
    .input(z.object({
      userId: z.number(),
      role: z.enum(["admin", "user"]),
    }))
    .mutation(async ({ input }) => {
      await db.updateUserRole(input.userId, input.role);
      return { success: true };
    }),

  getPermissions: adminProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      return await db.getUserPermissions(input.userId);
    }),

  updatePermission: adminProcedure
    .input(z.object({
      userId: z.number(),
      module: z.string(),
      canView: z.boolean().optional(),
      canCreate: z.boolean().optional(),
      canEdit: z.boolean().optional(),
      canDelete: z.boolean().optional(),
      canApprove: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      await db.upsertUserPermission(input as any);
      return { success: true };
    }),
});
