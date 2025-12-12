/**
 * Application-wide constants
 * Centralizes magic numbers and configuration values
 */

// =============================================================================
// APPROVAL THRESHOLDS (in cents/fils)
// =============================================================================

/** Threshold for requiring Fatwa approval: 75,000 KWD */
export const THRESHOLD_FATWA = 75_000 * 100;

/** Threshold for requiring CTC/Audit approval: 100,000 KWD */
export const THRESHOLD_CTC_AUDIT = 100_000 * 100;

export const APPROVAL_THRESHOLDS = {
  /** Fatwa approval required above 75,000 KWD */
  FATWA: THRESHOLD_FATWA,
  /** CTC/Audit approval required above 100,000 KWD */
  CTC_AUDIT: THRESHOLD_CTC_AUDIT,
} as const;

// =============================================================================
// PAGINATION DEFAULTS
// =============================================================================

export const PAGINATION = {
  /** Default page size for list queries */
  DEFAULT_PAGE_SIZE: 20,
  /** Maximum allowed page size */
  MAX_PAGE_SIZE: 100,
  /** Minimum page number */
  MIN_PAGE: 1,
} as const;

// =============================================================================
// FILE UPLOAD LIMITS
// =============================================================================

export const FILE_LIMITS = {
  /** Maximum file size in bytes (25 MB) */
  MAX_FILE_SIZE: 25 * 1024 * 1024,
  /** Maximum number of files per upload */
  MAX_FILES_PER_UPLOAD: 10,
  /** Maximum base64 string length (approximately 33 MB) */
  MAX_BASE64_LENGTH: 35 * 1024 * 1024,
} as const;

// =============================================================================
// RATE LIMITING
// =============================================================================

export const RATE_LIMITS = {
  /** Upload endpoint: requests per minute */
  UPLOAD_PER_MINUTE: 20,
  /** Sensitive operations: requests per minute */
  SENSITIVE_PER_MINUTE: 30,
  /** General mutations: requests per minute */
  GENERAL_MUTATION_PER_MINUTE: 100,
  /** Login attempts per minute */
  LOGIN_PER_MINUTE: 5,
  /** AI requests per minute */
  AI_PER_MINUTE: 10,
} as const;

// =============================================================================
// SESSION & AUTH
// =============================================================================

export const SESSION = {
  /** Session duration in production (8 hours in ms) */
  DURATION_PROD: 8 * 60 * 60 * 1000,
  /** Session duration in development (24 hours in ms) */
  DURATION_DEV: 24 * 60 * 60 * 1000,
  /** Maximum active sessions per user */
  MAX_SESSIONS_PER_USER: 5,
  /** CSRF token expiration (2 hours in ms) */
  CSRF_TOKEN_EXPIRY: 2 * 60 * 60 * 1000,
} as const;

// =============================================================================
// BUDGET & FINANCE
// =============================================================================

export const BUDGET = {
  /** Warning threshold percentage (90%) */
  WARNING_THRESHOLD: 90,
  /** Critical threshold percentage (100%) */
  CRITICAL_THRESHOLD: 100,
  /** Over-budget alert threshold percentage */
  OVERBUDGET_ALERT_THRESHOLD: 105,
} as const;

// =============================================================================
// INVENTORY
// =============================================================================

export const INVENTORY = {
  /** Default minimum stock level */
  DEFAULT_MIN_STOCK: 10,
  /** Default lead time in days */
  DEFAULT_LEAD_TIME_DAYS: 14,
  /** Low stock warning multiplier */
  LOW_STOCK_MULTIPLIER: 1.5,
} as const;

// =============================================================================
// AI SERVICE
// =============================================================================

export const AI_SERVICE = {
  /** Default forecast period in months */
  DEFAULT_FORECAST_MONTHS: 6,
  /** Maximum forecast period in months */
  MAX_FORECAST_MONTHS: 24,
  /** Maximum products for bulk forecast */
  MAX_BULK_FORECAST_PRODUCTS: 50,
  /** Cache TTL in milliseconds (5 minutes) */
  CACHE_TTL_MS: 5 * 60 * 1000,
  /** Maximum retries for AI requests */
  MAX_RETRIES: 3,
  /** Circuit breaker failure threshold */
  CIRCUIT_BREAKER_THRESHOLD: 3,
  /** Circuit breaker reset time (1 minute in ms) */
  CIRCUIT_BREAKER_RESET_MS: 60 * 1000,
} as const;

// =============================================================================
// DELIVERY
// =============================================================================

export const DELIVERY = {
  /** On-time delivery target percentage */
  ON_TIME_TARGET: 80,
  /** Excellent delivery rate percentage */
  EXCELLENT_RATE: 95,
  /** Days ahead to show upcoming deliveries */
  UPCOMING_DAYS: 7,
  /** Maximum days overdue before critical alert */
  CRITICAL_OVERDUE_DAYS: 14,
} as const;

// =============================================================================
// NOTIFICATIONS
// =============================================================================

export const NOTIFICATIONS = {
  /** High unread count threshold for warnings */
  HIGH_UNREAD_THRESHOLD: 20,
  /** Notification retention days */
  RETENTION_DAYS: 90,
  /** Priority scores */
  PRIORITY_SCORES: {
    urgent: 4,
    high: 3,
    normal: 2,
    low: 1,
  } as const,
} as const;

// =============================================================================
// TENDER
// =============================================================================

export const TENDER = {
  /** Days before deadline for critical warning */
  DEADLINE_CRITICAL_DAYS: 3,
  /** Days before deadline for warning */
  DEADLINE_WARNING_DAYS: 7,
  /** Maximum items in bulk import */
  MAX_BULK_IMPORT: 10,
} as const;

// =============================================================================
// ANALYTICS
// =============================================================================

export const ANALYTICS = {
  /** Months of trend data to show */
  TREND_MONTHS: 6,
  /** Top customers to display */
  TOP_CUSTOMERS_COUNT: 5,
  /** Maximum insights to return */
  MAX_INSIGHTS: 8,
  /** Days for "recent" activity */
  RECENT_ACTIVITY_DAYS: 30,
} as const;

// =============================================================================
// CURRENCY
// =============================================================================

export const CURRENCY = {
  /** Default currency code */
  DEFAULT: "KWD",
  /** Cents/fils per unit */
  SUBUNIT_MULTIPLIER: 100,
} as const;

// =============================================================================
// DOCUMENT EXTRACTION
// =============================================================================

export const OCR = {
  /** Maximum pages to process */
  MAX_PAGES: 10,
  /** Default DPI for OCR */
  DEFAULT_DPI: 300,
  /** Confidence threshold for auto-acceptance */
  CONFIDENCE_THRESHOLD: 0.7,
  /** Maximum text preview length */
  MAX_PREVIEW_LENGTH: 2000,
} as const;

// =============================================================================
// SECURITY
// =============================================================================

export const SECURITY = {
  /** Minimum password length */
  MIN_PASSWORD_LENGTH: 8,
  /** Account lockout base duration (15 minutes in ms) */
  LOCKOUT_BASE_DURATION: 15 * 60 * 1000,
  /** Maximum lockout duration (24 hours in ms) */
  LOCKOUT_MAX_DURATION: 24 * 60 * 60 * 1000,
  /** Failed login attempts before lockout */
  LOCKOUT_THRESHOLD: 5,
  /** Salt length in bytes */
  SALT_LENGTH: 32,
  /** Key length for password hashing */
  KEY_LENGTH: 64,
} as const;

// =============================================================================
// EXPORT CONFIGS
// =============================================================================

export const EXPORT_CONFIGS = {
  tenders: {
    columns: [
      { key: "referenceNumber", label: "Reference #" },
      { key: "title", label: "Title" },
      { key: "status", label: "Status" },
      { key: "estimatedValue", label: "Est. Value", format: "currency" as const },
      { key: "submissionDeadline", label: "Deadline", format: "date" as const },
      { key: "createdAt", label: "Created", format: "date" as const },
    ],
  },
  budgets: {
    columns: [
      { key: "name", label: "Budget Name" },
      { key: "allocatedAmount", label: "Allocated", format: "currency" as const },
      { key: "spentAmount", label: "Spent", format: "currency" as const },
      { key: "remaining", label: "Remaining", format: "currency" as const },
      { key: "status", label: "Status" },
    ],
  },
  expenses: {
    columns: [
      { key: "expenseNumber", label: "Expense #" },
      { key: "title", label: "Title" },
      { key: "amount", label: "Amount", format: "currency" as const },
      { key: "status", label: "Status" },
      { key: "expenseDate", label: "Date", format: "date" as const },
    ],
  },
  inventory: {
    columns: [
      { key: "productName", label: "Product" },
      { key: "sku", label: "SKU" },
      { key: "quantity", label: "Quantity", format: "number" as const },
      { key: "minStockLevel", label: "Min Stock", format: "number" as const },
      { key: "location", label: "Location" },
    ],
  },
  invoices: {
    columns: [
      { key: "invoiceNumber", label: "Invoice #" },
      { key: "customerName", label: "Customer" },
      { key: "totalAmount", label: "Total", format: "currency" as const },
      { key: "status", label: "Status" },
      { key: "dueDate", label: "Due Date", format: "date" as const },
    ],
  },
  suppliers: {
    columns: [
      { key: "name", label: "Supplier Name" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "status", label: "Status" },
      { key: "performanceScore", label: "Score", format: "number" as const },
    ],
  },
  customers: {
    columns: [
      { key: "name", label: "Customer Name" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "status", label: "Status" },
    ],
  },
} as const;
