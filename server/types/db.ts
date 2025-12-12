/**
 * Database Types
 *
 * Proper type definitions for database operations to reduce `as any` assertions.
 */

/**
 * Result type for MySQL INSERT operations
 * This provides proper typing for the insertId field from mysql2
 */
export interface InsertResult {
  insertId: number | bigint;
}

/**
 * Extended insert result with metadata
 */
export interface InsertResultWithMeta extends InsertResult {
  affectedRows: number;
  warningStatus: number;
}

/**
 * Helper type to extract insert ID as number
 */
export function getInsertId(result: unknown): number {
  if (result && typeof result === "object") {
    // Handle array results (from drizzle)
    if (Array.isArray(result)) {
      const firstResult = result[0];
      if (firstResult && "insertId" in firstResult) {
        return Number(firstResult.insertId);
      }
    }
    // Handle direct result object
    if ("insertId" in result) {
      return Number((result as InsertResult).insertId);
    }
  }
  return 0;
}

/**
 * Type guard to check if result has insertId
 */
export function hasInsertId(result: unknown): result is InsertResult {
  return (
    result !== null &&
    typeof result === "object" &&
    "insertId" in result &&
    (typeof (result as InsertResult).insertId === "number" ||
      typeof (result as InsertResult).insertId === "bigint")
  );
}

/**
 * Request with authenticated user context
 */
export interface AuthenticatedRequest {
  userId?: number;
  sessionId?: string;
  user?: {
    id: number;
    role: string;
    name: string;
    email: string;
  };
}

/**
 * Extend Express Request with our custom properties
 */
declare global {
  namespace Express {
    interface Request {
      userId?: number;
      sessionId?: string;
      cspNonce?: string;
    }
  }
}

/**
 * Tender status type
 */
export type TenderStatus = "draft" | "open" | "awarded" | "closed" | "archived";

/**
 * Invoice status type
 */
export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled";

/**
 * Delivery status type
 */
export type DeliveryStatus =
  | "pending"
  | "in_transit"
  | "delivered"
  | "cancelled";

/**
 * Requirement status type
 */
export type RequirementStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "in_progress"
  | "completed";

/**
 * Purchase order status type
 */
export type PurchaseOrderStatus =
  | "draft"
  | "pending"
  | "approved"
  | "sent"
  | "received"
  | "cancelled";

/**
 * Task status type
 */
export type TaskStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "blocked";

/**
 * Notification priority type
 */
export type NotificationPriority = "low" | "normal" | "high" | "urgent";

/**
 * Security event severity type
 */
export type SecurityEventSeverity = "low" | "medium" | "high" | "critical";

/**
 * Security event type
 */
export type SecurityEventType =
  | "login_attempt"
  | "login_success"
  | "login_failure"
  | "logout"
  | "password_change"
  | "permission_change"
  | "suspicious_activity"
  | "rate_limit_exceeded"
  | "csrf_violation"
  | "xss_attempt"
  | "sql_injection_attempt";

/**
 * Document type for OCR processing
 */
export type DocumentType =
  | "tender_notice"
  | "specifications"
  | "contract"
  | "invoice"
  | "purchase_order"
  | "delivery_note"
  | "general";

/**
 * Base entity with common fields
 */
export interface BaseEntity {
  id: number;
  createdAt: Date;
  updatedAt?: Date;
}

/**
 * Create entity input type (without id and timestamps)
 */
export type CreateEntityInput<T extends BaseEntity> = Omit<
  T,
  "id" | "createdAt" | "updatedAt"
>;

/**
 * Update entity input type (partial, without id)
 */
export type UpdateEntityInput<T extends BaseEntity> = Partial<
  Omit<T, "id" | "createdAt" | "updatedAt">
>;
