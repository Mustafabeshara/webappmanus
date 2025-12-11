/**
 * Comprehensive Validation Schemas
 *
 * Centralized validation schemas for all API endpoints using Zod.
 * All schemas include security validation to prevent SQL injection and XSS attacks.
 */

import { z } from "zod";
import { commonSchemas } from "./input-validation";

// ============================================
// COMMON VALIDATION HELPERS
// ============================================

// ID validation
export const idSchema = z
  .number()
  .int()
  .positive("ID must be a positive integer");

// Pagination schemas
export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

// Date range schemas
export const dateRangeSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

// ============================================
// USER SCHEMAS
// ============================================

export const userSchemas = {
  updateRole: z.object({
    userId: idSchema,
    role: z.enum(["admin", "user"]),
  }),

  updatePermission: z.object({
    userId: idSchema,
    module: commonSchemas.safeString(100),
    canView: z.boolean().optional(),
    canCreate: z.boolean().optional(),
    canEdit: z.boolean().optional(),
    canDelete: z.boolean().optional(),
    canApprove: z.boolean().optional(),
  }),
};

// ============================================
// DEPARTMENT SCHEMAS
// ============================================

export const departmentSchemas = {
  create: z.object({
    name: commonSchemas.safeString(255),
    description: commonSchemas.safeString(1000).optional(),
    managerId: idSchema.optional(),
  }),

  update: z.object({
    id: idSchema,
    name: commonSchemas.safeString(255).optional(),
    description: commonSchemas.safeString(1000).optional(),
    managerId: idSchema.optional(),
    isActive: z.boolean().optional(),
  }),
};

// ============================================
// BUDGET CATEGORY SCHEMAS
// ============================================

export const budgetCategorySchemas = {
  create: z.object({
    name: commonSchemas.safeString(255),
    parentId: idSchema.optional(),
    description: commonSchemas.safeString(1000).optional(),
  }),
};

// ============================================
// BUDGET SCHEMAS
// ============================================

export const budgetSchemas = {
  get: z.object({
    id: idSchema,
  }),

  create: z.object({
    name: commonSchemas.safeString(255),
    categoryId: idSchema,
    departmentId: idSchema.optional(),
    fiscalYear: z.number().int().min(2020).max(2050),
    allocatedAmount: z.number().int().positive("Amount must be positive"),
    notes: commonSchemas.safeString(2000).optional(),
  }),

  update: z.object({
    id: idSchema,
    name: commonSchemas.safeString(255).optional(),
    categoryId: idSchema.optional(),
    departmentId: idSchema.optional(),
    fiscalYear: z.number().int().min(2020).max(2050).optional(),
    allocatedAmount: z.number().int().positive().optional(),
    notes: commonSchemas.safeString(2000).optional(),
  }),

  approve: z.object({
    id: idSchema,
    approved: z.boolean(),
    rejectionReason: commonSchemas.safeString(1000).optional(),
  }),

  forecast: z.object({
    categoryId: idSchema.optional(),
    departmentId: idSchema.optional(),
    timeframeDays: z.number().int().positive().max(365).default(90),
  }),
};

// ============================================
// REQUIREMENTS SCHEMAS
// ============================================

const requirementStatuses = [
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
] as const;

const approvalRoles = [
  "head_of_department",
  "committee_head",
  "specialty_head",
  "fatwa",
  "ctc",
  "audit",
] as const;

export const requirementSchemas = {
  get: z.object({
    id: idSchema,
  }),

  create: z.object({
    hospital: commonSchemas.safeString(255),
    specialty: commonSchemas.safeString(255),
    departmentId: idSchema.optional(),
    fiscalYear: z.number().int().min(2020).max(2050),
    notes: commonSchemas.safeString(2000).optional(),
    items: z
      .array(
        z.object({
          description: commonSchemas.safeString(1000),
          quantity: z.number().int().positive(),
          unit: commonSchemas.safeString(50).default("unit"),
          estimatedUnitPrice: z.number().int().min(0),
          category: commonSchemas.safeString(255).optional(),
        })
      )
      .min(1, "At least one item is required"),
  }),

  updateStatus: z.object({
    id: idSchema,
    status: z.enum(requirementStatuses),
  }),

  addApproval: z.object({
    requestId: idSchema,
    role: z.enum(approvalRoles),
    decision: z.enum(["approved", "rejected"]),
    note: commonSchemas.safeString(1000).optional(),
  }),

  updateCmsCase: z.object({
    requestId: idSchema,
    caseNumber: commonSchemas.safeString(100).optional(),
    status: z.enum([
      "with_cms",
      "discount_requested",
      "awaiting_ctc",
      "awaiting_fatwa",
      "awaiting_audit",
      "contract_issued",
      "closed",
    ]),
    cmsContact: commonSchemas.safeString(255).optional(),
    nextFollowupDate: z.string().optional(),
    notes: commonSchemas.safeString(2000).optional(),
  }),

  addFollowup: z.object({
    requestId: idSchema,
    note: commonSchemas.safeString(2000),
    contact: commonSchemas.safeString(255).optional(),
    followupDate: z.string().optional(),
    nextActionDate: z.string().optional(),
  }),
};

// ============================================
// SUPPLIER SCHEMAS
// ============================================

export const supplierSchemas = {
  get: z.object({
    id: idSchema,
  }),

  products: z.object({
    supplierId: idSchema,
  }),

  create: z.object({
    name: commonSchemas.safeString(255),
    contactPerson: commonSchemas.safeString(255).optional(),
    email: commonSchemas.email.optional(),
    phone: commonSchemas.safeString(50).optional(),
    address: commonSchemas.safeString(1000).optional(),
    taxId: commonSchemas.safeString(100).optional(),
    rating: z.number().int().min(1).max(5).optional(),
    notes: commonSchemas.safeString(2000).optional(),
  }),

  update: z.object({
    id: idSchema,
    name: commonSchemas.safeString(255).optional(),
    contactPerson: commonSchemas.safeString(255).optional(),
    email: commonSchemas.email.optional(),
    phone: commonSchemas.safeString(50).optional(),
    address: commonSchemas.safeString(1000).optional(),
    taxId: commonSchemas.safeString(100).optional(),
    complianceStatus: z
      .enum(["compliant", "pending", "non_compliant"])
      .optional(),
    rating: z.number().int().min(1).max(5).optional(),
    notes: commonSchemas.safeString(2000).optional(),
    isActive: z.boolean().optional(),
  }),
};

// ============================================
// CUSTOMER SCHEMAS
// ============================================

export const customerSchemas = {
  get: z.object({
    id: idSchema,
  }),

  create: z.object({
    name: commonSchemas.safeString(255),
    type: z.enum(["hospital", "clinic", "pharmacy", "other"]).default("other"),
    contactPerson: commonSchemas.safeString(255).optional(),
    email: commonSchemas.email.optional(),
    phone: commonSchemas.safeString(50).optional(),
    address: commonSchemas.safeString(1000).optional(),
    taxId: commonSchemas.safeString(100).optional(),
    creditLimit: z.number().int().min(0).optional(),
    notes: commonSchemas.safeString(2000).optional(),
  }),

  update: z.object({
    id: idSchema,
    name: commonSchemas.safeString(255).optional(),
    type: z.enum(["hospital", "clinic", "pharmacy", "other"]).optional(),
    contactPerson: commonSchemas.safeString(255).optional(),
    email: commonSchemas.email.optional(),
    phone: commonSchemas.safeString(50).optional(),
    address: commonSchemas.safeString(1000).optional(),
    taxId: commonSchemas.safeString(100).optional(),
    creditLimit: z.number().int().min(0).optional(),
    notes: commonSchemas.safeString(2000).optional(),
    isActive: z.boolean().optional(),
  }),

  getCommunications: z.object({
    customerId: idSchema,
  }),

  addCommunication: z.object({
    customerId: idSchema,
    type: z.enum(["email", "phone", "meeting", "note"]),
    subject: commonSchemas.safeString(255).optional(),
    content: commonSchemas.safeString(5000),
  }),
};

// ============================================
// PRODUCT SCHEMAS
// ============================================

export const productSchemas = {
  get: z.object({
    id: idSchema,
  }),

  create: z.object({
    name: commonSchemas.safeString(255),
    description: commonSchemas.safeString(2000).optional(),
    category: commonSchemas.safeString(100).optional(),
    manufacturerId: idSchema.optional(),
    unitPrice: z.number().int().min(0).optional(),
    unit: commonSchemas.safeString(50).optional(),
    specifications: commonSchemas.safeString(5000).optional(),
    // Inventory fields for initial setup
    minStockLevel: z.number().int().min(0).default(0),
    maxStockLevel: z.number().int().min(0).optional(),
    initialQuantity: z.number().int().min(0).default(0),
    location: commonSchemas.safeString(255).optional(),
  }),

  update: z.object({
    id: idSchema,
    name: commonSchemas.safeString(255).optional(),
    description: commonSchemas.safeString(2000).optional(),
    category: commonSchemas.safeString(100).optional(),
    manufacturerId: idSchema.optional(),
    unitPrice: z.number().int().min(0).optional(),
    unit: commonSchemas.safeString(50).optional(),
    specifications: commonSchemas.safeString(5000).optional(),
    isActive: z.boolean().optional(),
  }),
};

// ============================================
// INVENTORY SCHEMAS
// ============================================

export const inventorySchemas = {
  byProduct: z.object({
    productId: idSchema,
  }),

  create: z.object({
    productId: idSchema,
    quantity: z.number().int().min(0),
    batchNumber: commonSchemas.safeString(100).optional(),
    expiryDate: z.string().optional(),
    location: commonSchemas.safeString(255).optional(),
    minStockLevel: z.number().int().min(0).default(0),
    maxStockLevel: z.number().int().min(0).optional(),
    notes: commonSchemas.safeString(1000).optional(),
  }),

  update: z.object({
    id: idSchema,
    quantity: z.number().int().min(0).optional(),
    batchNumber: commonSchemas.safeString(100).optional(),
    expiryDate: z.string().optional(),
    location: commonSchemas.safeString(255).optional(),
    minStockLevel: z.number().int().min(0).optional(),
    maxStockLevel: z.number().int().min(0).optional(),
    notes: commonSchemas.safeString(1000).optional(),
  }),

  updateQuantity: z.object({
    productId: idSchema,
    quantityChange: z.number().int(),
  }),
};

// ============================================
// FILE UPLOAD SCHEMAS
// ============================================

export const fileSchemas = {
  upload: z.object({
    entityType: commonSchemas.safeString(50),
    entityId: idSchema,
    category: commonSchemas.safeString(100).optional(),
    file: commonSchemas.fileUpload,
  }),

  get: z.object({
    id: idSchema,
  }),

  delete: z.object({
    id: idSchema,
  }),

  getByEntity: z.object({
    entityType: commonSchemas.safeString(50),
    entityId: idSchema,
    category: commonSchemas.safeString(100).optional(),
  }),
};

// ============================================
// SEARCH AND FILTER SCHEMAS
// ============================================

export const searchSchemas = {
  general: z.object({
    query: commonSchemas.safeString(500).optional(),
    category: commonSchemas.safeString(100).optional(),
    status: commonSchemas.safeString(50).optional(),
    ...paginationSchema.shape,
    ...dateRangeSchema.shape,
  }),

  products: z.object({
    query: commonSchemas.safeString(500).optional(),
    category: commonSchemas.safeString(100).optional(),
    supplierId: idSchema.optional(),
    minPrice: z.number().int().min(0).optional(),
    maxPrice: z.number().int().min(0).optional(),
    ...paginationSchema.shape,
  }),

  suppliers: z.object({
    query: commonSchemas.safeString(500).optional(),
    complianceStatus: z
      .enum(["compliant", "pending", "non_compliant"])
      .optional(),
    minRating: z.number().int().min(1).max(5).optional(),
    ...paginationSchema.shape,
  }),
};
