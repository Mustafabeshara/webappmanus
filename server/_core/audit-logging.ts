import { createHmac } from "crypto";
import type { Request } from "express";
import * as db from "../db";
import { ENV } from "./env";

/**
 * Enhanced Audit Logging Service - Task 3.4, 10.1, 10.2, 10.3
 * Implements comprehensive audit trails with cryptographic integrity protection
 */

export interface AuditAction {
  userId: number;
  action: string;
  entityType: string;
  entityId: number;
  changes?: Record<string, { before?: any; after?: any }>;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
}

export interface ComplianceViolation {
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  entityType: string;
  entityId: number;
  userId: number;
}

class AuditLoggingService {
  private readonly HMAC_ALGORITHM = "sha256";

  /**
   * Get audit secret for integrity protection
   */
  private getAuditSecret(): string {
    return ENV.cookieSecret || "default-dev-secret-change-in-prod";
  }

  /**
   * Generate cryptographic checksum for audit record integrity
   */
  private generateChecksum(record: {
    userId: number;
    action: string;
    entityType: string;
    entityId: number;
    changes?: string;
    ipAddress?: string;
    userAgent?: string;
    createdAt: Date;
  }): string {
    const data = JSON.stringify({
      userId: record.userId,
      action: record.action,
      entityType: record.entityType,
      entityId: record.entityId,
      changes: record.changes,
      ipAddress: record.ipAddress,
      userAgent: record.userAgent,
      timestamp: record.createdAt.toISOString(),
    });

    const hmac = createHmac(this.HMAC_ALGORITHM, this.getAuditSecret());
    hmac.update(data);
    return hmac.digest("hex");
  }

  /**
   * Verify audit record integrity
   */
  verifyRecordIntegrity(record: any): boolean {
    if (!record.checksum) {
      return false; // Old records without checksum
    }

    const expectedChecksum = this.generateChecksum({
      userId: record.userId,
      action: record.action,
      entityType: record.entityType,
      entityId: record.entityId,
      changes: record.changes,
      ipAddress: record.ipAddress,
      userAgent: record.userAgent,
      createdAt: record.createdAt,
    });

    return record.checksum === expectedChecksum;
  }

  /**
   * Log an audit action with integrity protection
   */
  async logAction(action: AuditAction): Promise<void> {
    try {
      const now = new Date();
      const changes = action.changes ? JSON.stringify(action.changes) : null;

      const record = {
        userId: action.userId,
        action: action.action,
        entityType: action.entityType,
        entityId: action.entityId,
        changes,
        ipAddress: action.ipAddress || "unknown",
        userAgent: action.userAgent || null,
        createdAt: now,
      };

      // Generate integrity checksum
      const checksum = this.generateChecksum(record);

      // Create audit log entry
      await db.createAuditLog({
        ...record,
        checksum,
      });

      // Check for compliance violations
      const violations = await this.detectComplianceViolations(action);
      for (const violation of violations) {
        await this.handleComplianceViolation(violation);
      }
    } catch (error) {
      console.error("[Audit] Failed to log action:", error);
      // Don't throw error to avoid breaking the main operation
    }
  }

  /**
   * Create immutable audit record (for sensitive operations)
   */
  async createImmutableRecord(action: AuditAction): Promise<void> {
    // For now, this is the same as logAction but with additional metadata
    const enhancedAction = {
      ...action,
      metadata: {
        ...action.metadata,
        immutable: true,
        timestamp: new Date().toISOString(),
        nonce: Math.random().toString(36).substring(2),
      },
    };

    await this.logAction(enhancedAction);
  }

  /**
   * Detect compliance violations in audit actions
   */
  private async detectComplianceViolations(
    action: AuditAction
  ): Promise<ComplianceViolation[]> {
    const violations: ComplianceViolation[] = [];

    // Check for unauthorized access to sensitive data
    if (action.entityType === "users" && action.action === "view") {
      const user = await db.getUserById(action.userId);
      if (user?.role !== "admin" && action.entityId !== action.userId) {
        violations.push({
          type: "unauthorized_data_access",
          severity: "high",
          description:
            "User accessed another user's data without admin privileges",
          entityType: action.entityType,
          entityId: action.entityId,
          userId: action.userId,
        });
      }
    }

    // Check for bulk data modifications
    if (["delete", "update"].includes(action.action) && action.changes) {
      const changeCount = Object.keys(action.changes).length;
      if (changeCount > 10) {
        violations.push({
          type: "bulk_data_modification",
          severity: "medium",
          description: `Bulk modification of ${changeCount} fields detected`,
          entityType: action.entityType,
          entityId: action.entityId,
          userId: action.userId,
        });
      }
    }

    // Check for sensitive field modifications
    const sensitiveFields = [
      "passwordHash",
      "passwordSalt",
      "role",
      "permissions",
    ];
    if (action.changes) {
      for (const field of sensitiveFields) {
        if (field in action.changes) {
          violations.push({
            type: "sensitive_field_modification",
            severity: "high",
            description: `Sensitive field '${field}' was modified`,
            entityType: action.entityType,
            entityId: action.entityId,
            userId: action.userId,
          });
        }
      }
    }

    // Check for off-hours access (outside 6 AM - 10 PM)
    const hour = new Date().getHours();
    if (hour < 6 || hour > 22) {
      violations.push({
        type: "off_hours_access",
        severity: "low",
        description: `System access during off-hours (${hour}:00)`,
        entityType: action.entityType,
        entityId: action.entityId,
        userId: action.userId,
      });
    }

    return violations;
  }

  /**
   * Handle compliance violation
   */
  private async handleComplianceViolation(
    violation: ComplianceViolation
  ): Promise<void> {
    try {
      // Log as security event
      await db.createSecurityEvent({
        type: "suspicious_activity",
        severity: violation.severity,
        description: `Compliance violation: ${violation.description}`,
        details: JSON.stringify(violation),
        userId: violation.userId,
        ipAddress: "unknown",
        resolved: false,
        createdAt: new Date(),
      });

      // For high/critical violations, create notification for admins
      if (["high", "critical"].includes(violation.severity)) {
        const admins = await db.getAllUsers();
        const adminUsers = admins.filter(user => user.role === "admin");

        for (const admin of adminUsers) {
          await db.createNotification({
            userId: admin.id,
            type: "compliance_violation",
            title: "Compliance Violation Detected",
            message: violation.description,
            entityType: violation.entityType,
            entityId: violation.entityId,
            priority: violation.severity === "critical" ? "urgent" : "high",
            isRead: false,
            createdAt: new Date(),
          });
        }
      }
    } catch (error) {
      console.error("[Audit] Failed to handle compliance violation:", error);
    }
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(criteria: {
    startDate: Date;
    endDate: Date;
    entityTypes?: string[];
    actions?: string[];
    userIds?: number[];
  }): Promise<{
    totalActions: number;
    violations: ComplianceViolation[];
    summary: Record<string, number>;
    integrityCheck: { passed: number; failed: number };
  }> {
    try {
      // Get audit logs for the period
      const logs = await db.getAuditLogs({
        startDate: criteria.startDate,
        endDate: criteria.endDate,
        limit: 10000, // Large limit for comprehensive report
      });

      // Filter by criteria
      const filteredLogs = logs.filter(log => {
        if (
          criteria.entityTypes &&
          !criteria.entityTypes.includes(log.entityType)
        ) {
          return false;
        }
        if (criteria.actions && !criteria.actions.includes(log.action)) {
          return false;
        }
        if (criteria.userIds && !criteria.userIds.includes(log.userId)) {
          return false;
        }
        return true;
      });

      // Check integrity of audit records
      let integrityPassed = 0;
      let integrityFailed = 0;

      for (const log of filteredLogs) {
        if (this.verifyRecordIntegrity(log)) {
          integrityPassed++;
        } else {
          integrityFailed++;
        }
      }

      // Get security events (violations) for the period
      const securityEvents = await db.getSecurityEvents({
        startDate: criteria.startDate,
        endDate: criteria.endDate,
        limit: 1000,
      });

      const violations: ComplianceViolation[] = securityEvents.map(event => ({
        type: event.type,
        severity: event.severity,
        description: event.description,
        entityType: "security_event",
        entityId: event.id,
        userId: event.userId || 0,
      }));

      // Generate summary statistics
      const summary: Record<string, number> = {};
      for (const log of filteredLogs) {
        const key = `${log.entityType}_${log.action}`;
        summary[key] = (summary[key] || 0) + 1;
      }

      return {
        totalActions: filteredLogs.length,
        violations,
        summary,
        integrityCheck: {
          passed: integrityPassed,
          failed: integrityFailed,
        },
      };
    } catch (error) {
      console.error("[Audit] Failed to generate compliance report:", error);
      throw error;
    }
  }

  /**
   * Middleware to automatically log API requests
   */
  middleware() {
    return (req: Request, res: any, next: any) => {
      const originalSend = res.send;
      const startTime = Date.now();

      res.send = function (data: any) {
        const duration = Date.now() - startTime;
        const userId = (req as any).userId;
        const sessionId = (req as any).sessionId;

        // Only log state-changing operations and sensitive endpoints
        const shouldLog =
          req.method !== "GET" ||
          req.path.includes("/admin") ||
          req.path.includes("/auth") ||
          req.path.includes("/user");

        if (shouldLog && userId) {
          // Extract entity info from URL
          const pathParts = req.path.split("/");
          const entityType = pathParts[2] || "unknown";
          const entityId = parseInt(pathParts[3]) || 0;

          auditLogging
            .logAction({
              userId,
              action: req.method.toLowerCase(),
              entityType,
              entityId,
              metadata: {
                endpoint: req.path,
                method: req.method,
                statusCode: res.statusCode,
                duration,
                requestSize: req.headers["content-length"] || 0,
                responseSize: data ? data.length : 0,
              },
              ipAddress: getClientIp(req),
              userAgent: req.headers["user-agent"],
              sessionId,
            })
            .catch(error => {
              console.error("[Audit] Failed to log request:", error);
            });
        }

        return originalSend.call(this, data);
      };

      next();
    };
  }
}

/**
 * Get client IP address from request
 */
function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"] as string;
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  const realIp = req.headers["x-real-ip"] as string;
  if (realIp) {
    return realIp;
  }

  return (
    req.connection?.remoteAddress || req.socket?.remoteAddress || "unknown"
  );
}

export const auditLogging = new AuditLoggingService();
