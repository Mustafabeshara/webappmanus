import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../_core/trpc";
import * as db from "../db";

// Admin-only procedure
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }
  return next({ ctx });
});

// Helper to check user permissions
export async function checkPermission(userId: number, module: string, action: 'view' | 'create' | 'edit' | 'delete' | 'approve') {
  const permissions = await db.getUserPermissions(userId);
  const modulePermission = permissions.find(p => p.module === module);

  if (!modulePermission) return false;

  const permissionMap = {
    view: modulePermission.canView,
    create: modulePermission.canCreate,
    edit: modulePermission.canEdit,
    delete: modulePermission.canDelete,
    approve: modulePermission.canApprove,
  };

  return permissionMap[action] || false;
}
