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

/**
 * Tender entity creation input
 */
export interface CreateTenderInput {
  referenceNumber: string;
  title: string;
  description?: string | null;
  customerId?: number | null;
  departmentId?: number | null;
  categoryId?: number | null;
  templateId?: number | null;
  status?: TenderStatus;
  submissionDeadline?: Date | null;
  evaluationDeadline?: Date | null;
  requirements?: string | null;
  terms?: string | null;
  estimatedValue?: number | null;
  createdBy: number;
}

/**
 * Tender entity update input
 */
export interface UpdateTenderInput {
  title?: string;
  description?: string | null;
  status?: TenderStatus;
  submissionDeadline?: Date | null;
  evaluationDeadline?: Date | null;
  requirements?: string | null;
  terms?: string | null;
  estimatedValue?: number | null;
  awardedSupplierId?: number | null;
  awardedValue?: number | null;
  awardedAt?: Date | null;
  notes?: string | null;
  isParticipating?: boolean;
}

/**
 * Tender item creation input
 */
export interface CreateTenderItemInput {
  tenderId: number;
  productId?: number | null;
  description: string;
  quantity: number;
  unit?: string | null;
  specifications?: string | null;
  estimatedPrice?: number | null;
}

/**
 * Tender participant creation input
 */
export interface CreateTenderParticipantInput {
  tenderId: number;
  supplierId: number;
  totalBidAmount?: number | null;
  notes?: string | null;
}

/**
 * Tender template creation input
 */
export interface CreateTenderTemplateInput {
  name: string;
  description?: string | null;
  categoryId?: number | null;
  departmentId?: number | null;
  defaultRequirements?: string | null;
  defaultTerms?: string | null;
  createdBy: number;
}

/**
 * Tender template update input
 */
export interface UpdateTenderTemplateInput {
  name?: string;
  description?: string | null;
  defaultRequirements?: string | null;
  defaultTerms?: string | null;
}

/**
 * Invoice creation input
 */
export interface CreateInvoiceInput {
  invoiceNumber: string;
  customerId: number;
  tenderId?: number | null;
  purchaseOrderId?: number | null;
  status?: InvoiceStatus;
  issueDate?: Date | null;
  dueDate?: Date | null;
  subtotal: number;
  taxAmount?: number;
  totalAmount: number;
  notes?: string | null;
  createdBy: number;
}

/**
 * Budget creation input
 */
export interface CreateBudgetInput {
  name: string;
  categoryId: number;
  departmentId?: number | null;
  fiscalYear: number;
  allocatedAmount: number;
  spentAmount?: number;
  status?: "draft" | "active" | "closed";
  approvalStatus?: "pending" | "approved" | "rejected";
  notes?: string | null;
  createdBy: number;
}

/**
 * Product creation input
 */
export interface CreateProductInput {
  name: string;
  sku?: string | null;
  categoryId?: number | null;
  description?: string | null;
  specifications?: string | null;
  unitPrice?: number | null;
  minOrderQuantity?: number;
  leadTimeDays?: number;
  supplierId?: number | null;
  isActive?: boolean;
}

/**
 * Expense creation input
 */
export interface CreateExpenseInput {
  description: string;
  categoryId?: number | null;
  departmentId?: number | null;
  budgetId?: number | null;
  amount: number;
  expenseDate: Date;
  vendor?: string | null;
  receiptUrl?: string | null;
  status?: "pending" | "approved" | "rejected" | "paid";
  notes?: string | null;
  createdBy: number;
}

/**
 * Participant bid item creation input
 */
export interface CreateParticipantBidItemInput {
  participantId: number;
  tenderItemId: number;
  unitPrice: number;
  totalPrice: number;
  deliveryTime?: string | null;
  notes?: string | null;
}
