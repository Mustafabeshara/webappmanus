import {
  boolean,
  date,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow with role-based access control
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  passwordHash: varchar("passwordHash", { length: 255 }),
  passwordSalt: varchar("passwordSalt", { length: 255 }),
  failedLoginAttempts: int("failedLoginAttempts").default(0).notNull(),
  lastFailedLoginAt: timestamp("lastFailedLoginAt"),
  lockedUntil: timestamp("lockedUntil"),
  lastLoginAt: timestamp("lastLoginAt"),
  passwordChangedAt: timestamp("passwordChangedAt"),
  requirePasswordChange: boolean("requirePasswordChange")
    .default(false)
    .notNull(),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

/**
 * User permissions and view restrictions configured by admin
 */
export const userPermissions = mysqlTable("user_permissions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  module: varchar("module", { length: 100 }).notNull(), // tender, budget, inventory, etc.
  canView: boolean("canView").default(true).notNull(),
  canCreate: boolean("canCreate").default(false).notNull(),
  canEdit: boolean("canEdit").default(false).notNull(),
  canDelete: boolean("canDelete").default(false).notNull(),
  canApprove: boolean("canApprove").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Departments for organizational structure
 */
export const departments = mysqlTable("departments", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  description: text("description"),
  managerId: int("managerId"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Hierarchical budget categories
 */
export const budgetCategories = mysqlTable("budget_categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  parentId: int("parentId"), // for hierarchical nesting
  description: text("description"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Budgets with department allocations
 */
export const budgets = mysqlTable("budgets", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  categoryId: int("categoryId").notNull(),
  departmentId: int("departmentId"),
  fiscalYear: int("fiscalYear").notNull(),
  allocatedAmount: int("allocatedAmount").notNull(), // in cents
  spentAmount: int("spentAmount").default(0).notNull(), // in cents
  status: mysqlEnum("status", ["draft", "active", "closed"])
    .default("draft")
    .notNull(),
  approvalStatus: mysqlEnum("approvalStatus", [
    "pending",
    "approved",
    "rejected",
  ])
    .default("pending")
    .notNull(),
  approvedBy: int("approvedBy"),
  approvedAt: timestamp("approvedAt"),
  notes: text("notes"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Annual requirements requests (hospital/department) feeding the tender process
 */
export const requirementsRequests = mysqlTable("requirements_requests", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 64 }),
  hospital: varchar("hospital", { length: 255 }).notNull(),
  specialty: varchar("specialty", { length: 255 }).notNull(),
  departmentId: int("departmentId"),
  fiscalYear: int("fiscalYear").notNull(), // April-March fiscal year start
  totalValue: int("totalValue").default(0).notNull(), // cents
  approvalGate: mysqlEnum("approvalGate", ["committee", "fatwa", "ctc_audit"])
    .default("committee")
    .notNull(),
  status: mysqlEnum("status", [
    "draft",
    "department_review",
    "committee_pending",
    "committee_approved",
    "submitted_to_cms",
    "budget_allocated",
    "tender_posted",
    "award_pending",
    "award_approved",
    "discount_requested",
    "contract_issued",
    "closed",
    "rejected",
  ])
    .default("draft")
    .notNull(),
  notes: text("notes"),
  submittedAt: timestamp("submittedAt"),
  cmsCaseId: int("cmsCaseId"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Line items inside a requirements request
 */
export const requirementItems = mysqlTable("requirement_items", {
  id: int("id").autoincrement().primaryKey(),
  requestId: int("requestId").notNull(),
  description: text("description").notNull(),
  quantity: int("quantity").default(1).notNull(),
  unit: varchar("unit", { length: 50 }).default("unit").notNull(),
  estimatedUnitPrice: int("estimatedUnitPrice").default(0).notNull(), // cents
  category: varchar("category", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * Committee and higher-level approvals tied to a requirements request
 */
export const committeeApprovals = mysqlTable("committee_approvals", {
  id: int("id").autoincrement().primaryKey(),
  requestId: int("requestId").notNull(),
  role: mysqlEnum("role", [
    "head_of_department",
    "committee_head",
    "specialty_head",
    "fatwa",
    "ctc",
    "audit",
  ]).notNull(),
  decision: mysqlEnum("decision", ["pending", "approved", "rejected"])
    .default("pending")
    .notNull(),
  note: text("note"),
  approverId: int("approverId"),
  approverName: varchar("approverName", { length: 255 }),
  decidedAt: timestamp("decidedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * CMS case tracking for submitted requests
 */
export const cmsCases = mysqlTable("cms_cases", {
  id: int("id").autoincrement().primaryKey(),
  requestId: int("requestId").notNull(),
  caseNumber: varchar("caseNumber", { length: 100 }),
  status: mysqlEnum("status", [
    "with_cms",
    "discount_requested",
    "awaiting_ctc",
    "awaiting_fatwa",
    "awaiting_audit",
    "contract_issued",
    "closed",
  ])
    .default("with_cms")
    .notNull(),
  cmsContact: varchar("cmsContact", { length: 255 }),
  nextFollowupDate: timestamp("nextFollowupDate"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Follow-up log entries while the case is with CMS
 */
export const cmsFollowups = mysqlTable("cms_followups", {
  id: int("id").autoincrement().primaryKey(),
  requestId: int("requestId").notNull(),
  note: text("note"),
  contact: varchar("contact", { length: 255 }),
  followupDate: timestamp("followupDate").defaultNow().notNull(),
  nextActionDate: timestamp("nextActionDate"),
  createdBy: int("createdBy"),
});

/**
 * Suppliers and manufacturers
 */
export const suppliers = mysqlTable("suppliers", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(), // auto-generated
  name: varchar("name", { length: 255 }).notNull(),
  contactPerson: varchar("contactPerson", { length: 255 }),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 50 }),
  address: text("address"),
  taxId: varchar("taxId", { length: 100 }),
  complianceStatus: mysqlEnum("complianceStatus", [
    "compliant",
    "pending",
    "non_compliant",
  ])
    .default("pending")
    .notNull(),
  rating: int("rating"), // 1-5
  notes: text("notes"),
  isActive: boolean("isActive").default(true).notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Customers and hospitals
 */
export const customers = mysqlTable("customers", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  type: mysqlEnum("type", ["hospital", "clinic", "pharmacy", "other"])
    .default("other")
    .notNull(),
  contactPerson: varchar("contactPerson", { length: 255 }),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 50 }),
  address: text("address"),
  taxId: varchar("taxId", { length: 100 }),
  creditLimit: int("creditLimit"), // in cents
  notes: text("notes"),
  isActive: boolean("isActive").default(true).notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Customer communication history
 */
export const customerCommunications = mysqlTable("customer_communications", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customerId").notNull(),
  type: mysqlEnum("type", ["email", "phone", "meeting", "note"]).notNull(),
  subject: varchar("subject", { length: 255 }),
  content: text("content"),
  contactedBy: int("contactedBy").notNull(),
  contactedAt: timestamp("contactedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * Products catalog
 */
export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  sku: varchar("sku", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }),
  manufacturerId: int("manufacturerId"),
  unitPrice: int("unitPrice"), // in cents
  unit: varchar("unit", { length: 50 }), // piece, box, kg, etc.
  specifications: text("specifications"),
  isActive: boolean("isActive").default(true).notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Inventory tracking
 */
export const inventory = mysqlTable("inventory", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull(),
  quantity: int("quantity").default(0).notNull(),
  batchNumber: varchar("batchNumber", { length: 100 }),
  expiryDate: timestamp("expiryDate"),
  location: varchar("location", { length: 255 }),
  minStockLevel: int("minStockLevel").default(0).notNull(),
  maxStockLevel: int("maxStockLevel"),
  lastRestocked: timestamp("lastRestocked"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Product sales history for forecasting
 */
export const productSales = mysqlTable("product_sales", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull(),
  quantity: int("quantity").notNull(),
  unitPrice: int("unitPrice").notNull(), // in cents at time of sale
  totalAmount: int("totalAmount").notNull(), // in cents
  saleDate: timestamp("saleDate").notNull(),
  channel: varchar("channel", { length: 50 }), // tender, direct, contract, other
  tenderId: int("tenderId"),
  invoiceId: int("invoiceId"),
  customerId: int("customerId"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * Product forecasts (cached predictions)
 */
export const productForecasts = mysqlTable("product_forecasts", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull(),
  forecastDate: timestamp("forecastDate").notNull(), // when forecast was generated
  forecastPeriod: varchar("forecastPeriod", { length: 20 }).notNull(), // e.g., "2024-01"
  predictedQuantity: int("predictedQuantity").notNull(),
  predictedRevenue: int("predictedRevenue").notNull(), // in cents
  confidence: int("confidence").notNull(), // 0-100
  trend: varchar("trend", { length: 20 }), // increasing, decreasing, stable, seasonal
  factors: text("factors"), // JSON array of factors
  actualQuantity: int("actualQuantity"), // filled in after period ends
  actualRevenue: int("actualRevenue"), // filled in after period ends
  accuracy: int("accuracy"), // calculated after actual data available
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * Tender templates for reusable blueprints
 */
export const tenderTemplates = mysqlTable("tender_templates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  categoryId: int("categoryId"),
  departmentId: int("departmentId"),
  defaultRequirements: text("defaultRequirements"),
  defaultTerms: text("defaultTerms"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Template items (products/services in template)
 */
export const templateItems = mysqlTable("template_items", {
  id: int("id").autoincrement().primaryKey(),
  templateId: int("templateId").notNull(),
  productId: int("productId"),
  description: text("description"),
  quantity: int("quantity"),
  unit: varchar("unit", { length: 50 }),
  estimatedPrice: int("estimatedPrice"), // in cents
  specifications: text("specifications"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * Tenders
 */
export const tenders = mysqlTable("tenders", {
  id: int("id").autoincrement().primaryKey(),
  referenceNumber: varchar("referenceNumber", { length: 100 })
    .notNull()
    .unique(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  customerId: int("customerId"),
  departmentId: int("departmentId"),
  categoryId: int("categoryId"),
  templateId: int("templateId"), // if created from template
  status: mysqlEnum("status", [
    "draft",
    "open",
    "awarded",
    "closed",
    "archived",
  ])
    .default("draft")
    .notNull(),
  publishDate: timestamp("publishDate"),
  submissionDeadline: timestamp("submissionDeadline"),
  evaluationDeadline: timestamp("evaluationDeadline"),
  requirements: text("requirements"),
  terms: text("terms"),
  estimatedValue: int("estimatedValue"), // in cents
  awardedValue: int("awardedValue"), // in cents
  awardedSupplierId: int("awardedSupplierId"),
  awardedAt: timestamp("awardedAt"),
  notes: text("notes"),
  isParticipating: boolean("isParticipating").default(false).notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Tender items (products/services in tender)
 */
export const tenderItems = mysqlTable("tender_items", {
  id: int("id").autoincrement().primaryKey(),
  tenderId: int("tenderId").notNull(),
  productId: int("productId"),
  description: text("description").notNull(),
  quantity: int("quantity").notNull(),
  unit: varchar("unit", { length: 50 }),
  specifications: text("specifications"),
  estimatedPrice: int("estimatedPrice"), // in cents
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Tender participants (suppliers bidding)
 */
export const tenderParticipants = mysqlTable("tender_participants", {
  id: int("id").autoincrement().primaryKey(),
  tenderId: int("tenderId").notNull(),
  supplierId: int("supplierId").notNull(),
  submissionDate: timestamp("submissionDate"),
  totalBidAmount: int("totalBidAmount"), // in cents
  status: mysqlEnum("status", [
    "submitted",
    "under_review",
    "accepted",
    "rejected",
    "withdrawn",
  ])
    .default("submitted")
    .notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Participant bid items (line items with prices)
 */
export const participantBidItems = mysqlTable("participant_bid_items", {
  id: int("id").autoincrement().primaryKey(),
  participantId: int("participantId").notNull(),
  tenderItemId: int("tenderItemId").notNull(),
  unitPrice: int("unitPrice").notNull(), // in cents
  totalPrice: int("totalPrice").notNull(), // in cents
  deliveryTime: varchar("deliveryTime", { length: 100 }),
  notes: text("notes"),
  // Compliance flags
  isCompliant: boolean("isCompliant").default(true).notNull(),
  complianceIssues: text("complianceIssues"), // JSON array of issues
  priceCompliant: boolean("priceCompliant").default(true).notNull(),
  deadlineCompliant: boolean("deadlineCompliant").default(true).notNull(),
  documentsCompliant: boolean("documentsCompliant").default(true).notNull(),
  specsCompliant: boolean("specsCompliant").default(true).notNull(),
  supplierCompliant: boolean("supplierCompliant").default(true).notNull(),
  quantityCompliant: boolean("quantityCompliant").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Invoices
 */
export const invoices = mysqlTable("invoices", {
  id: int("id").autoincrement().primaryKey(),
  invoiceNumber: varchar("invoiceNumber", { length: 100 }).notNull().unique(),
  customerId: int("customerId").notNull(),
  tenderId: int("tenderId"),
  issueDate: timestamp("issueDate").defaultNow().notNull(),
  dueDate: timestamp("dueDate").notNull(),
  subtotal: int("subtotal").notNull(), // in cents
  taxAmount: int("taxAmount").default(0).notNull(), // in cents
  totalAmount: int("totalAmount").notNull(), // in cents
  paidAmount: int("paidAmount").default(0).notNull(), // in cents
  status: mysqlEnum("status", ["draft", "sent", "paid", "overdue", "cancelled"])
    .default("draft")
    .notNull(),
  paymentTerms: text("paymentTerms"),
  notes: text("notes"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Invoice line items
 */
export const invoiceItems = mysqlTable("invoice_items", {
  id: int("id").autoincrement().primaryKey(),
  invoiceId: int("invoiceId").notNull(),
  productId: int("productId"),
  description: text("description").notNull(),
  quantity: int("quantity").notNull(),
  unitPrice: int("unitPrice").notNull(), // in cents
  totalPrice: int("totalPrice").notNull(), // in cents
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * Expenses
 */
export const expenses = mysqlTable("expenses", {
  id: int("id").autoincrement().primaryKey(),
  expenseNumber: varchar("expenseNumber", { length: 100 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  categoryId: int("categoryId").notNull(),
  budgetId: int("budgetId"),
  departmentId: int("departmentId"),
  tenderId: int("tenderId"),
  amount: int("amount").notNull(), // in cents
  expenseDate: timestamp("expenseDate").defaultNow().notNull(),
  status: mysqlEnum("status", [
    "draft",
    "pending",
    "approved",
    "rejected",
    "paid",
  ])
    .default("draft")
    .notNull(),
  approvalLevel: int("approvalLevel").default(0).notNull(),
  approvedBy: int("approvedBy"),
  approvedAt: timestamp("approvedAt"),
  rejectionReason: text("rejectionReason"),
  receiptUrl: text("receiptUrl"), // S3 URL for receipt image
  notes: text("notes"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Deliveries
 */
export const deliveries = mysqlTable("deliveries", {
  id: int("id").autoincrement().primaryKey(),
  deliveryNumber: varchar("deliveryNumber", { length: 100 }).notNull().unique(),
  customerId: int("customerId").notNull(),
  tenderId: int("tenderId"),
  invoiceId: int("invoiceId"),
  scheduledDate: timestamp("scheduledDate").notNull(),
  deliveredDate: timestamp("deliveredDate"),
  status: mysqlEnum("status", [
    "planned",
    "in_transit",
    "delivered",
    "cancelled",
  ])
    .default("planned")
    .notNull(),
  deliveryAddress: text("deliveryAddress"),
  driverName: varchar("driverName", { length: 255 }),
  vehicleNumber: varchar("vehicleNumber", { length: 100 }),
  notes: text("notes"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Delivery items
 */
export const deliveryItems = mysqlTable("delivery_items", {
  id: int("id").autoincrement().primaryKey(),
  deliveryId: int("deliveryId").notNull(),
  productId: int("productId").notNull(),
  quantity: int("quantity").notNull(),
  batchNumber: varchar("batchNumber", { length: 100 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * Document folders for organizing documents by category
 */
export const documentFolders = mysqlTable("document_folders", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(), // tender, partner, product, etc.
  parentId: int("parentId"), // for nested folders
  requiredDocuments: text("requiredDocuments"), // JSON array of required doc types
  reminderEnabled: boolean("reminderEnabled").default(false).notNull(),
  lastReminderSent: timestamp("lastReminderSent"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Documents attached to various entities
 */
export const documents = mysqlTable("documents", {
  id: int("id").autoincrement().primaryKey(),
  folderId: int("folderId"),
  entityType: varchar("entityType", { length: 50 }).notNull(), // tender, invoice, expense, supplier, etc.
  entityId: int("entityId").notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(), // S3 key
  fileUrl: varchar("fileUrl", { length: 1000 }).notNull(),
  fileSize: int("fileSize"),
  mimeType: varchar("mimeType", { length: 100 }),
  documentType: varchar("documentType", { length: 100 }), // contract, specification, receipt, etc.
  version: int("version").default(1).notNull(),
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed"])
    .default("pending")
    .notNull(),
  extractionStatus: mysqlEnum("extractionStatus", [
    "not_started",
    "processing",
    "completed",
    "failed",
    "reviewed",
  ])
    .default("not_started")
    .notNull(),
  isDeleted: boolean("isDeleted").default(false).notNull(),
  deletedAt: timestamp("deletedAt"),
  uploadedBy: int("uploadedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * AI extraction results from documents
 */
export const extractionResults = mysqlTable("extraction_results", {
  id: int("id").autoincrement().primaryKey(),
  documentId: int("documentId").notNull(),
  extractedData: text("extractedData").notNull(), // JSON with extracted fields
  confidenceScores: text("confidenceScores"), // JSON with field-level confidence
  provider: varchar("provider", { length: 50 }), // groq, gemini, anthropic
  ocrProvider: varchar("ocrProvider", { length: 50 }),
  validationErrors: text("validationErrors"), // JSON array of validation issues
  reviewedBy: int("reviewedBy"),
  reviewedAt: timestamp("reviewedAt"),
  corrections: text("corrections"), // JSON with user corrections
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Forecasting and analytics data
 */
export const forecasts = mysqlTable("forecasts", {
  id: int("id").autoincrement().primaryKey(),
  type: varchar("type", { length: 50 }).notNull(), // demand, revenue, expense, etc.
  entityType: varchar("entityType", { length: 50 }), // product, customer, department
  entityId: int("entityId"),
  period: varchar("period", { length: 50 }).notNull(), // monthly, quarterly, yearly
  forecastDate: timestamp("forecastDate").notNull(),
  predictedValue: int("predictedValue").notNull(),
  actualValue: int("actualValue"),
  confidence: int("confidence"), // 0-100
  model: varchar("model", { length: 100 }),
  parameters: text("parameters"), // JSON
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Anomaly detection results
 */
export const anomalies = mysqlTable("anomalies", {
  id: int("id").autoincrement().primaryKey(),
  type: varchar("type", { length: 50 }).notNull(), // expense_outlier, trend_shift, missed_deadline
  entityType: varchar("entityType", { length: 50 }).notNull(),
  entityId: int("entityId").notNull(),
  severity: mysqlEnum("severity", ["low", "medium", "high", "critical"])
    .default("medium")
    .notNull(),
  description: text("description").notNull(),
  aiExplanation: text("aiExplanation"),
  detectedAt: timestamp("detectedAt").defaultNow().notNull(),
  status: mysqlEnum("status", [
    "new",
    "acknowledged",
    "investigating",
    "resolved",
    "false_positive",
  ])
    .default("new")
    .notNull(),
  resolvedBy: int("resolvedBy"),
  resolvedAt: timestamp("resolvedAt"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Notifications sent to users
 */
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: varchar("type", { length: 50 }).notNull(), // budget_alert, deadline, approval_request, etc.
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  entityType: varchar("entityType", { length: 50 }),
  entityId: int("entityId"),
  priority: mysqlEnum("priority", ["low", "normal", "high", "urgent"])
    .default("normal")
    .notNull(),
  isRead: boolean("isRead").default(false).notNull(),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * Audit logs for compliance and traceability
 */
export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  action: varchar("action", { length: 50 }).notNull(), // create, update, delete, approve, etc.
  entityType: varchar("entityType", { length: 50 }).notNull(),
  entityId: int("entityId").notNull(),
  changes: text("changes"), // JSON with before/after values
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * System settings and configuration
 */
export const settings = mysqlTable("settings", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value").notNull(),
  category: varchar("category", { length: 50 }).notNull(), // ai, notifications, approval, etc.
  description: text("description"),
  updatedBy: int("updatedBy"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * Purchase Orders for tracking supplier orders
 */
export const purchaseOrders = mysqlTable("purchase_orders", {
  id: int("id").autoincrement().primaryKey(),
  poNumber: varchar("poNumber", { length: 50 }).notNull().unique(),
  supplierId: int("supplierId").notNull(),
  departmentId: int("departmentId"),
  status: mysqlEnum("status", [
    "draft",
    "pending",
    "approved",
    "ordered",
    "partially_received",
    "received",
    "cancelled",
  ])
    .default("draft")
    .notNull(),
  orderDate: date("orderDate").notNull(),
  expectedDeliveryDate: date("expectedDeliveryDate"),
  actualDeliveryDate: date("actualDeliveryDate"),
  totalAmount: int("totalAmount").notNull(), // in cents
  taxAmount: int("taxAmount").default(0).notNull(),
  shippingCost: int("shippingCost").default(0).notNull(),
  notes: text("notes"),
  approvedBy: int("approvedBy"),
  approvedAt: timestamp("approvedAt"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Purchase Order line items
 */
export const purchaseOrderItems = mysqlTable("purchase_order_items", {
  id: int("id").autoincrement().primaryKey(),
  purchaseOrderId: int("purchaseOrderId").notNull(),
  productId: int("productId"),
  description: varchar("description", { length: 500 }).notNull(),
  quantity: int("quantity").notNull(),
  unitPrice: int("unitPrice").notNull(), // in cents
  totalPrice: int("totalPrice").notNull(), // in cents
  receivedQuantity: int("receivedQuantity").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * Tasks for project and work management
 */
export const tasks = mysqlTable("tasks", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: mysqlEnum("status", [
    "todo",
    "in_progress",
    "review",
    "completed",
    "cancelled",
  ])
    .default("todo")
    .notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high", "urgent"])
    .default("medium")
    .notNull(),
  assignedTo: int("assignedTo"),
  departmentId: int("departmentId"),
  relatedEntityType: varchar("relatedEntityType", { length: 50 }), // tender, expense, delivery, etc.
  relatedEntityId: int("relatedEntityId"),
  dueDate: date("dueDate"),
  completedAt: timestamp("completedAt"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Universal file storage table for all modules
 */
export const files = mysqlTable("files", {
  id: int("id").autoincrement().primaryKey(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(), // S3 key
  fileUrl: varchar("fileUrl", { length: 1000 }).notNull(), // S3 URL
  fileSize: int("fileSize").notNull(), // in bytes
  mimeType: varchar("mimeType", { length: 100 }).notNull(),
  entityType: varchar("entityType", { length: 50 }).notNull(), // expenses, tenders, deliveries, etc.
  entityId: int("entityId").notNull(),
  category: varchar("category", { length: 100 }), // registration, catalog, submission for tenders
  uploadedBy: int("uploadedBy").notNull(),
  // Versioning fields
  version: int("version").default(1).notNull(), // Version number (1, 2, 3, ...)
  parentFileId: int("parentFileId"), // ID of the original file (null for first version)
  isCurrent: boolean("isCurrent").default(true).notNull(), // Only one version should be current
  replacedAt: timestamp("replacedAt"), // When this version was replaced by a newer one
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  uploadedAt: timestamp("uploadedAt").defaultNow().notNull(), // Alias for clarity in version history
});

/**
 * Opportunities (pipeline) for forecasting
 */
export const opportunities = mysqlTable("opportunities", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customerId"),
  name: varchar("name", { length: 255 }).notNull(),
  amount: int("amount").default(0).notNull(), // cents
  probability: int("probability").default(50).notNull(), // percent
  stage: mysqlEnum("stage", [
    "prospect",
    "proposal",
    "negotiation",
    "verbal",
    "won",
    "lost",
  ])
    .default("prospect")
    .notNull(),
  expectedCloseDate: date("expectedCloseDate"),
  ownerId: int("ownerId"),
  status: mysqlEnum("status", ["open", "closed"]).default("open").notNull(),
  notes: text("notes"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Commission configuration and entries
 */
export const commissionRules = mysqlTable("commission_rules", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  scopeType: mysqlEnum("scopeType", ["all", "product", "category"])
    .default("all")
    .notNull(),
  productId: int("productId"),
  category: varchar("category", { length: 255 }),
  rateBps: int("rateBps").default(0).notNull(), // basis points (1/100 of a percent)
  minMarginBps: int("minMarginBps").default(0),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const commissionAssignments = mysqlTable("commission_assignments", {
  id: int("id").autoincrement().primaryKey(),
  ruleId: int("ruleId").notNull(),
  userId: int("userId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const commissionEntries = mysqlTable("commission_entries", {
  id: int("id").autoincrement().primaryKey(),
  invoiceId: int("invoiceId"),
  amount: int("amount").default(0).notNull(), // invoice amount cents
  commissionAmount: int("commissionAmount").default(0).notNull(), // cents
  userId: int("userId").notNull(),
  ruleId: int("ruleId"),
  status: mysqlEnum("status", ["pending", "approved", "paid"])
    .default("pending")
    .notNull(),
  periodStart: date("periodStart"),
  periodEnd: date("periodEnd"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * HR - employees and leave
 */
export const employees = mysqlTable("employees", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  firstName: varchar("firstName", { length: 255 }),
  lastName: varchar("lastName", { length: 255 }),
  title: varchar("title", { length: 255 }),
  departmentId: int("departmentId"),
  managerId: int("managerId"),
  hireDate: date("hireDate"),
  status: mysqlEnum("status", ["active", "on_leave", "terminated"])
    .default("active")
    .notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 50 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const leaveRequests = mysqlTable("leave_requests", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").notNull(),
  type: mysqlEnum("type", ["vacation", "sick", "personal", "unpaid"])
    .default("vacation")
    .notNull(),
  startDate: date("startDate").notNull(),
  endDate: date("endDate").notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected"])
    .default("pending")
    .notNull(),
  reason: text("reason"),
  approverId: int("approverId"),
  decidedAt: timestamp("decidedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * Security Enhancement Tables
 */

/**
 * Sessions for secure session management
 */
export const sessions = mysqlTable("sessions", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: varchar("sessionId", { length: 64 }).notNull().unique(),
  userId: int("userId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  lastAccessedAt: timestamp("lastAccessedAt")
    .defaultNow()
    .onUpdateNow()
    .notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  ipAddress: varchar("ipAddress", { length: 45 }).notNull(),
  userAgent: text("userAgent"),
  isActive: boolean("isActive").default(true).notNull(),
});

/**
 * Security events for threat detection and monitoring
 */
export const securityEvents = mysqlTable("security_events", {
  id: int("id").autoincrement().primaryKey(),
  type: mysqlEnum("type", [
    "sql_injection_attempt",
    "xss_attempt",
    "invalid_file_upload",
    "rate_limit_exceeded",
    "unauthorized_access",
    "suspicious_activity",
    "csrf_violation",
    "session_hijack_attempt",
  ]).notNull(),
  severity: mysqlEnum("severity", [
    "low",
    "medium",
    "high",
    "critical",
  ]).notNull(),
  description: text("description").notNull(),
  details: json("details"),
  userId: int("userId"),
  ipAddress: varchar("ipAddress", { length: 45 }).notNull(),
  userAgent: text("userAgent"),
  endpoint: varchar("endpoint", { length: 255 }),
  input: text("input"),
  resolved: boolean("resolved").default(false).notNull(),
  resolvedBy: int("resolvedBy"),
  resolvedAt: timestamp("resolvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * Password history to prevent password reuse
 */
export const passwordHistory = mysqlTable("password_history", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * Rate limit violations for tracking rate limiting
 */
export const rateLimitViolations = mysqlTable("rate_limit_violations", {
  id: int("id").autoincrement().primaryKey(),
  identifier: varchar("identifier", { length: 100 }).notNull(),
  endpoint: varchar("endpoint", { length: 255 }).notNull(),
  violationCount: int("violationCount").default(1).notNull(),
  windowStart: timestamp("windowStart").notNull(),
  windowEnd: timestamp("windowEnd").notNull(),
  blocked: boolean("blocked").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Enhanced file uploads with security scanning
 */
export const fileUploads = mysqlTable("file_uploads", {
  id: int("id").autoincrement().primaryKey(),
  originalName: varchar("originalName", { length: 255 }).notNull(),
  storedName: varchar("storedName", { length: 255 }).notNull(),
  mimeType: varchar("mimeType", { length: 100 }).notNull(),
  fileSize: int("fileSize").notNull(),
  uploadedBy: int("uploadedBy").notNull(),
  entityType: varchar("entityType", { length: 50 }).notNull(),
  entityId: int("entityId").notNull(),
  category: varchar("category", { length: 100 }),
  scanStatus: mysqlEnum("scanStatus", ["pending", "clean", "infected", "error"])
    .default("pending")
    .notNull(),
  scanResult: text("scanResult"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// =============================================================================
// SUPPLIER PRICING AND CATALOG TABLES
// =============================================================================

/**
 * Supplier-specific pricing for products
 */
export const supplierPrices = mysqlTable("supplier_prices", {
  id: int("id").autoincrement().primaryKey(),
  supplierId: int("supplierId").notNull(),
  productId: int("productId").notNull(),
  price: int("price").notNull(), // in cents
  currency: varchar("currency", { length: 3 }).default("SAR").notNull(),
  minOrderQuantity: int("minOrderQuantity").default(1),
  leadTimeDays: int("leadTimeDays"),
  validFrom: date("validFrom").notNull(),
  validTo: date("validTo"),
  isPreferred: boolean("isPreferred").default(false).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Price history for audit trail and analytics
 */
export const priceHistory = mysqlTable("price_history", {
  id: int("id").autoincrement().primaryKey(),
  supplierPriceId: int("supplierPriceId").notNull(),
  supplierId: int("supplierId").notNull(),
  productId: int("productId").notNull(),
  oldPrice: int("oldPrice").notNull(), // in cents
  newPrice: int("newPrice").notNull(), // in cents
  changeReason: varchar("changeReason", { length: 255 }),
  changedBy: int("changedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * Product specifications (technical details, compliance info)
 */
export const productSpecifications = mysqlTable("product_specifications", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull(),
  specKey: varchar("specKey", { length: 100 }).notNull(), // e.g., "dimensions", "weight", "certifications"
  specValue: text("specValue").notNull(),
  unit: varchar("unit", { length: 50 }), // e.g., "cm", "kg", "units"
  displayOrder: int("displayOrder").default(0),
  isPublic: boolean("isPublic").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// =============================================================================
// WORKFLOW AND TASK MANAGEMENT TABLES
// =============================================================================

/**
 * Workflow templates for automation
 */
export const workflowTemplates = mysqlTable("workflow_templates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  triggerType: varchar("triggerType", { length: 50 }).notNull(), // manual, document_upload, deadline, etc.
  entityType: varchar("entityType", { length: 50 }), // tender, invoice, delivery, etc.
  isActive: boolean("isActive").default(true).notNull(),
  config: text("config"), // JSON configuration for the workflow
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Steps within a workflow template
 */
export const workflowSteps = mysqlTable("workflow_steps", {
  id: int("id").autoincrement().primaryKey(),
  templateId: int("templateId").notNull(),
  stepNumber: int("stepNumber").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  assigneeRole: varchar("assigneeRole", { length: 100 }), // role or user ID
  assigneeUserId: int("assigneeUserId"),
  dueDaysFromStart: int("dueDaysFromStart"), // days from workflow start
  dueDaysFromPrevious: int("dueDaysFromPrevious"), // days from previous step
  requiresApproval: boolean("requiresApproval").default(false).notNull(),
  autoProgressCondition: text("autoProgressCondition"), // JSON condition for auto-progress
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * Running workflow instances
 */
export const workflowInstances = mysqlTable("workflow_instances", {
  id: int("id").autoincrement().primaryKey(),
  templateId: int("templateId").notNull(),
  entityType: varchar("entityType", { length: 50 }).notNull(),
  entityId: int("entityId").notNull(),
  currentStepId: int("currentStepId"),
  status: mysqlEnum("status", ["active", "paused", "completed", "cancelled"])
    .default("active")
    .notNull(),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
  context: text("context"), // JSON context data
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Task dependencies for complex workflows
 */
export const taskDependencies = mysqlTable("task_dependencies", {
  id: int("id").autoincrement().primaryKey(),
  taskId: int("taskId").notNull(),
  dependsOnTaskId: int("dependsOnTaskId").notNull(),
  dependencyType: mysqlEnum("dependencyType", ["blocks", "requires"])
    .default("blocks")
    .notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * Task escalations for overdue items
 */
export const taskEscalations = mysqlTable("task_escalations", {
  id: int("id").autoincrement().primaryKey(),
  taskId: int("taskId").notNull(),
  escalationLevel: int("escalationLevel").default(1).notNull(),
  escalatedTo: int("escalatedTo").notNull(), // user ID
  escalatedFrom: int("escalatedFrom"), // original assignee
  reason: varchar("reason", { length: 255 }).notNull(),
  dueDate: date("dueDate"),
  resolvedAt: timestamp("resolvedAt"),
  resolvedBy: int("resolvedBy"),
  resolution: text("resolution"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type UserPermission = typeof userPermissions.$inferSelect;
export type Department = typeof departments.$inferSelect;
export type BudgetCategory = typeof budgetCategories.$inferSelect;
export type Budget = typeof budgets.$inferSelect;
export type Supplier = typeof suppliers.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Inventory = typeof inventory.$inferSelect;
export type ProductSale = typeof productSales.$inferSelect;
export type ProductForecast = typeof productForecasts.$inferSelect;
export type TenderTemplate = typeof tenderTemplates.$inferSelect;
export type Tender = typeof tenders.$inferSelect;
export type TenderItem = typeof tenderItems.$inferSelect;
export type TenderParticipant = typeof tenderParticipants.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type SecurityEvent = typeof securityEvents.$inferSelect;
export type PasswordHistory = typeof passwordHistory.$inferSelect;
export type RateLimitViolation = typeof rateLimitViolations.$inferSelect;
export type FileUpload = typeof fileUploads.$inferSelect;
export type Delivery = typeof deliveries.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type ExtractionResult = typeof extractionResults.$inferSelect;
export type Forecast = typeof forecasts.$inferSelect;
export type Anomaly = typeof anomalies.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type File = typeof files.$inferSelect;
export type InsertFile = typeof files.$inferInsert;
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type InsertPurchaseOrder = typeof purchaseOrders.$inferInsert;
export type PurchaseOrderItem = typeof purchaseOrderItems.$inferSelect;
export type InsertPurchaseOrderItem = typeof purchaseOrderItems.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;
export type Opportunity = typeof opportunities.$inferSelect;
export type CommissionRule = typeof commissionRules.$inferSelect;
export type CommissionAssignment = typeof commissionAssignments.$inferSelect;
export type CommissionEntry = typeof commissionEntries.$inferSelect;
export type Employee = typeof employees.$inferSelect;
export type LeaveRequest = typeof leaveRequests.$inferSelect;

// New table types
export type SupplierPrice = typeof supplierPrices.$inferSelect;
export type InsertSupplierPrice = typeof supplierPrices.$inferInsert;
export type PriceHistoryEntry = typeof priceHistory.$inferSelect;
export type InsertPriceHistory = typeof priceHistory.$inferInsert;
export type ProductSpecification = typeof productSpecifications.$inferSelect;
export type InsertProductSpecification = typeof productSpecifications.$inferInsert;
export type WorkflowTemplate = typeof workflowTemplates.$inferSelect;
export type InsertWorkflowTemplate = typeof workflowTemplates.$inferInsert;
export type WorkflowStep = typeof workflowSteps.$inferSelect;
export type InsertWorkflowStep = typeof workflowSteps.$inferInsert;
export type WorkflowInstance = typeof workflowInstances.$inferSelect;
export type InsertWorkflowInstance = typeof workflowInstances.$inferInsert;
export type TaskDependency = typeof taskDependencies.$inferSelect;
export type InsertTaskDependency = typeof taskDependencies.$inferInsert;
export type TaskEscalation = typeof taskEscalations.$inferSelect;
export type InsertTaskEscalation = typeof taskEscalations.$inferInsert;
export type InsertSecurityEvent = typeof securityEvents.$inferInsert;
