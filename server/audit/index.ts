/**
 * Audit Trail Service
 * Comprehensive logging for compliance and traceability
 */

import * as db from "../db";

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  VIEW = 'VIEW',
  EXPORT = 'EXPORT',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

export interface AuditChanges {
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  diff?: Record<string, { from: unknown; to: unknown }>;
}

export interface AuditLogEntry {
  userId: number;
  action: AuditAction | string;
  entityType: string;
  entityId: number;
  changes?: AuditChanges;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log an audit entry
 */
export async function logAudit(entry: AuditLogEntry): Promise<void> {
  try {
    await db.createAuditLog({
      userId: entry.userId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      changes: entry.changes ? JSON.stringify(entry.changes) : null,
      ipAddress: entry.ipAddress || null,
      userAgent: entry.userAgent || null,
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
}

/**
 * Log create action
 */
export async function logCreate(
  entityType: string,
  entityId: number,
  data: Record<string, unknown>,
  userId: number,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logAudit({
    userId,
    action: AuditAction.CREATE,
    entityType,
    entityId,
    changes: { after: data },
    ipAddress,
    userAgent,
  });
}

/**
 * Log update action with before/after diff
 */
export async function logUpdate(
  entityType: string,
  entityId: number,
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  userId: number,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  const diff = calculateDiff(before, after);

  await logAudit({
    userId,
    action: AuditAction.UPDATE,
    entityType,
    entityId,
    changes: { before, after, diff },
    ipAddress,
    userAgent,
  });
}

/**
 * Log delete action
 */
export async function logDelete(
  entityType: string,
  entityId: number,
  data: Record<string, unknown>,
  userId: number,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logAudit({
    userId,
    action: AuditAction.DELETE,
    entityType,
    entityId,
    changes: { before: data },
    ipAddress,
    userAgent,
  });
}

/**
 * Log view action
 */
export async function logView(
  entityType: string,
  entityId: number,
  userId: number,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logAudit({
    userId,
    action: AuditAction.VIEW,
    entityType,
    entityId,
    ipAddress,
    userAgent,
  });
}

/**
 * Log export action
 */
export async function logExport(
  entityType: string,
  count: number,
  format: string,
  userId: number,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logAudit({
    userId,
    action: AuditAction.EXPORT,
    entityType,
    entityId: 0, // No specific entity
    changes: { after: { count, format } },
    ipAddress,
    userAgent,
  });
}

/**
 * Log approval action
 */
export async function logApprove(
  entityType: string,
  entityId: number,
  userId: number,
  approved: boolean,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logAudit({
    userId,
    action: approved ? AuditAction.APPROVE : AuditAction.REJECT,
    entityType,
    entityId,
    changes: { after: { approved } },
    ipAddress,
    userAgent,
  });
}

/**
 * Get audit trail for an entity
 */
export async function getEntityAuditTrail(
  entityType: string,
  entityId: number,
  limit: number = 50
) {
  return db.getAuditLogsForEntity(entityType, entityId, limit);
}

/**
 * Get user activity log
 */
export async function getUserActivity(
  userId: number,
  limit: number = 100
) {
  return db.getAuditLogsByUser(userId, limit);
}

/**
 * Get all audit logs with filtering
 */
export async function getAuditLogs(filters?: {
  entityType?: string;
  action?: string;
  userId?: number;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}) {
  return db.getAuditLogs(filters);
}

/**
 * Get audit statistics
 */
export async function getAuditStats(startDate?: Date, endDate?: Date) {
  const logs = await db.getAuditLogs({
    startDate,
    endDate,
    limit: 10000,
  });

  const stats = {
    totalActions: logs.length,
    actionBreakdown: {} as Record<string, number>,
    entityBreakdown: {} as Record<string, number>,
    userBreakdown: {} as Record<number, number>,
    recentActivity: logs.slice(0, 10),
  };

  for (const log of logs) {
    // Action breakdown
    stats.actionBreakdown[log.action] = (stats.actionBreakdown[log.action] || 0) + 1;

    // Entity breakdown
    stats.entityBreakdown[log.entityType] = (stats.entityBreakdown[log.entityType] || 0) + 1;

    // User breakdown
    stats.userBreakdown[log.userId] = (stats.userBreakdown[log.userId] || 0) + 1;
  }

  return stats;
}

/**
 * Calculate diff between two objects
 */
function calculateDiff(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): Record<string, { from: unknown; to: unknown }> {
  const diff: Record<string, { from: unknown; to: unknown }> = {};
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

  for (const key of allKeys) {
    const beforeVal = before[key];
    const afterVal = after[key];

    // Skip timestamp fields that auto-update
    if (key === 'updatedAt' || key === 'createdAt') continue;

    if (JSON.stringify(beforeVal) !== JSON.stringify(afterVal)) {
      diff[key] = {
        from: beforeVal,
        to: afterVal,
      };
    }
  }

  return diff;
}
