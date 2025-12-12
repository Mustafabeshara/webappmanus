import {
  and,
  asc,
  desc,
  eq,
  gt,
  gte,
  inArray,
  lt,
  lte,
  or,
  sql,
} from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { getInsertId } from "./types/db";
import {
  InsertUser,
  anomalies,
  auditLogs,
  budgetCategories,
  budgets,
  cmsCases,
  cmsFollowups,
  commissionAssignments,
  commissionEntries,
  commissionRules,
  committeeApprovals,
  customerCommunications,
  customers,
  deliveries,
  deliveryItems,
  departments,
  documentFolders,
  documents,
  employees,
  expenses,
  extractionResults,
  fileUploads,
  files,
  forecasts,
  inventory,
  invoiceItems,
  invoices,
  leaveRequests,
  notifications,
  opportunities,
  participantBidItems,
  passwordHistory,
  priceHistory,
  productSpecifications,
  products,
  purchaseOrderItems,
  purchaseOrders,
  rateLimitViolations,
  requirementItems,
  requirementsRequests,
  securityEvents,
  sessions,
  settings,
  supplierPrices,
  suppliers,
  taskDependencies,
  taskEscalations,
  tasks,
  templateItems,
  tenderItems,
  tenderParticipants,
  tenderTemplates,
  tenders,
  userPermissions,
  users,
  workflowInstances,
  workflowSteps,
  workflowTemplates,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============================================
// USER MANAGEMENT
// ============================================

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    // Handle password hash and salt for admin accounts
    if (user.passwordHash !== undefined) {
      values.passwordHash = user.passwordHash;
      updateSet.passwordHash = user.passwordHash;
    }
    if (user.passwordSalt !== undefined) {
      values.passwordSalt = user.passwordSalt;
      updateSet.passwordSalt = user.passwordSalt;
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt));
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUser(
  userId: number,
  updates: Partial<typeof users.$inferInsert>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(users).set(updates).where(eq(users.id, userId));
}

export async function updateUserRole(userId: number, role: "admin" | "user") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(users).set({ role }).where(eq(users.id, userId));
}

// ============================================
// USER PERMISSIONS
// ============================================

export async function getUserPermissions(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(userPermissions)
    .where(eq(userPermissions.userId, userId));
}

export async function upsertUserPermission(
  permission: typeof userPermissions.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db
    .select()
    .from(userPermissions)
    .where(
      and(
        eq(userPermissions.userId, permission.userId),
        eq(userPermissions.module, permission.module)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(userPermissions)
      .set(permission)
      .where(eq(userPermissions.id, existing[0].id));
  } else {
    await db.insert(userPermissions).values(permission);
  }
}

// ============================================
// DEPARTMENTS
// ============================================

export async function getAllDepartments() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(departments)
    .where(eq(departments.isActive, true))
    .orderBy(asc(departments.name));
}

export async function createDepartment(dept: typeof departments.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(departments).values(dept);
  return { insertId: result.insertId };
}

export async function updateDepartment(
  id: number,
  data: Partial<typeof departments.$inferInsert>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(departments).set(data).where(eq(departments.id, id));
}

// ============================================
// BUDGET CATEGORIES
// ============================================

export async function getAllBudgetCategories() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(budgetCategories)
    .where(eq(budgetCategories.isActive, true))
    .orderBy(asc(budgetCategories.name));
}

export async function createBudgetCategory(
  category: typeof budgetCategories.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(budgetCategories).values(category);
  return { insertId: result.insertId };
}

// ============================================
// BUDGETS
// ============================================

export async function getAllBudgets() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(budgets).orderBy(desc(budgets.createdAt));
}

export async function getBudgetById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(budgets)
    .where(eq(budgets.id, id))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createBudget(budget: typeof budgets.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(budgets).values(budget);
  return { insertId: result.insertId };
}

export async function updateBudget(
  id: number,
  data: Partial<typeof budgets.$inferInsert>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(budgets).set(data).where(eq(budgets.id, id));
}

export async function updateBudgetSpent(budgetId: number, amount: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(budgets)
    .set({ spentAmount: sql`${budgets.spentAmount} + ${amount}` })
    .where(eq(budgets.id, budgetId));
}

// ============================================
// REQUIREMENTS & COMMITTEE APPROVALS
// ============================================

function calculateRequirementTotal(
  items: Array<{ estimatedUnitPrice?: number; quantity?: number }>
): number {
  return items.reduce((sum, item) => {
    const price = item.estimatedUnitPrice ?? 0;
    const qty = item.quantity ?? 1;
    return sum + price * qty;
  }, 0);
}

export async function createRequirementRequest(
  request: typeof requirementsRequests.$inferInsert,
  items: Array<typeof requirementItems.$inferInsert>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const totalValue = calculateRequirementTotal(items);
  const [result] = await db.insert(requirementsRequests).values({
    ...request,
    totalValue,
  });
  const requestId = getInsertId(result);

  if (items.length > 0 && requestId) {
    for (const item of items) {
      await db.insert(requirementItems).values({
        ...item,
        requestId,
      });
    }
  }

  return { requestId, totalValue };
}

export async function getAllRequirementRequests() {
  const db = await getDb();
  if (!db) return [];

  const requests = await db
    .select()
    .from(requirementsRequests)
    .orderBy(desc(requirementsRequests.createdAt));
  const ids = requests.map(r => r.id).filter(Boolean) as number[];

  if (ids.length === 0) return requests;

  const approvals = await db
    .select()
    .from(committeeApprovals)
    .where(inArray(committeeApprovals.requestId, ids));
  const cms = await db
    .select()
    .from(cmsCases)
    .where(inArray(cmsCases.requestId, ids));

  return requests.map(req => {
    const reqApprovals = approvals.filter(a => a.requestId === req.id);
    const reqCms = cms.find(c => c.requestId === req.id) || null;
    return {
      ...req,
      approvals: reqApprovals,
      cmsCase: reqCms,
    };
  });
}

export async function getRequirementRequestById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(requirementsRequests)
    .where(eq(requirementsRequests.id, id))
    .limit(1);
  if (result.length === 0) return null;

  const request = result[0];
  const [items, approvals, cmsCase, followups] = await Promise.all([
    db
      .select()
      .from(requirementItems)
      .where(eq(requirementItems.requestId, id)),
    db
      .select()
      .from(committeeApprovals)
      .where(eq(committeeApprovals.requestId, id)),
    db.select().from(cmsCases).where(eq(cmsCases.requestId, id)).limit(1),
    db
      .select()
      .from(cmsFollowups)
      .where(eq(cmsFollowups.requestId, id))
      .orderBy(desc(cmsFollowups.followupDate)),
  ]);

  return {
    ...request,
    items,
    approvals,
    cmsCase: cmsCase.length > 0 ? cmsCase[0] : null,
    followups,
  };
}

export async function updateRequirementStatus(
  id: number,
  status: (typeof requirementsRequests.$inferSelect)["status"]
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(requirementsRequests)
    .set({ status, updatedAt: new Date() })
    .where(eq(requirementsRequests.id, id));
}

export async function addCommitteeApproval(
  approval: typeof committeeApprovals.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(committeeApprovals).values(approval);
  return { insertId: getInsertId(result) };
}

export async function upsertCmsCase(
  requestId: number,
  data: Partial<typeof cmsCases.$inferInsert>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db
    .select()
    .from(cmsCases)
    .where(eq(cmsCases.requestId, requestId))
    .limit(1);
  if (existing.length > 0) {
    await db
      .update(cmsCases)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(cmsCases.requestId, requestId));
    return existing[0].id;
  }

  const [result] = await db.insert(cmsCases).values({
    ...data,
    requestId,
  });
  return getInsertId(result);
}

export async function addCmsFollowup(entry: typeof cmsFollowups.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(cmsFollowups).values(entry);
  return { insertId: getInsertId(result) };
}

// ============================================
// SUPPLIERS
// ============================================

export async function getAllSuppliers() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(suppliers)
    .where(eq(suppliers.isActive, true))
    .orderBy(asc(suppliers.name));
}

export async function getSupplierById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(suppliers)
    .where(eq(suppliers.id, id))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createSupplier(supplier: typeof suppliers.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(suppliers).values(supplier);
  return { insertId: result.insertId };
}

export async function updateSupplier(
  id: number,
  data: Partial<typeof suppliers.$inferInsert>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(suppliers).set(data).where(eq(suppliers.id, id));
}

// ============================================
// SUPPLIER CATALOG FUNCTIONS
// ============================================

export async function getSupplierPrice(supplierId: number, productId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(supplierPrices)
    .where(
      and(
        eq(supplierPrices.supplierId, supplierId),
        eq(supplierPrices.productId, productId)
      )
    )
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function updateSupplierPrice(
  id: number,
  data: Partial<typeof supplierPrices.$inferInsert>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(supplierPrices).set(data).where(eq(supplierPrices.id, id));
}

export async function createSupplierPrice(
  data: typeof supplierPrices.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(supplierPrices).values(data);
  return getInsertId(result);
}

export async function createPriceHistory(
  data: typeof priceHistory.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(priceHistory).values(data);
  return { insertId: getInsertId(result) };
}

export async function getProductSupplierPrices(productId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(supplierPrices)
    .where(eq(supplierPrices.productId, productId))
    .orderBy(asc(supplierPrices.price));
}

export async function getProductSpecifications(productId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(productSpecifications)
    .where(eq(productSpecifications.productId, productId))
    .orderBy(asc(productSpecifications.displayOrder));
}

export async function updateProductSpecification(
  id: number,
  data: Partial<typeof productSpecifications.$inferInsert>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(productSpecifications)
    .set(data)
    .where(eq(productSpecifications.id, id));
}

export async function createProductSpecification(
  data: typeof productSpecifications.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(productSpecifications).values(data);
  return { insertId: getInsertId(result) };
}

export async function getSupplierOrders(
  supplierId: number,
  dateRange?: { start?: Date; end?: Date }
) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(purchaseOrders.supplierId, supplierId)];

  if (dateRange?.start) {
    conditions.push(gte(purchaseOrders.createdAt, dateRange.start));
  }
  if (dateRange?.end) {
    conditions.push(lte(purchaseOrders.createdAt, dateRange.end));
  }

  return db
    .select()
    .from(purchaseOrders)
    .where(and(...conditions))
    .orderBy(desc(purchaseOrders.createdAt));
}

export async function getSupplierDeliveries(
  supplierId: number,
  dateRange?: { start?: Date; end?: Date }
) {
  const db = await getDb();
  if (!db) return [];

  // Get deliveries linked to purchase orders from this supplier
  const supplierOrders = await getSupplierOrders(supplierId, dateRange);
  const orderIds = supplierOrders.map(o => o.id);

  if (orderIds.length === 0) return [];

  return db
    .select()
    .from(deliveries)
    .where(inArray(deliveries.purchaseOrderId, orderIds))
    .orderBy(desc(deliveries.createdAt));
}

export async function findProductByNameOrCode(name: string, code: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(products)
    .where(or(eq(products.name, name), eq(products.sku, code)))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

// ============================================
// CUSTOMERS
// ============================================

export async function getAllCustomers() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(customers)
    .where(eq(customers.isActive, true))
    .orderBy(asc(customers.name));
}

export async function getCustomerById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(customers)
    .where(eq(customers.id, id))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createCustomer(customer: typeof customers.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(customers).values(customer);
  return { insertId: result.insertId };
}

export async function updateCustomer(
  id: number,
  data: Partial<typeof customers.$inferInsert>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(customers).set(data).where(eq(customers.id, id));
}

export async function getCustomerCommunications(customerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(customerCommunications)
    .where(eq(customerCommunications.customerId, customerId))
    .orderBy(desc(customerCommunications.contactedAt));
}

export async function createCustomerCommunication(
  comm: typeof customerCommunications.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(customerCommunications).values(comm);
  return { insertId: result.insertId };
}

// ============================================
// PRODUCTS
// ============================================

export async function getAllProducts() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(products)
    .where(eq(products.isActive, true))
    .orderBy(asc(products.name));
}

export async function getProductById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(products)
    .where(eq(products.id, id))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getProductsBySupplierId(supplierId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(products)
    .where(
      and(eq(products.manufacturerId, supplierId), eq(products.isActive, true))
    )
    .orderBy(asc(products.name));
}

export async function createProduct(product: typeof products.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(products).values(product);
  return { insertId: result.insertId };
}

export async function updateProduct(
  id: number,
  data: Partial<typeof products.$inferInsert>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(products).set(data).where(eq(products.id, id));
}

// ============================================
// INVENTORY
// ============================================

export async function getAllInventory() {
  const db = await getDb();
  if (!db) return [];

  // Join products with inventory to get complete product info with stock levels
  const result = await db
    .select({
      id: products.id,
      sku: products.sku,
      name: products.name,
      description: products.description,
      category: products.category,
      manufacturerId: products.manufacturerId,
      unitPrice: products.unitPrice,
      unit: products.unit,
      specifications: products.specifications,
      isActive: products.isActive,
      currentStock: inventory.quantity,
      reorderLevel: inventory.minStockLevel,
      maxStockLevel: inventory.maxStockLevel,
      batchNumber: inventory.batchNumber,
      expiryDate: inventory.expiryDate,
      location: inventory.location,
      lastRestocked: inventory.lastRestocked,
      inventoryNotes: inventory.notes,
    })
    .from(products)
    .leftJoin(inventory, eq(products.id, inventory.productId))
    .where(eq(products.isActive, true))
    .orderBy(asc(products.name));

  return result;
}

export async function getInventoryByProduct(productId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(inventory).where(eq(inventory.productId, productId));
}

export async function getLowStockItems() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(inventory)
    .where(sql`${inventory.quantity} <= ${inventory.minStockLevel}`);
}

export async function createInventory(inv: typeof inventory.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(inventory).values(inv);
  return { insertId: result.insertId };
}

export async function updateInventory(
  id: number,
  data: Partial<typeof inventory.$inferInsert>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(inventory).set(data).where(eq(inventory.id, id));
}

export async function updateInventoryQuantity(
  productId: number,
  quantityChange: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(inventory)
    .set({
      quantity: sql`${inventory.quantity} + ${quantityChange}`,
      lastRestocked: new Date(),
    })
    .where(eq(inventory.productId, productId));
}

// ============================================
// TENDER TEMPLATES
// ============================================

export async function getAllTenderTemplates() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(tenderTemplates)
    .orderBy(desc(tenderTemplates.createdAt));
}

export async function getTenderTemplateById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(tenderTemplates)
    .where(eq(tenderTemplates.id, id))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getTemplateItems(templateId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(templateItems)
    .where(eq(templateItems.templateId, templateId));
}

export async function createTenderTemplate(
  template: typeof tenderTemplates.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(tenderTemplates).values(template);
  return { insertId: result.insertId };
}

export async function createTemplateItem(
  item: typeof templateItems.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(templateItems).values(item);
  return { insertId: result.insertId };
}

export async function deleteTenderTemplate(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Delete template items first
  await db.delete(templateItems).where(eq(templateItems.templateId, id));
  // Delete template
  await db.delete(tenderTemplates).where(eq(tenderTemplates.id, id));
}

// ============================================
// TENDERS
// ============================================

export async function getAllTenders() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tenders).orderBy(desc(tenders.createdAt));
}

export async function getTendersPaginated(page: number, pageSize: number) {
  const db = await getDb();
  if (!db) return { data: [], totalCount: 0 };

  const offset = (page - 1) * pageSize;

  const [data, countResult] = await Promise.all([
    db
      .select()
      .from(tenders)
      .orderBy(desc(tenders.createdAt))
      .limit(pageSize)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(tenders),
  ]);

  return {
    data,
    totalCount: Number(countResult[0]?.count ?? 0),
  };
}

export async function getTendersCount() {
  const db = await getDb();
  if (!db) return 0;

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(tenders);
  return Number(result[0]?.count ?? 0);
}

export async function getTendersDueBetween(start: Date, end: Date) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(tenders)
    .where(
      and(
        gte(tenders.submissionDeadline, start),
        lte(tenders.submissionDeadline, end)
      )
    )
    .orderBy(asc(tenders.submissionDeadline));
}

export async function getTenderById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(tenders)
    .where(eq(tenders.id, id))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getTenderItems(tenderId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(tenderItems)
    .where(eq(tenderItems.tenderId, tenderId));
}

export async function getTenderParticipants(tenderId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(tenderParticipants)
    .where(eq(tenderParticipants.tenderId, tenderId));
}

export async function getParticipantBidItems(participantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(participantBidItems)
    .where(eq(participantBidItems.participantId, participantId));
}

export async function createTender(tender: typeof tenders.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(tenders).values(tender);
  return { insertId: result.insertId };
}

export async function createTenderItem(item: typeof tenderItems.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(tenderItems).values(item);
  return { insertId: result.insertId };
}

export async function updateTender(
  id: number,
  data: Partial<typeof tenders.$inferInsert>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(tenders).set(data).where(eq(tenders.id, id));
}

export async function createTenderParticipant(
  participant: typeof tenderParticipants.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(tenderParticipants).values(participant);
  return { insertId: result.insertId };
}

export async function createParticipantBidItem(
  bidItem: typeof participantBidItems.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(participantBidItems).values(bidItem);
  return { insertId: result.insertId };
}

// ============================================
// INVOICES
// ============================================

export async function getAllInvoices() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(invoices).orderBy(desc(invoices.createdAt));
}

export async function getInvoiceById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(invoices)
    .where(eq(invoices.id, id))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getInvoiceItems(invoiceId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, invoiceId));
}

export async function createInvoice(invoice: typeof invoices.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(invoices).values(invoice);
  return { insertId: result.insertId };
}

export async function createInvoiceItem(
  item: typeof invoiceItems.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(invoiceItems).values(item);
  return { insertId: result.insertId };
}

export async function updateInvoice(
  id: number,
  data: Partial<typeof invoices.$inferInsert>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(invoices).set(data).where(eq(invoices.id, id));
}

// ============================================
// EXPENSES
// ============================================

export async function getAllExpenses() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(expenses).orderBy(desc(expenses.createdAt));
}

export async function getExpensesPaginated(page: number, pageSize: number) {
  const db = await getDb();
  if (!db) return { data: [], totalCount: 0 };

  const offset = (page - 1) * pageSize;

  const [data, countResult] = await Promise.all([
    db
      .select()
      .from(expenses)
      .orderBy(desc(expenses.createdAt))
      .limit(pageSize)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(expenses),
  ]);

  const totalCount = countResult[0]?.count ?? 0;
  return { data, totalCount };
}

export async function getExpenseById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(expenses)
    .where(eq(expenses.id, id))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createExpense(expense: typeof expenses.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(expenses).values(expense);
  return { insertId: getInsertId(result) };
}

export async function updateExpense(
  id: number,
  data: Partial<typeof expenses.$inferInsert>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(expenses).set(data).where(eq(expenses.id, id));
}

// ============================================
// DELIVERIES
// ============================================

export async function getAllDeliveries() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(deliveries).orderBy(desc(deliveries.createdAt));
}

export async function getDeliveryById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(deliveries)
    .where(eq(deliveries.id, id))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getDeliveryItems(deliveryId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(deliveryItems)
    .where(eq(deliveryItems.deliveryId, deliveryId));
}

export async function createDelivery(delivery: typeof deliveries.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(deliveries).values(delivery);
  return { insertId: result.insertId };
}

export async function createDeliveryItem(
  item: typeof deliveryItems.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(deliveryItems).values(item);
  return { insertId: result.insertId };
}

export async function updateDelivery(
  id: number,
  data: Partial<typeof deliveries.$inferInsert>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(deliveries).set(data).where(eq(deliveries.id, id));
}

// ============================================
// DOCUMENTS
// ============================================

export async function getAllDocumentFolders() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(documentFolders).orderBy(asc(documentFolders.name));
}

export async function createDocumentFolder(
  folder: typeof documentFolders.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(documentFolders).values(folder);
  return { insertId: result.insertId };
}

export async function getDocumentsByEntity(
  entityType: string,
  entityId: number
) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.entityType, entityType),
        eq(documents.entityId, entityId),
        eq(documents.isDeleted, false)
      )
    )
    .orderBy(desc(documents.createdAt));
}

export async function getDocumentById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, id), eq(documents.isDeleted, false)))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function createDocument(doc: typeof documents.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(documents).values(doc);
  return { insertId: result.insertId };
}

export async function updateDocument(
  id: number,
  data: Partial<typeof documents.$inferInsert>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(documents).set(data).where(eq(documents.id, id));
}

export async function getExtractionResult(documentId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(extractionResults)
    .where(eq(extractionResults.documentId, documentId))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createExtractionResult(
  extraction: typeof extractionResults.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(extractionResults).values(extraction);
  return { insertId: result.insertId };
}

export async function updateExtractionResult(
  id: number,
  data: Partial<typeof extractionResults.$inferInsert>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(extractionResults)
    .set(data)
    .where(eq(extractionResults.id, id));
}

// ============================================
// FORECASTS & ANALYTICS
// ============================================

export async function getAllForecasts() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(forecasts).orderBy(desc(forecasts.forecastDate));
}

export async function createForecast(forecast: typeof forecasts.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(forecasts).values(forecast);
  return { insertId: result.insertId };
}

// ============================================
// ANOMALIES
// ============================================

export async function getAllAnomalies() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(anomalies).orderBy(desc(anomalies.detectedAt));
}

export async function getActiveAnomalies() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(anomalies)
    .where(inArray(anomalies.status, ["new", "acknowledged", "investigating"]))
    .orderBy(desc(anomalies.severity), desc(anomalies.detectedAt));
}

export async function createAnomaly(anomaly: typeof anomalies.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(anomalies).values(anomaly);
  return { insertId: result.insertId };
}

export async function updateAnomaly(
  id: number,
  data: Partial<typeof anomalies.$inferInsert>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(anomalies).set(data).where(eq(anomalies.id, id));
}

// ============================================
// NOTIFICATIONS
// ============================================

export async function getUserNotifications(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(50);
}

export async function getUnreadNotifications(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(notifications)
    .where(
      and(eq(notifications.userId, userId), eq(notifications.isRead, false))
    )
    .orderBy(desc(notifications.createdAt));
}

export async function createNotification(
  notification: typeof notifications.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(notifications).values(notification);
  return { insertId: result.insertId };
}

export async function markNotificationRead(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(notifications)
    .set({ isRead: true, readAt: new Date() })
    .where(eq(notifications.id, id));
}

export async function markAllNotificationsRead(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(notifications)
    .set({ isRead: true, readAt: new Date() })
    .where(
      and(eq(notifications.userId, userId), eq(notifications.isRead, false))
    );
}

// ============================================
// AUDIT LOGS
// ============================================

export async function createAuditLog(log: typeof auditLogs.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(auditLogs).values(log);
  return { insertId: result.insertId };
}

export async function getAuditLogs(filters?: {
  entityType?: string;
  action?: string;
  userId?: number;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions: any[] = [];

  if (filters?.entityType) {
    conditions.push(eq(auditLogs.entityType, filters.entityType));
  }
  if (filters?.action) {
    conditions.push(eq(auditLogs.action, filters.action));
  }
  if (filters?.userId) {
    conditions.push(eq(auditLogs.userId, filters.userId));
  }
  if (filters?.startDate) {
    conditions.push(gte(auditLogs.createdAt, filters.startDate));
  }
  if (filters?.endDate) {
    conditions.push(lte(auditLogs.createdAt, filters.endDate));
  }

  let query = db.select().from(auditLogs);

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  return query
    .orderBy(desc(auditLogs.createdAt))
    .limit(filters?.limit || 100)
    .offset(filters?.offset || 0);
}

export async function getAuditLogsForEntity(
  entityType: string,
  entityId: number,
  limit: number = 50
) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.entityType, entityType),
        eq(auditLogs.entityId, entityId)
      )
    )
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
}

export async function getAuditLogsByUser(userId: number, limit: number = 100) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.userId, userId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
}

// ============================================
// SETTINGS
// ============================================

export async function getSetting(key: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(settings)
    .where(eq(settings.key, key))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getAllSettings() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(settings)
    .orderBy(asc(settings.category), asc(settings.key));
}

export async function upsertSetting(setting: typeof settings.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await getSetting(setting.key);

  if (existing) {
    await db
      .update(settings)
      .set({ value: setting.value, updatedBy: setting.updatedBy })
      .where(eq(settings.key, setting.key));
  } else {
    await db.insert(settings).values(setting);
  }
}

// ============================================
// FILES
// ============================================

export async function createFile(file: typeof files.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(files).values(file);
  return { id: getInsertId(result), ...file };
}

export async function getFileById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(files).where(eq(files.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getFilesByEntity(
  entityType: string,
  entityId: number,
  category?: string
) {
  const db = await getDb();
  if (!db) return [];

  let query = db
    .select()
    .from(files)
    .where(
      and(eq(files.entityType, entityType), eq(files.entityId, entityId))
    ) as any;

  if (category) {
    query = query.where(eq(files.category, category));
  }

  return query.orderBy(desc(files.createdAt));
}

export async function deleteFile(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(files).where(eq(files.id, id));
}

export async function getAllFiles() {
  const db = await getDb();
  if (!db) return [];

  // Only return current versions
  const result = await db
    .select()
    .from(files)
    .where(eq(files.isCurrent, true))
    .orderBy(desc(files.uploadedAt));
  return result;
}

export async function getFileHistory(fileId: number) {
  const db = await getDb();
  if (!db) return [];

  // Get the parent file ID (in case fileId is already a version)
  const file = await getFileById(fileId);
  if (!file) return [];

  const parentId = file.parentFileId || file.id;

  // Get all versions including the parent
  const result = await db
    .select()
    .from(files)
    .where(or(eq(files.id, parentId), eq(files.parentFileId, parentId)))
    .orderBy(desc(files.version));
  return result;
}

export async function createFileVersion(file: typeof files.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(files).values(file);
  return { id: getInsertId(result), ...file };
}

export async function markFileAsReplaced(fileId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(files)
    .set({ isCurrent: false, replacedAt: new Date() })
    .where(eq(files.id, fileId));
}

export async function markAllVersionsAsNotCurrent(parentFileId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(files)
    .set({ isCurrent: false })
    .where(
      or(eq(files.id, parentFileId), eq(files.parentFileId, parentFileId))
    );
}

export async function markFileAsCurrent(fileId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(files)
    .set({ isCurrent: true, replacedAt: null })
    .where(eq(files.id, fileId));
}

// ============================================
// PURCHASE ORDERS
// ============================================

export async function getAllPurchaseOrders() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(purchaseOrders)
    .orderBy(desc(purchaseOrders.createdAt));
}

export async function getPurchaseOrderById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(purchaseOrders)
    .where(eq(purchaseOrders.id, id))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getPurchaseOrderItems(purchaseOrderId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(purchaseOrderItems)
    .where(eq(purchaseOrderItems.purchaseOrderId, purchaseOrderId));
}

export async function createPurchaseOrder(
  po: typeof purchaseOrders.$inferInsert,
  items: (typeof purchaseOrderItems.$inferInsert)[]
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(purchaseOrders).values(po);
  const poId = getInsertId(result);

  if (items.length > 0) {
    const itemsWithPoId = items.map(item => ({
      ...item,
      purchaseOrderId: poId,
    }));
    await db.insert(purchaseOrderItems).values(itemsWithPoId);
  }

  return { id: poId, ...po };
}

export async function updatePurchaseOrder(
  id: number,
  po: Partial<typeof purchaseOrders.$inferInsert>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(purchaseOrders).set(po).where(eq(purchaseOrders.id, id));
}

export async function deletePurchaseOrder(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .delete(purchaseOrderItems)
    .where(eq(purchaseOrderItems.purchaseOrderId, id));
  await db.delete(purchaseOrders).where(eq(purchaseOrders.id, id));
}

// ============================================
// TASKS
// ============================================

export async function getAllTasks() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tasks).orderBy(desc(tasks.createdAt));
}

export async function getTaskById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getTasksByAssignee(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(tasks)
    .where(eq(tasks.assignedTo, userId))
    .orderBy(desc(tasks.createdAt));
}

export async function getTasksByEntity(entityType: string, entityId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.relatedEntityType, entityType),
        eq(tasks.relatedEntityId, entityId)
      )
    );
}

export async function createTask(task: typeof tasks.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(tasks).values(task);
  return { id: getInsertId(result), ...task };
}

export async function updateTask(
  id: number,
  task: Partial<typeof tasks.$inferInsert>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(tasks).set(task).where(eq(tasks.id, id));
}

export async function deleteTask(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(tasks).where(eq(tasks.id, id));
}

// ============================================
// TASK MANAGEMENT ADVANCED FUNCTIONS
// ============================================

export async function createTaskDependency(
  dependency: typeof taskDependencies.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(taskDependencies).values(dependency);
  return { insertId: getInsertId(result) };
}

export async function getTaskDependencies(taskId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(taskDependencies)
    .where(eq(taskDependencies.taskId, taskId));
}

export async function getTaskDependents(taskId: number) {
  const db = await getDb();
  if (!db) return [];

  // Get tasks that depend on this task
  return db
    .select()
    .from(taskDependencies)
    .where(eq(taskDependencies.dependsOnTaskId, taskId));
}

export async function createWorkflowTemplate(
  template: typeof workflowTemplates.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(workflowTemplates).values(template);
  return getInsertId(result);
}

export async function getWorkflowTemplateById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(workflowTemplates)
    .where(eq(workflowTemplates.id, id))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function getAllWorkflowTemplates() {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(workflowTemplates)
    .where(eq(workflowTemplates.isActive, true))
    .orderBy(asc(workflowTemplates.name));
}

export async function createWorkflowStep(
  step: typeof workflowSteps.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(workflowSteps).values(step);
  return { insertId: getInsertId(result) };
}

export async function getWorkflowSteps(templateId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(workflowSteps)
    .where(eq(workflowSteps.templateId, templateId))
    .orderBy(asc(workflowSteps.stepNumber));
}

export async function createWorkflowInstance(
  instance: typeof workflowInstances.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(workflowInstances).values(instance);
  return getInsertId(result);
}

export async function updateWorkflowInstance(
  id: number,
  updates: Partial<typeof workflowInstances.$inferInsert>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(workflowInstances)
    .set(updates)
    .where(eq(workflowInstances.id, id));
}

export async function getWorkflowInstanceById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(workflowInstances)
    .where(eq(workflowInstances.id, id))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function getWorkflowInstanceTasks(instanceId: number) {
  const db = await getDb();
  if (!db) return [];

  // Get tasks related to this workflow instance via entityType/entityId
  const instance = await getWorkflowInstanceById(instanceId);
  if (!instance) return [];

  // Return tasks that are related to the entity this workflow is for
  return db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.relatedEntityType, instance.entityType),
        eq(tasks.relatedEntityId, instance.entityId)
      )
    )
    .orderBy(asc(tasks.createdAt));
}

export async function getActiveWorkflowInstances(entityType?: string) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(workflowInstances.status, "active")];

  if (entityType) {
    conditions.push(eq(workflowInstances.entityType, entityType));
  }

  return db
    .select()
    .from(workflowInstances)
    .where(and(...conditions))
    .orderBy(desc(workflowInstances.startedAt));
}

export async function getOverdueTasks() {
  const db = await getDb();
  if (!db) return [];

  const now = new Date();
  return db
    .select()
    .from(tasks)
    .where(
      and(
        lte(tasks.dueDate, now),
        inArray(tasks.status, ["todo", "in_progress"])
      )
    );
}

export async function getActiveTaskEscalation(taskId: number, level: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(taskEscalations)
    .where(
      and(
        eq(taskEscalations.taskId, taskId),
        eq(taskEscalations.escalationLevel, level),
        sql`${taskEscalations.resolvedAt} IS NULL`
      )
    )
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function createTaskEscalation(
  escalation: typeof taskEscalations.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(taskEscalations).values(escalation);
  return { insertId: getInsertId(result) };
}

export async function resolveTaskEscalation(
  id: number,
  resolvedBy: number,
  resolution: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(taskEscalations)
    .set({
      resolvedAt: new Date(),
      resolvedBy,
      resolution,
    })
    .where(eq(taskEscalations.id, id));
}

export async function getTaskEscalations(taskId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(taskEscalations)
    .where(eq(taskEscalations.taskId, taskId))
    .orderBy(desc(taskEscalations.createdAt));
}

export async function createTaskNotification(notification: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Use existing notifications table
  await db.insert(notifications).values({
    userId: notification.userId,
    type: notification.type,
    title: "Task Notification",
    message: notification.message,
    entityType: "task",
    entityId: notification.taskId,
    priority: "normal",
  });
}

export async function createTaskComment(comment: {
  taskId: number;
  userId: number;
  content: string;
  isSystemComment?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Store task comments as audit log entries
  await db.insert(auditLogs).values({
    userId: comment.userId,
    entityType: "task",
    entityId: comment.taskId,
    action: comment.isSystemComment ? "system_comment" : "comment",
    changes: JSON.stringify({ content: comment.content }),
  });
}

// ============================================
// OPPORTUNITIES
// ============================================

export async function getAllOpportunities() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(opportunities).orderBy(desc(opportunities.createdAt));
}

export async function createOpportunity(
  opp: typeof opportunities.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(opportunities).values(opp);
  return { id: getInsertId(result), ...opp };
}

export async function updateOpportunity(
  id: number,
  data: Partial<typeof opportunities.$inferInsert>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(opportunities).set(data).where(eq(opportunities.id, id));
}

// ============================================
// COMMISSIONS
// ============================================

export async function listCommissionRules() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(commissionRules)
    .orderBy(desc(commissionRules.createdAt));
}

export async function createCommissionRule(
  rule: typeof commissionRules.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(commissionRules).values(rule);
  return { id: getInsertId(result), ...rule };
}

export async function listCommissionAssignments() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(commissionAssignments)
    .orderBy(desc(commissionAssignments.createdAt));
}

export async function createCommissionAssignment(
  assign: typeof commissionAssignments.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(commissionAssignments).values(assign);
  return { id: getInsertId(result), ...assign };
}

export async function listCommissionEntries() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(commissionEntries)
    .orderBy(desc(commissionEntries.createdAt));
}

export async function createCommissionEntry(
  entry: typeof commissionEntries.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(commissionEntries).values(entry);
  return { id: getInsertId(result), ...entry };
}

export async function updateCommissionEntry(
  id: number,
  data: Partial<typeof commissionEntries.$inferInsert>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(commissionEntries)
    .set(data)
    .where(eq(commissionEntries.id, id));
}

// ============================================
// HR (EMPLOYEES & LEAVE)
// ============================================

export async function listEmployees() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(employees).orderBy(desc(employees.createdAt));
}

export async function createEmployee(emp: typeof employees.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(employees).values(emp);
  return { id: getInsertId(result), ...emp };
}

export async function updateEmployee(
  id: number,
  data: Partial<typeof employees.$inferInsert>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(employees).set(data).where(eq(employees.id, id));
}

export async function listLeaveRequests() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(leaveRequests).orderBy(desc(leaveRequests.createdAt));
}

export async function createLeaveRequest(
  req: typeof leaveRequests.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(leaveRequests).values(req);
  return { id: getInsertId(result), ...req };
}

export async function updateLeaveRequest(
  id: number,
  data: Partial<typeof leaveRequests.$inferInsert>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(leaveRequests).set(data).where(eq(leaveRequests.id, id));
}
// ============================================
// SECURITY EVENTS
// ============================================

export async function createSecurityEvent(
  event: typeof securityEvents.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(securityEvents).values(event);
  return { insertId: result.insertId };
}

export async function getSecurityEvents(filters?: {
  type?: string;
  severity?: string;
  userId?: number;
  resolved?: boolean;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions: any[] = [];

  if (filters?.type) {
    conditions.push(eq(securityEvents.type, filters.type as any));
  }
  if (filters?.severity) {
    conditions.push(eq(securityEvents.severity, filters.severity as any));
  }
  if (filters?.userId) {
    conditions.push(eq(securityEvents.userId, filters.userId));
  }
  if (filters?.resolved !== undefined) {
    conditions.push(eq(securityEvents.resolved, filters.resolved));
  }
  if (filters?.startDate) {
    conditions.push(gte(securityEvents.createdAt, filters.startDate));
  }
  if (filters?.endDate) {
    conditions.push(lte(securityEvents.createdAt, filters.endDate));
  }

  let query = db.select().from(securityEvents);

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  return query
    .orderBy(desc(securityEvents.createdAt))
    .limit(filters?.limit || 100)
    .offset(filters?.offset || 0);
}

export async function updateSecurityEvent(
  id: number,
  data: Partial<typeof securityEvents.$inferInsert>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(securityEvents).set(data).where(eq(securityEvents.id, id));
}

// ============================================
// SESSIONS
// ============================================

export async function createSession(session: typeof sessions.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(sessions).values(session);
  return { insertId: result.insertId };
}

export async function getSessionBySessionId(sessionId: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(sessions)
    .where(eq(sessions.sessionId, sessionId))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updateSession(
  sessionId: string,
  data: Partial<typeof sessions.$inferInsert>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(sessions).set(data).where(eq(sessions.sessionId, sessionId));
}

export async function getUserSessions(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(sessions)
    .where(
      and(
        eq(sessions.userId, userId),
        eq(sessions.isActive, true),
        gt(sessions.expiresAt, new Date())
      )
    )
    .orderBy(desc(sessions.lastAccessedAt));
}

export async function invalidateSession(sessionId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(sessions)
    .set({ isActive: false })
    .where(eq(sessions.sessionId, sessionId));
}

export async function invalidateAllUserSessions(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(sessions)
    .set({ isActive: false })
    .where(eq(sessions.userId, userId));
}

export async function cleanupExpiredSessions() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const now = new Date();
  await db
    .update(sessions)
    .set({ isActive: false })
    .where(and(eq(sessions.isActive, true), lt(sessions.expiresAt, now)));
}

// ============================================
// PASSWORD HISTORY
// ============================================

export async function createPasswordHistory(
  history: typeof passwordHistory.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(passwordHistory).values(history);
  return { insertId: result.insertId };
}

export async function getUserPasswordHistory(
  userId: number,
  limit: number = 10
) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(passwordHistory)
    .where(eq(passwordHistory.userId, userId))
    .orderBy(desc(passwordHistory.createdAt))
    .limit(limit);
}

// ============================================
// RATE LIMIT VIOLATIONS
// ============================================

export async function createRateLimitViolation(
  violation: typeof rateLimitViolations.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(rateLimitViolations).values(violation);
  return { insertId: result.insertId };
}

export async function getRateLimitViolation(
  identifier: string,
  endpoint: string
) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(rateLimitViolations)
    .where(
      and(
        eq(rateLimitViolations.identifier, identifier),
        eq(rateLimitViolations.endpoint, endpoint)
      )
    )
    .orderBy(desc(rateLimitViolations.createdAt))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function updateRateLimitViolation(
  id: number,
  data: Partial<typeof rateLimitViolations.$inferInsert>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(rateLimitViolations)
    .set(data)
    .where(eq(rateLimitViolations.id, id));
}

// ============================================
// FILE UPLOADS SECURITY
// ============================================

export async function createFileUpload(
  upload: typeof fileUploads.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(fileUploads).values(upload);
  return { insertId: result.insertId };
}

export async function updateFileUpload(
  id: number,
  data: Partial<typeof fileUploads.$inferInsert>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(fileUploads).set(data).where(eq(fileUploads.id, id));
}

export async function getFileUploadById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(fileUploads)
    .where(eq(fileUploads.id, id))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

// Re-export drizzle operators and tables for use in security modules
export { and, asc, desc, eq, gt, gte, lt, lte, or, securityEvents, sessions };
