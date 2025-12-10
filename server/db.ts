import { eq, and, desc, asc, sql, gte, lte, or, like, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users, 
  userPermissions,
  departments,
  budgetCategories,
  budgets,
  suppliers,
  customers,
  customerCommunications,
  products,
  inventory,
  tenderTemplates,
  templateItems,
  tenders,
  tenderItems,
  tenderParticipants,
  participantBidItems,
  invoices,
  invoiceItems,
  expenses,
  deliveries,
  deliveryItems,
  opportunities,
  commissionRules,
  commissionAssignments,
  commissionEntries,
  employees,
  leaveRequests,
  requirementsRequests,
  requirementItems,
  committeeApprovals,
  cmsCases,
  cmsFollowups,
  documentFolders,
  documents,
  extractionResults,
  forecasts,
  anomalies,
  files,
  purchaseOrders,
  purchaseOrderItems,
  tasks,
  notifications,
  auditLogs,
  settings
} from "../drizzle/schema";
import { ENV } from './_core/env';

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
      values.role = 'admin';
      updateSet.role = 'admin';
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

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt));
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
  return db.select().from(userPermissions).where(eq(userPermissions.userId, userId));
}

export async function upsertUserPermission(permission: typeof userPermissions.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await db.select().from(userPermissions)
    .where(and(
      eq(userPermissions.userId, permission.userId),
      eq(userPermissions.module, permission.module)
    ))
    .limit(1);
  
  if (existing.length > 0) {
    await db.update(userPermissions)
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
  return db.select().from(departments).where(eq(departments.isActive, true)).orderBy(asc(departments.name));
}

export async function createDepartment(dept: typeof departments.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(departments).values(dept);
  return { insertId: result.insertId };
}

export async function updateDepartment(id: number, data: Partial<typeof departments.$inferInsert>) {
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
  return db.select().from(budgetCategories).where(eq(budgetCategories.isActive, true)).orderBy(asc(budgetCategories.name));
}

export async function createBudgetCategory(category: typeof budgetCategories.$inferInsert) {
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
  
  const result = await db.select().from(budgets).where(eq(budgets.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createBudget(budget: typeof budgets.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(budgets).values(budget);
  return { insertId: result.insertId };
}

export async function updateBudget(id: number, data: Partial<typeof budgets.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(budgets).set(data).where(eq(budgets.id, id));
}

export async function updateBudgetSpent(budgetId: number, amount: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(budgets)
    .set({ spentAmount: sql`${budgets.spentAmount} + ${amount}` })
    .where(eq(budgets.id, budgetId));
}

// ============================================
// REQUIREMENTS & COMMITTEE APPROVALS
// ============================================

function calculateRequirementTotal(items: Array<{ estimatedUnitPrice?: number; quantity?: number }>): number {
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
  const requestId = Number((result as any).insertId);

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

  const requests = await db.select().from(requirementsRequests).orderBy(desc(requirementsRequests.createdAt));
  const ids = requests.map(r => r.id).filter(Boolean) as number[];

  if (ids.length === 0) return requests;

  const approvals = await db.select().from(committeeApprovals).where(inArray(committeeApprovals.requestId, ids));
  const cms = await db.select().from(cmsCases).where(inArray(cmsCases.requestId, ids));

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

  const result = await db.select().from(requirementsRequests).where(eq(requirementsRequests.id, id)).limit(1);
  if (result.length === 0) return null;

  const request = result[0];
  const [items, approvals, cmsCase, followups] = await Promise.all([
    db.select().from(requirementItems).where(eq(requirementItems.requestId, id)),
    db.select().from(committeeApprovals).where(eq(committeeApprovals.requestId, id)),
    db.select().from(cmsCases).where(eq(cmsCases.requestId, id)).limit(1),
    db.select().from(cmsFollowups).where(eq(cmsFollowups.requestId, id)).orderBy(desc(cmsFollowups.followupDate)),
  ]);

  return {
    ...request,
    items,
    approvals,
    cmsCase: cmsCase.length > 0 ? cmsCase[0] : null,
    followups,
  };
}

export async function updateRequirementStatus(id: number, status: typeof requirementsRequests.$inferSelect["status"]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(requirementsRequests).set({ status, updatedAt: new Date() }).where(eq(requirementsRequests.id, id));
}

export async function addCommitteeApproval(approval: typeof committeeApprovals.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(committeeApprovals).values(approval);
  return { insertId: (result as any).insertId };
}

export async function upsertCmsCase(requestId: number, data: Partial<typeof cmsCases.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db.select().from(cmsCases).where(eq(cmsCases.requestId, requestId)).limit(1);
  if (existing.length > 0) {
    await db.update(cmsCases).set({ ...data, updatedAt: new Date() }).where(eq(cmsCases.requestId, requestId));
    return existing[0].id;
  }

  const [result] = await db.insert(cmsCases).values({
    ...data,
    requestId,
  });
  return Number((result as any).insertId);
}

export async function addCmsFollowup(entry: typeof cmsFollowups.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(cmsFollowups).values(entry);
  return { insertId: (result as any).insertId };
}

// ============================================
// SUPPLIERS
// ============================================

export async function getAllSuppliers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(suppliers).where(eq(suppliers.isActive, true)).orderBy(asc(suppliers.name));
}

export async function getSupplierById(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(suppliers).where(eq(suppliers.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createSupplier(supplier: typeof suppliers.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(suppliers).values(supplier);
  return { insertId: result.insertId };
}

export async function updateSupplier(id: number, data: Partial<typeof suppliers.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(suppliers).set(data).where(eq(suppliers.id, id));
}

// ============================================
// CUSTOMERS
// ============================================

export async function getAllCustomers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(customers).where(eq(customers.isActive, true)).orderBy(asc(customers.name));
}

export async function getCustomerById(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createCustomer(customer: typeof customers.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(customers).values(customer);
  return { insertId: result.insertId };
}

export async function updateCustomer(id: number, data: Partial<typeof customers.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(customers).set(data).where(eq(customers.id, id));
}

export async function getCustomerCommunications(customerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(customerCommunications)
    .where(eq(customerCommunications.customerId, customerId))
    .orderBy(desc(customerCommunications.contactedAt));
}

export async function createCustomerCommunication(comm: typeof customerCommunications.$inferInsert) {
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
  return db.select().from(products).where(eq(products.isActive, true)).orderBy(asc(products.name));
}

export async function getProductById(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getProductsBySupplierId(supplierId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(products)
    .where(and(eq(products.manufacturerId, supplierId), eq(products.isActive, true)))
    .orderBy(asc(products.name));
}

export async function createProduct(product: typeof products.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(products).values(product);
  return { insertId: result.insertId };
}

export async function updateProduct(id: number, data: Partial<typeof products.$inferInsert>) {
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
  return db.select().from(inventory)
    .where(sql`${inventory.quantity} <= ${inventory.minStockLevel}`);
}

export async function createInventory(inv: typeof inventory.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(inventory).values(inv);
  return { insertId: result.insertId };
}

export async function updateInventory(id: number, data: Partial<typeof inventory.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(inventory).set(data).where(eq(inventory.id, id));
}

export async function updateInventoryQuantity(productId: number, quantityChange: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(inventory)
    .set({ 
      quantity: sql`${inventory.quantity} + ${quantityChange}`,
      lastRestocked: new Date()
    })
    .where(eq(inventory.productId, productId));
}

// ============================================
// TENDER TEMPLATES
// ============================================

export async function getAllTenderTemplates() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tenderTemplates).orderBy(desc(tenderTemplates.createdAt));
}

export async function getTenderTemplateById(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(tenderTemplates).where(eq(tenderTemplates.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getTemplateItems(templateId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(templateItems).where(eq(templateItems.templateId, templateId));
}

export async function createTenderTemplate(template: typeof tenderTemplates.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(tenderTemplates).values(template);
  return { insertId: result.insertId };
}

export async function createTemplateItem(item: typeof templateItems.$inferInsert) {
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
    db.select().from(tenders).orderBy(desc(tenders.createdAt)).limit(pageSize).offset(offset),
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

  const result = await db.select({ count: sql<number>`count(*)` }).from(tenders);
  return Number(result[0]?.count ?? 0);
}

export async function getTenderById(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(tenders).where(eq(tenders.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getTenderItems(tenderId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tenderItems).where(eq(tenderItems.tenderId, tenderId));
}

export async function getTenderParticipants(tenderId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tenderParticipants).where(eq(tenderParticipants.tenderId, tenderId));
}

export async function getParticipantBidItems(participantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(participantBidItems).where(eq(participantBidItems.participantId, participantId));
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

export async function updateTender(id: number, data: Partial<typeof tenders.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(tenders).set(data).where(eq(tenders.id, id));
}

export async function createTenderParticipant(participant: typeof tenderParticipants.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(tenderParticipants).values(participant);
  return { insertId: result.insertId };
}

export async function createParticipantBidItem(bidItem: typeof participantBidItems.$inferInsert) {
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
  
  const result = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getInvoiceItems(invoiceId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));
}

export async function createInvoice(invoice: typeof invoices.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(invoices).values(invoice);
  return { insertId: result.insertId };
}

export async function createInvoiceItem(item: typeof invoiceItems.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(invoiceItems).values(item);
  return { insertId: result.insertId };
}

export async function updateInvoice(id: number, data: Partial<typeof invoices.$inferInsert>) {
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

export async function getExpenseById(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(expenses).where(eq(expenses.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createExpense(expense: typeof expenses.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(expenses).values(expense);
  return { insertId: (result as any).insertId };
}

export async function updateExpense(id: number, data: Partial<typeof expenses.$inferInsert>) {
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
  
  const result = await db.select().from(deliveries).where(eq(deliveries.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getDeliveryItems(deliveryId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(deliveryItems).where(eq(deliveryItems.deliveryId, deliveryId));
}

export async function createDelivery(delivery: typeof deliveries.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(deliveries).values(delivery);
  return { insertId: result.insertId };
}

export async function createDeliveryItem(item: typeof deliveryItems.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(deliveryItems).values(item);
  return { insertId: result.insertId };
}

export async function updateDelivery(id: number, data: Partial<typeof deliveries.$inferInsert>) {
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

export async function createDocumentFolder(folder: typeof documentFolders.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(documentFolders).values(folder);
  return { insertId: result.insertId };
}

export async function getDocumentsByEntity(entityType: string, entityId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(documents)
    .where(and(
      eq(documents.entityType, entityType),
      eq(documents.entityId, entityId),
      eq(documents.isDeleted, false)
    ))
    .orderBy(desc(documents.createdAt));
}

export async function getDocumentById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(documents)
    .where(and(
      eq(documents.id, id),
      eq(documents.isDeleted, false)
    ))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function createDocument(doc: typeof documents.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(documents).values(doc);
  return { insertId: result.insertId };
}

export async function updateDocument(id: number, data: Partial<typeof documents.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(documents).set(data).where(eq(documents.id, id));
}

export async function getExtractionResult(documentId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(extractionResults)
    .where(eq(extractionResults.documentId, documentId))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createExtractionResult(extraction: typeof extractionResults.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(extractionResults).values(extraction);
  return { insertId: result.insertId };
}

export async function updateExtractionResult(id: number, data: Partial<typeof extractionResults.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(extractionResults).set(data).where(eq(extractionResults.id, id));
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
  return db.select().from(anomalies)
    .where(inArray(anomalies.status, ["new", "acknowledged", "investigating"]))
    .orderBy(desc(anomalies.severity), desc(anomalies.detectedAt));
}

export async function createAnomaly(anomaly: typeof anomalies.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(anomalies).values(anomaly);
  return { insertId: result.insertId };
}

export async function updateAnomaly(id: number, data: Partial<typeof anomalies.$inferInsert>) {
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
  return db.select().from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(50);
}

export async function getUnreadNotifications(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notifications)
    .where(and(
      eq(notifications.userId, userId),
      eq(notifications.isRead, false)
    ))
    .orderBy(desc(notifications.createdAt));
}

export async function createNotification(notification: typeof notifications.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(notifications).values(notification);
  return { insertId: result.insertId };
}

export async function markNotificationRead(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(notifications)
    .set({ isRead: true, readAt: new Date() })
    .where(eq(notifications.id, id));
}

export async function markAllNotificationsRead(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(notifications)
    .set({ isRead: true, readAt: new Date() })
    .where(and(
      eq(notifications.userId, userId),
      eq(notifications.isRead, false)
    ));
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

export async function getAuditLogsForEntity(entityType: string, entityId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(auditLogs)
    .where(and(
      eq(auditLogs.entityType, entityType),
      eq(auditLogs.entityId, entityId)
    ))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
}

export async function getAuditLogsByUser(userId: number, limit: number = 100) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(auditLogs)
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
  
  const result = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getAllSettings() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(settings).orderBy(asc(settings.category), asc(settings.key));
}

export async function upsertSetting(setting: typeof settings.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await getSetting(setting.key);
  
  if (existing) {
    await db.update(settings)
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
  return { id: Number((result as any)[0]?.insertId ?? 0), ...file };
}

export async function getFileById(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(files).where(eq(files.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getFilesByEntity(entityType: string, entityId: number, category?: string) {
  const db = await getDb();
  if (!db) return [];
  
  let query = db.select().from(files).where(and(
    eq(files.entityType, entityType),
    eq(files.entityId, entityId)
  )) as any;
  
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
  const result = await db.select().from(files)
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
  const result = await db.select().from(files)
    .where(or(
      eq(files.id, parentId),
      eq(files.parentFileId, parentId)
    ))
    .orderBy(desc(files.version));
  return result;
}

export async function createFileVersion(file: typeof files.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(files).values(file);
  return { id: Number((result as any)[0]?.insertId ?? 0), ...file };
}

export async function markFileAsReplaced(fileId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(files)
    .set({ isCurrent: false, replacedAt: new Date() })
    .where(eq(files.id, fileId));
}

export async function markAllVersionsAsNotCurrent(parentFileId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(files)
    .set({ isCurrent: false })
    .where(or(
      eq(files.id, parentFileId),
      eq(files.parentFileId, parentFileId)
    ));
}

export async function markFileAsCurrent(fileId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(files)
    .set({ isCurrent: true, replacedAt: null })
    .where(eq(files.id, fileId));
}


// ============================================
// PURCHASE ORDERS
// ============================================

export async function getAllPurchaseOrders() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(purchaseOrders).orderBy(desc(purchaseOrders.createdAt));
}

export async function getPurchaseOrderById(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getPurchaseOrderItems(purchaseOrderId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, purchaseOrderId));
}

export async function createPurchaseOrder(po: typeof purchaseOrders.$inferInsert, items: typeof purchaseOrderItems.$inferInsert[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(purchaseOrders).values(po);
  const poId = Number((result as any)[0]?.insertId ?? 0);

  if (items.length > 0) {
    const itemsWithPoId = items.map(item => ({ ...item, purchaseOrderId: poId }));
    await db.insert(purchaseOrderItems).values(itemsWithPoId);
  }

  return { id: poId, ...po };
}

export async function updatePurchaseOrder(id: number, po: Partial<typeof purchaseOrders.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(purchaseOrders).set(po).where(eq(purchaseOrders.id, id));
}

export async function deletePurchaseOrder(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, id));
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
  return db.select().from(tasks).where(eq(tasks.assignedTo, userId)).orderBy(desc(tasks.createdAt));
}

export async function createTask(task: typeof tasks.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(tasks).values(task);
  return { id: Number((result as any)[0]?.insertId ?? 0), ...task };
}

export async function updateTask(id: number, task: Partial<typeof tasks.$inferInsert>) {
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
// OPPORTUNITIES
// ============================================

export async function getAllOpportunities() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(opportunities).orderBy(desc(opportunities.createdAt));
}

export async function createOpportunity(opp: typeof opportunities.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(opportunities).values(opp);
  return { id: Number((result as any).insertId), ...opp };
}

export async function updateOpportunity(id: number, data: Partial<typeof opportunities.$inferInsert>) {
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
  return db.select().from(commissionRules).orderBy(desc(commissionRules.createdAt));
}

export async function createCommissionRule(rule: typeof commissionRules.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(commissionRules).values(rule);
  return { id: Number((result as any).insertId), ...rule };
}

export async function listCommissionAssignments() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(commissionAssignments).orderBy(desc(commissionAssignments.createdAt));
}

export async function createCommissionAssignment(assign: typeof commissionAssignments.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(commissionAssignments).values(assign);
  return { id: Number((result as any).insertId), ...assign };
}

export async function listCommissionEntries() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(commissionEntries).orderBy(desc(commissionEntries.createdAt));
}

export async function createCommissionEntry(entry: typeof commissionEntries.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(commissionEntries).values(entry);
  return { id: Number((result as any).insertId), ...entry };
}

export async function updateCommissionEntry(id: number, data: Partial<typeof commissionEntries.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(commissionEntries).set(data).where(eq(commissionEntries.id, id));
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
  return { id: Number((result as any).insertId), ...emp };
}

export async function updateEmployee(id: number, data: Partial<typeof employees.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(employees).set(data).where(eq(employees.id, id));
}

export async function listLeaveRequests() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(leaveRequests).orderBy(desc(leaveRequests.createdAt));
}

export async function createLeaveRequest(req: typeof leaveRequests.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(leaveRequests).values(req);
  return { id: Number((result as any).insertId), ...req };
}

export async function updateLeaveRequest(id: number, data: Partial<typeof leaveRequests.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(leaveRequests).set(data).where(eq(leaveRequests.id, id));
}
