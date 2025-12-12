import { z } from "zod";
import { adminProcedure, adminMutationProcedure, router } from "../_core/trpc";
import { idSchema, userSchemas } from "../_core/validationSchemas";
import * as db from "../db";

export const usersRouter = router({
  list: adminProcedure.query(async () => {
    return await db.getAllUsers();
  }),

  updateRole: adminMutationProcedure
    .input(userSchemas.updateRole)
    .mutation(async ({ input }) => {
      await db.updateUserRole(input.userId, input.role);
      return { success: true };
    }),

  getPermissions: adminProcedure
    .input(z.object({ userId: idSchema }))
    .query(async ({ input }) => {
      return await db.getUserPermissions(input.userId);
    }),

  updatePermission: adminMutationProcedure
    .input(userSchemas.updatePermission)
    .mutation(async ({ input }) => {
      await db.upsertUserPermission(input);
      return { success: true };
    }),
});
