/**
 * Comprehensive Audit Logging Service
 *
 * Logs all security events, user actions, and system activities for compliance
 * and security monitoring. Integrates with the input validation service to
 * track security threats and violations.
 */

import type { User } from "../../drizzle/schema";
import * as db from "../db";

export interface SecurityEvent {
  type:
    | "sql_injection_attempt"
    | "xss_attempt"
    | "invalid_file_upload"
    | "rate_limit_exceeded"
    | "unauthorized_access"
    | "suspicious_activity";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  details?: Record<string, any>;
  userId?: number;
  ipAddress?: string;
  userAgent?: string;
  endpoint?: string;
  input?: string;
}

export interface AuditAction {
  action: string;
  entityType: string;
  entityId: number;
  changes?: Record<string, any>;
  userId: number;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
}

class AuditLogger {
  /**
   * Log a security event
   */
  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      // Create audit log entry
      await db.createAuditLog({
        userId: event.userId || 0, // Use 0 for anonymous/system events
        action: `security_event_${event.type}`,
        entityType: "security_event",
        entityId: 0,
        changes: JSON.stringify({
          type: event.type,
          severity: event.severity,
          description: event.description,
          details: event.details,
          endpoint: event.endpoint,
          input: event.input
            ? this.sanitizeInputForLogging(event.input)
            : undefined,
        }),
        ipAddress: event.ipAddress || "unknown",
        userAgent: event.userAgent || "unknown",
      });

      // For critical events, also create an anomaly record
      if (event.severity === "critical") {
        await db.createAnomaly({
          type: event.type,
          entityType: "security",
          entityId: event.userId || 0,
          severity: "critical",
          description: event.description,
          aiExplanation: `Security event detected: ${event.type}`,
          status: "new",
        });
      }

      // Log to console for immediate visibility
      console.warn(
        `[SECURITY EVENT] ${event.severity.toUpperCase()}: ${event.type}`,
        {
          description: event.description,
          userId: event.userId,
          ipAddress: event.ipAddress,
          endpoint: event.endpoint,
        }
      );
    } catch (error) {
      console.error("[AUDIT LOGGER] Failed to log security event:", error);
    }
  }

  /**
   * Log a user action for audit trail
   */
  async logUserAction(action: AuditAction): Promise<void> {
    try {
      await db.createAuditLog({
        userId: action.userId,
        action: action.action,
        entityType: action.entityType,
        entityId: action.entityId,
        changes: action.changes ? JSON.stringify(action.changes) : null,
        ipAddress: action.ipAddress || "unknown",
        userAgent: action.userAgent || "unknown",
      });
    } catch (error) {
      console.error("[AUDIT LOGGER] Failed to log user action:", error);
    }
  }

  /**
   * Log SQL injection attempt
   */
  async logSqlInjectionAttempt(
    input: string,
    userId?: number,
    ipAddress?: string,
    userAgent?: string,
    endpoint?: string
  ): Promise<void> {
    await this.logSecurityEvent({
      type: "sql_injection_attempt",
      severity: "high",
      description: "Potential SQL injection attack detected in user input",
      details: {
        detectedPatterns: this.identifySqlPatterns(input),
        inputLength: input.length,
      },
      userId,
      ipAddress,
      userAgent,
      endpoint,
      input,
    });
  }

  /**
   * Log XSS attempt
   */
  async logXssAttempt(
    input: string,
    userId?: number,
    ipAddress?: string,
    userAgent?: string,
    endpoint?: string
  ): Promise<void> {
    await this.logSecurityEvent({
      type: "xss_attempt",
      severity: "high",
      description: "Potential XSS attack detected in user input",
      details: {
        detectedPatterns: this.identifyXssPatterns(input),
        inputLength: input.length,
      },
      userId,
      ipAddress,
      userAgent,
      endpoint,
      input,
    });
  }

  /**
   * Log invalid file upload attempt
   */
  async logInvalidFileUpload(
    fileName: string,
    fileType: string,
    fileSize: number,
    reason: string,
    userId?: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logSecurityEvent({
      type: "invalid_file_upload",
      severity: "medium",
      description: "Invalid file upload attempt detected",
      details: {
        fileName,
        fileType,
        fileSize,
        reason,
      },
      userId,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log rate limit exceeded
   */
  async logRateLimitExceeded(
    endpoint: string,
    limit: number,
    windowMs: number,
    userId?: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logSecurityEvent({
      type: "rate_limit_exceeded",
      severity: "medium",
      description: "Rate limit exceeded for endpoint",
      details: {
        endpoint,
        limit,
        windowMs,
      },
      userId,
      ipAddress,
      userAgent,
      endpoint,
    });
  }

  /**
   * Log unauthorized access attempt
   */
  async logUnauthorizedAccess(
    resource: string,
    requiredPermission: string,
    userId?: number,
    ipAddress?: string,
    userAgent?: string,
    endpoint?: string
  ): Promise<void> {
    await this.logSecurityEvent({
      type: "unauthorized_access",
      severity: "high",
      description: "Unauthorized access attempt to protected resource",
      details: {
        resource,
        requiredPermission,
      },
      userId,
      ipAddress,
      userAgent,
      endpoint,
    });
  }

  /**
   * Log suspicious activity
   */
  async logSuspiciousActivity(
    description: string,
    details: Record<string, any>,
    userId?: number,
    ipAddress?: string,
    userAgent?: string,
    endpoint?: string
  ): Promise<void> {
    await this.logSecurityEvent({
      type: "suspicious_activity",
      severity: "medium",
      description,
      details,
      userId,
      ipAddress,
      userAgent,
      endpoint,
    });
  }

  /**
   * Create audit trail for data changes
   */
  async auditDataChange(
    entityType: string,
    entityId: number,
    action: "create" | "update" | "delete",
    oldData: any,
    newData: any,
    user: User,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const changes: Record<string, any> = {};

    if (action === "create") {
      changes.created = newData;
    } else if (action === "update") {
      changes.before = oldData;
      changes.after = newData;
      changes.modified_fields = this.getModifiedFields(oldData, newData);
    } else if (action === "delete") {
      changes.deleted = oldData;
    }

    await this.logUserAction({
      action: `${action}_${entityType}`,
      entityType,
      entityId,
      changes,
      userId: user.id,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Sanitize input for safe logging (remove sensitive data)
   */
  private sanitizeInputForLogging(input: string): string {
    // Truncate very long inputs
    if (input.length > 1000) {
      input = input.substring(0, 1000) + "... [truncated]";
    }

    // Remove potential passwords or sensitive data patterns
    return input
      .replace(/password["\s]*[:=]["\s]*[^"\s,}]+/gi, "password: [REDACTED]")
      .replace(/token["\s]*[:=]["\s]*[^"\s,}]+/gi, "token: [REDACTED]")
      .replace(/secret["\s]*[:=]["\s]*[^"\s,}]+/gi, "secret: [REDACTED]")
      .replace(/key["\s]*[:=]["\s]*[^"\s,}]+/gi, "key: [REDACTED]");
  }

  /**
   * Identify SQL injection patterns in input
   */
  private identifySqlPatterns(input: string): string[] {
    const patterns = [
      {
        name: "union_select",
        regex: /(\bunion\b.*\bselect\b)|(\bselect\b.*\bunion\b)/i,
      },
      { name: "sql_comments", regex: /(--|\#|\/\*|\*\/)/ },
      { name: "boolean_blind", regex: /(\band\b|\bor\b)\s+\d+\s*=\s*\d+/i },
      { name: "time_based", regex: /\b(sleep|waitfor|delay)\s*\(/i },
      {
        name: "stacked_queries",
        regex: /;\s*(drop|delete|insert|update|create|alter)\b/i,
      },
      { name: "information_schema", regex: /\binformation_schema\b/i },
    ];

    return patterns
      .filter(pattern => pattern.regex.test(input))
      .map(pattern => pattern.name);
  }

  /**
   * Identify XSS patterns in input
   */
  private identifyXssPatterns(input: string): string[] {
    const patterns = [
      { name: "script_tags", regex: /<script[^>]*>.*?<\/script>/gi },
      { name: "event_handlers", regex: /\bon\w+\s*=\s*['"]/i },
      { name: "javascript_urls", regex: /javascript\s*:/i },
      { name: "data_urls", regex: /data\s*:\s*text\/html/i },
      { name: "expression_attacks", regex: /expression\s*\(/i },
      {
        name: "eval_functions",
        regex: /\b(eval|setTimeout|setInterval)\s*\(/i,
      },
    ];

    return patterns
      .filter(pattern => pattern.regex.test(input))
      .map(pattern => pattern.name);
  }

  /**
   * Get modified fields between old and new data
   */
  private getModifiedFields(oldData: any, newData: any): string[] {
    const modified: string[] = [];

    if (typeof oldData !== "object" || typeof newData !== "object") {
      return modified;
    }

    const allKeys = new Set([
      ...Object.keys(oldData || {}),
      ...Object.keys(newData || {}),
    ]);

    for (const key of allKeys) {
      if (oldData[key] !== newData[key]) {
        modified.push(key);
      }
    }

    return modified;
  }
}

// Export singleton instance
export const auditLogger = new AuditLogger();
