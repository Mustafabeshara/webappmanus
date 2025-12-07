import { TRPCError } from "@trpc/server";
import type { TrpcContext } from "./context";
import * as db from "../db";

/**
 * Permission enforcement middleware for module-level access control
 * Implements H1: Module-Level Permission Enforcement
 */

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'approve';
export type ModuleName = 
  | 'tenders' 
  | 'budgets' 
  | 'inventory' 
  | 'suppliers' 
  | 'customers' 
  | 'invoices' 
  | 'purchaseOrders' 
  | 'expenses' 
  | 'deliveries' 
  | 'tasks'
  | 'users'
  | 'auditLogs';

/**
 * Check if user has specific permission for a module
 */
export async function hasPermission(
  userId: number,
  userRole: string,
  module: ModuleName,
  action: PermissionAction
): Promise<boolean> {
  // Admins bypass all permission checks
  if (userRole === 'admin') {
    return true;
  }

  // Get user's permissions for this module
  const permissions = await db.getUserPermissions(userId);
  const modulePerms = permissions.find(p => p.module === module);

  // If no permissions defined, deny access
  if (!modulePerms) {
    return false;
  }

  // Check specific permission
  const permissionMap = {
    view: modulePerms.canView,
    create: modulePerms.canCreate,
    edit: modulePerms.canEdit,
    delete: modulePerms.canDelete,
    approve: modulePerms.canApprove,
  };

  return permissionMap[action] === true;
}

/**
 * Middleware factory for permission checking
 * Usage: .use(requirePermission('budgets', 'create'))
 */
export function createPermissionMiddleware(
  module: ModuleName,
  action: PermissionAction
) {
  return async ({ ctx, next }: { ctx: TrpcContext; next: any }) => {
    if (!ctx.user) {
      throw new TRPCError({ 
        code: "UNAUTHORIZED",
        message: "Authentication required"
      });
    }

    const allowed = await hasPermission(
      ctx.user.id,
      ctx.user.role,
      module,
      action
    );

    if (!allowed) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `You don't have permission to ${action} ${module}`,
      });
    }

    return next({ ctx });
  };
}

/**
 * Resource ownership check for IDOR prevention
 * Implements H2: Resource-Level Authorization
 */
export interface ResourceOwnership {
  createdBy?: number | null;
  userId?: number | null;
  assigneeId?: number | null;
  departmentId?: number | null;
}

export async function checkResourceAccess(
  ctx: TrpcContext,
  resource: ResourceOwnership | null,
  resourceType: string
): Promise<void> {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  if (!resource) {
    throw new TRPCError({ 
      code: "NOT_FOUND",
      message: `${resourceType} not found`
    });
  }

  // Admins can access all resources
  if (ctx.user.role === 'admin') {
    return;
  }

  // Check ownership
  const isOwner = resource.createdBy === ctx.user.id || 
                  resource.userId === ctx.user.id ||
                  resource.assigneeId === ctx.user.id;

  // Check department access
  const sameDepartment = resource.departmentId && 
                         resource.departmentId === ctx.user.departmentId;

  if (!isOwner && !sameDepartment) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `You don't have access to this ${resourceType}`,
    });
  }
}

/**
 * Audit logging helper
 * Implements H3: Comprehensive Audit Logging
 */
export interface AuditLogParams {
  userId: number;
  action: string;
  entityType: string;
  entityId: number;
  changes?: Record<string, any>;
  metadata?: Record<string, any>;
}

export async function logAudit(params: AuditLogParams): Promise<void> {
  try {
    await db.createAuditLog({
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      changes: params.changes ? JSON.stringify(params.changes) : null,
    });
  } catch (error) {
    // Log audit failure but don't block the operation
    console.error('Failed to create audit log:', error);
  }
}

/**
 * Approval workflow validation
 * Implements M12: Approval Workflow Validation
 */
export async function validateApproval(
  ctx: TrpcContext,
  resource: { createdBy: number },
  module: ModuleName
): Promise<void> {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  // Prevent self-approval
  if (resource.createdBy === ctx.user.id) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You cannot approve your own submission",
    });
  }

  // Check if user has approve permission
  if (ctx.user.role !== 'admin') {
    const allowed = await hasPermission(
      ctx.user.id,
      ctx.user.role,
      module,
      'approve'
    );

    if (!allowed) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You don't have approval permissions for this module",
      });
    }
  }
}

/**
 * Data masking utility for logging
 * Implements M10: Data Masking in Logs
 */
const SENSITIVE_FIELDS = [
  'password',
  'taxId',
  'taxid',
  'creditLimit',
  'creditlimit',
  'email',
  'phone',
  'secret',
  'token',
  'key',
];

export function maskSensitiveData(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => maskSensitiveData(item));
  }

  const masked: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const keyLower = key.toLowerCase();
    const isSensitive = SENSITIVE_FIELDS.some(field => 
      keyLower.includes(field)
    );

    if (isSensitive && typeof value === 'string') {
      masked[key] = '***REDACTED***';
    } else if (typeof value === 'object') {
      masked[key] = maskSensitiveData(value);
    } else {
      masked[key] = value;
    }
  }

  return masked;
}
