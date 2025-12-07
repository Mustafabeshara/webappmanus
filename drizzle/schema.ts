import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, decimal } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

/**
 * Core user table backing auth flow with role-based access control
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
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
  status: mysqlEnum("status", ["draft", "active", "closed"]).default("draft").notNull(),
  approvalStatus: mysqlEnum("approvalStatus", ["pending", "approved", "rejected"]).default("pending").notNull(),
  approvedBy: int("approvedBy"),
  approvedAt: timestamp("approvedAt"),
  notes: text("notes"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
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
  complianceStatus: mysqlEnum("complianceStatus", ["compliant", "pending", "non_compliant"]).default("pending").notNull(),
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
  type: mysqlEnum("type", ["hospital", "clinic", "pharmacy", "other"]).default("other").notNull(),
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
  referenceNumber: varchar("referenceNumber", { length: 100 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  customerId: int("customerId"),
  departmentId: int("departmentId"),
  categoryId: int("categoryId"),
  templateId: int("templateId"), // if created from template
  status: mysqlEnum("status", ["draft", "open", "awarded", "closed", "archived"]).default("draft").notNull(),
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
  status: mysqlEnum("status", ["submitted", "under_review", "accepted", "rejected", "withdrawn"]).default("submitted").notNull(),
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
  status: mysqlEnum("status", ["draft", "sent", "paid", "overdue", "cancelled"]).default("draft").notNull(),
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
  status: mysqlEnum("status", ["draft", "pending", "approved", "rejected", "paid"]).default("draft").notNull(),
  approvalLevel: int("approvalLevel").default(0).notNull(),
  approvedBy: int("approvedBy"),
  approvedAt: timestamp("approvedAt"),
  rejectionReason: text("rejectionReason"),
  receiptUrl: text("receiptUrl"),
  notes: text("notes"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Purchase Orders for procurement workflow
 */
export const purchaseOrders = mysqlTable("purchase_orders", {
  id: int("id").autoincrement().primaryKey(),
  poNumber: varchar("poNumber", { length: 100 }).notNull().unique(),
  supplierId: int("supplierId").notNull(),
  tenderId: int("tenderId"),
  budgetId: int("budgetId"),
  issueDate: timestamp("issueDate").defaultNow().notNull(),
  deliveryDate: timestamp("deliveryDate"),
  status: mysqlEnum("status", ["draft", "submitted", "approved", "rejected", "completed", "cancelled"]).default("draft").notNull(),
  approvalLevel: int("approvalLevel").default(0).notNull(),
  approvedBy: int("approvedBy"),
  approvedAt: timestamp("approvedAt"),
  rejectionReason: text("rejectionReason"),
  subtotal: int("subtotal").notNull(), // in cents
  taxAmount: int("taxAmount").default(0).notNull(),
  totalAmount: int("totalAmount").notNull(),
  paymentTerms: text("paymentTerms"),
  deliveryAddress: text("deliveryAddress"),
  notes: text("notes"),
  receivedStatus: mysqlEnum("receivedStatus", ["not_received", "partially_received", "fully_received"]).default("not_received").notNull(),
  receivedDate: timestamp("receivedDate"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Purchase Order line items
 */
export const purchaseOrderItems = mysqlTable("purchase_order_items", {
  id: int("id").autoincrement().primaryKey(),
  poId: int("poId").notNull(),
  productId: int("productId"),
  description: text("description").notNull(),
  quantity: int("quantity").notNull(),
  receivedQuantity: int("receivedQuantity").default(0).notNull(),
  unitPrice: int("unitPrice").notNull(), // in cents
  totalPrice: int("totalPrice").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Goods Receipt records for tracking PO deliveries
 */
export const goodsReceipts = mysqlTable("goods_receipts", {
  id: int("id").autoincrement().primaryKey(),
  poId: int("poId").notNull(),
  receiptNumber: varchar("receiptNumber", { length: 100 }).notNull().unique(),
  receiptDate: timestamp("receiptDate").defaultNow().notNull(),
  receivedBy: int("receivedBy").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * Goods Receipt line items
 */
export const goodsReceiptItems = mysqlTable("goods_receipt_items", {
  id: int("id").autoincrement().primaryKey(),
  receiptId: int("receiptId").notNull(),
  poItemId: int("poItemId").notNull(),
  quantityReceived: int("quantityReceived").notNull(),
  batchNumber: varchar("batchNumber", { length: 100 }),
  expiryDate: timestamp("expiryDate"),
  condition: mysqlEnum("condition", ["good", "damaged", "defective"]).default("good").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
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
  status: mysqlEnum("status", ["planned", "in_transit", "delivered", "cancelled"]).default("planned").notNull(),
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
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed"]).default("pending").notNull(),
  extractionStatus: mysqlEnum("extractionStatus", ["not_started", "processing", "completed", "failed", "reviewed"]).default("not_started").notNull(),
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
  severity: mysqlEnum("severity", ["low", "medium", "high", "critical"]).default("medium").notNull(),
  description: text("description").notNull(),
  aiExplanation: text("aiExplanation"),
  detectedAt: timestamp("detectedAt").defaultNow().notNull(),
  status: mysqlEnum("status", ["new", "acknowledged", "investigating", "resolved", "false_positive"]).default("new").notNull(),
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
  priority: mysqlEnum("priority", ["low", "normal", "high", "urgent"]).default("normal").notNull(),
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
export type TenderTemplate = typeof tenderTemplates.$inferSelect;
export type Tender = typeof tenders.$inferSelect;
export type TenderItem = typeof tenderItems.$inferSelect;
export type TenderParticipant = typeof tenderParticipants.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
export type Delivery = typeof deliveries.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type ExtractionResult = typeof extractionResults.$inferSelect;
export type Forecast = typeof forecasts.$inferSelect;
export type Anomaly = typeof anomalies.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type PurchaseOrderItem = typeof purchaseOrderItems.$inferSelect;
export type GoodsReceipt = typeof goodsReceipts.$inferSelect;
export type GoodsReceiptItem = typeof goodsReceiptItems.$inferSelect;
