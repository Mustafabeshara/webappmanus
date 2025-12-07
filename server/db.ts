import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { eq, and, or, desc, asc, like, gte, lte, sql } from "drizzle-orm";
import * as schema from "../drizzle/schema";

const {
  users,
  userPermissions,
  departments,
  budgetCategories,
  budgets,
  suppliers,
  customers,
  products,
  inventory,
  invoices,
  invoiceItems,
  expenses,
  purchaseOrders,
  purchaseOrderItems,
  goodsReceipts,
  goodsReceiptItems,
  deliveries,
  deliveryItems,
  tenders,
  tenderTemplates,
  templateItems,
  tenderItems,
  tenderParticipants,
  participantBidItems,
  notifications,
  auditLogs,
  settings,
  tasks,
} = schema;

let connection: mysql.Connection | null = null;

export async function getDb() {
  try {
    if (!connection) {
      connection = await mysql.createConnection(process.env.DATABASE_URL!);
    }
    return drizzle(connection, { schema, mode: "default" });
  } catch (error) {
    console.error("Database connection error:", error);
    return null;
  }
}

// ============================================
// USERS
// ============================================

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0] || null;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0] || null;
}

export async function createUser(user: typeof users.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(users).values(user);
  return { insertId: Number((result as any).insertId) };
}

export async function updateUser(id: number, updates: Partial<typeof users.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set(updates).where(eq(users.id, id));
}

export async function upsertUser(user: typeof users.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await getUserByOpenId(user.openId);
  if (existing) {
    await updateUser(existing.id, user);
    return { insertId: existing.id };
  } else {
    return await createUser(user);
  }
}

export async function deleteUser(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(users).where(eq(users.id, id));
}

export async function getAllUsers(filters: {
  role?: string;
  status?: string;
  departmentId?: number;
} = {}) {
  const db = await getDb();
  if (!db) return [];
  
  let query = db.select().from(users);
  
  const conditions = [];
  if (filters.role) {
    conditions.push(eq(users.role, filters.role as any));
  }
  if (filters.status) {
    conditions.push(eq(users.status, filters.status as any));
  }
  if (filters.departmentId) {
    conditions.push(eq(users.departmentId, filters.departmentId));
  }
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }
  
  return query.orderBy(desc(users.createdAt));
}

// ============================================
// USER PERMISSIONS
// ============================================

export async function getUserPermissions(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(userPermissions).where(eq(userPermissions.userId, userId));
}

export async function setUserPermission(permission: typeof userPermissions.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Check if permission already exists
  const existing = await db.select()
    .from(userPermissions)
    .where(and(
      eq(userPermissions.userId, permission.userId),
      eq(userPermissions.module, permission.module)
    ))
    .limit(1);
  
  if (existing.length > 0) {
    // Update existing permission
    await db.update(userPermissions)
      .set(permission)
      .where(and(
        eq(userPermissions.userId, permission.userId),
        eq(userPermissions.module, permission.module)
      ));
  } else {
    // Insert new permission
    await db.insert(userPermissions).values(permission);
  }
}

export async function deleteUserPermission(userId: number, module: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(userPermissions)
    .where(and(
      eq(userPermissions.userId, userId),
      eq(userPermissions.module, module)
    ));
}

// ============================================
// DEPARTMENTS
// ============================================

export async function getAllDepartments() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(departments).orderBy(asc(departments.name));
}

export async function getDepartmentById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(departments).where(eq(departments.id, id)).limit(1);
  return result[0] || null;
}

export async function createDepartment(department: typeof departments.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(departments).values(department);
  return { insertId: Number((result as any).insertId) };
}

// ============================================
// NOTIFICATIONS
// ============================================

export async function createNotification(notification: typeof notifications.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(notifications).values(notification);
  return { insertId: Number((result as any).insertId) };
}

export async function getUserNotifications(userId: number, unreadOnly: boolean = false) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [eq(notifications.userId, userId)];
  if (unreadOnly) {
    conditions.push(eq(notifications.isRead, false));
  }
  
  return db.select()
    .from(notifications)
    .where(and(...conditions))
    .orderBy(desc(notifications.createdAt))
    .limit(50);
}

export async function markNotificationRead(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
}

export async function markAllNotificationsRead(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
}

export async function getUnreadNotificationCount(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(and(
      eq(notifications.userId, userId),
      eq(notifications.isRead, false)
    ));
  return Number(result[0]?.count || 0);
}

// ============================================
// AUDIT LOGS
// ============================================

export async function createAuditLog(log: typeof auditLogs.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(auditLogs).values(log);
  return { insertId: Number((result as any).insertId) };
}

export async function getAuditLogs(entityType?: string, entityId?: number) {
  const db = await getDb();
  if (!db) return [];
  
  let query = db.select().from(auditLogs);
  
  const conditions = [];
  if (entityType) {
    conditions.push(eq(auditLogs.entityType, entityType));
  }
  if (entityId) {
    conditions.push(eq(auditLogs.entityId, entityId));
  }
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }
  
  return query.orderBy(desc(auditLogs.createdAt)).limit(100);
}

// ============================================
// SETTINGS
// ============================================

export async function getAllSettings() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(settings);
}

export async function getSettingByKey(key: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  return result[0] || null;
}

export async function upsertSetting(setting: typeof settings.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await db.select().from(settings).where(eq(settings.key, setting.key)).limit(1);
  
  if (existing.length > 0) {
    await db.update(settings).set(setting).where(eq(settings.key, setting.key));
  } else {
    await db.insert(settings).values(setting);
  }
}

// ============================================
// TENDERS
// ============================================

export async function getAllTenders() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tenders).orderBy(desc(tenders.createdAt));
}

export async function getTenderById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(tenders).where(eq(tenders.id, id)).limit(1);
  return result[0] || null;
}

export async function createTender(tender: typeof tenders.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(tenders).values(tender);
  return { insertId: Number((result as any).insertId) };
}

export async function updateTender(id: number, updates: Partial<typeof tenders.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(tenders).set(updates).where(eq(tenders.id, id));
}

export async function deleteTender(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(tenders).where(eq(tenders.id, id));
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
  return result[0] || null;
}

export async function createTenderTemplate(template: typeof tenderTemplates.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(tenderTemplates).values(template);
  return { insertId: Number((result as any).insertId) };
}

export async function updateTenderTemplate(id: number, updates: Partial<typeof tenderTemplates.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(tenderTemplates).set(updates).where(eq(tenderTemplates.id, id));
}

export async function deleteTenderTemplate(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(tenderTemplates).where(eq(tenderTemplates.id, id));
}

// ============================================
// TEMPLATE ITEMS
// ============================================

export async function getTemplateItems(templateId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(templateItems).where(eq(templateItems.templateId, templateId));
}

export async function createTemplateItem(item: typeof templateItems.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(templateItems).values(item);
  return { insertId: Number((result as any).insertId) };
}

export async function updateTemplateItem(id: number, updates: Partial<typeof templateItems.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(templateItems).set(updates).where(eq(templateItems.id, id));
}

export async function deleteTemplateItem(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(templateItems).where(eq(templateItems.id, id));
}

// ============================================
// TENDER ITEMS
// ============================================

export async function getTenderItems(tenderId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tenderItems).where(eq(tenderItems.tenderId, tenderId));
}

export async function createTenderItem(item: typeof tenderItems.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(tenderItems).values(item);
  return { insertId: Number((result as any).insertId) };
}

export async function updateTenderItem(id: number, updates: Partial<typeof tenderItems.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(tenderItems).set(updates).where(eq(tenderItems.id, id));
}

export async function deleteTenderItem(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(tenderItems).where(eq(tenderItems.id, id));
}

// ============================================
// TENDER PARTICIPANTS
// ============================================

export async function getTenderParticipants(tenderId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tenderParticipants).where(eq(tenderParticipants.tenderId, tenderId));
}

export async function createTenderParticipant(participant: typeof tenderParticipants.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(tenderParticipants).values(participant);
  return { insertId: Number((result as any).insertId) };
}

export async function updateTenderParticipant(id: number, updates: Partial<typeof tenderParticipants.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(tenderParticipants).set(updates).where(eq(tenderParticipants.id, id));
}

export async function deleteTenderParticipant(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(tenderParticipants).where(eq(tenderParticipants.id, id));
}

// ============================================
// PARTICIPANT BID ITEMS
// ============================================

export async function getParticipantBidItems(participantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(participantBidItems).where(eq(participantBidItems.participantId, participantId));
}

export async function createParticipantBidItem(item: typeof participantBidItems.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(participantBidItems).values(item);
  return { insertId: Number((result as any).insertId) };
}

export async function updateParticipantBidItem(id: number, updates: Partial<typeof participantBidItems.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(participantBidItems).set(updates).where(eq(participantBidItems.id, id));
}

export async function deleteParticipantBidItem(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(participantBidItems).where(eq(participantBidItems.id, id));
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
  return result[0] || null;
}

export async function createBudget(budget: typeof budgets.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(budgets).values(budget);
  return { insertId: Number((result as any).insertId) };
}

export async function updateBudget(id: number, updates: Partial<typeof budgets.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(budgets).set(updates).where(eq(budgets.id, id));
}

export async function deleteBudget(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(budgets).where(eq(budgets.id, id));
}

// ============================================
// BUDGET CATEGORIES
// ============================================

export async function getAllBudgetCategories() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(budgetCategories).orderBy(asc(budgetCategories.name));
}

export async function getBudgetCategoryById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(budgetCategories).where(eq(budgetCategories.id, id)).limit(1);
  return result[0] || null;
}

export async function createBudgetCategory(category: typeof budgetCategories.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(budgetCategories).values(category);
  return { insertId: Number((result as any).insertId) };
}

export async function updateBudgetCategory(id: number, updates: Partial<typeof budgetCategories.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(budgetCategories).set(updates).where(eq(budgetCategories.id, id));
}

export async function deleteBudgetCategory(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(budgetCategories).where(eq(budgetCategories.id, id));
}

// ============================================
// SUPPLIERS
// ============================================

export async function getAllSuppliers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(suppliers).orderBy(asc(suppliers.name));
}

export async function getSupplierById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(suppliers).where(eq(suppliers.id, id)).limit(1);
  return result[0] || null;
}

export async function createSupplier(supplier: typeof suppliers.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(suppliers).values(supplier);
  return { insertId: Number((result as any).insertId) };
}

export async function updateSupplier(id: number, updates: Partial<typeof suppliers.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(suppliers).set(updates).where(eq(suppliers.id, id));
}

export async function deleteSupplier(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(suppliers).where(eq(suppliers.id, id));
}

// ============================================
// CUSTOMERS
// ============================================

export async function getAllCustomers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(customers).orderBy(asc(customers.name));
}

export async function getCustomerById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
  return result[0] || null;
}

export async function createCustomer(customer: typeof customers.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(customers).values(customer);
  return { insertId: Number((result as any).insertId) };
}

export async function updateCustomer(id: number, updates: Partial<typeof customers.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(customers).set(updates).where(eq(customers.id, id));
}

export async function deleteCustomer(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(customers).where(eq(customers.id, id));
}

// ============================================
// PRODUCTS
// ============================================

export async function getAllProducts() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(products).orderBy(asc(products.name));
}

export async function getProductById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return result[0] || null;
}

export async function createProduct(product: typeof products.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(products).values(product);
  return { insertId: Number((result as any).insertId) };
}

export async function updateProduct(id: number, updates: Partial<typeof products.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(products).set(updates).where(eq(products.id, id));
}

export async function deleteProduct(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(products).where(eq(products.id, id));
}

// ============================================
// INVENTORY
// ============================================

export async function getAllInventory() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(inventory).orderBy(asc(inventory.productId));
}

export async function getInventoryByProductId(productId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(inventory).where(eq(inventory.productId, productId)).limit(1);
  return result[0] || null;
}

export async function createInventory(inv: typeof inventory.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(inventory).values(inv);
  return { insertId: Number((result as any).insertId) };
}

export async function updateInventory(productId: number, updates: Partial<typeof inventory.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(inventory).set(updates).where(eq(inventory.productId, productId));
}

export async function deleteInventory(productId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(inventory).where(eq(inventory.productId, productId));
}

export async function getLowStockItems() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(inventory).where(sql`${inventory.quantity} <= ${inventory.minStockLevel}`);
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
  return result[0] || null;
}

export async function createInvoice(invoice: typeof invoices.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(invoices).values(invoice);
  return { insertId: Number((result as any).insertId) };
}

export async function updateInvoice(id: number, updates: Partial<typeof invoices.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(invoices).set(updates).where(eq(invoices.id, id));
}

export async function deleteInvoice(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(invoices).where(eq(invoices.id, id));
}

// ============================================
// INVOICE ITEMS
// ============================================

export async function getInvoiceItems(invoiceId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));
}

export async function createInvoiceItem(item: typeof invoiceItems.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(invoiceItems).values(item);
  return { insertId: Number((result as any).insertId) };
}

export async function updateInvoiceItem(id: number, updates: Partial<typeof invoiceItems.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(invoiceItems).set(updates).where(eq(invoiceItems.id, id));
}

export async function deleteInvoiceItem(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(invoiceItems).where(eq(invoiceItems.id, id));
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
  return result[0] || null;
}

export async function createExpense(expense: typeof expenses.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(expenses).values(expense);
  return { insertId: Number((result as any).insertId) };
}

export async function updateExpense(id: number, updates: Partial<typeof expenses.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(expenses).set(updates).where(eq(expenses.id, id));
}

export async function deleteExpense(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(expenses).where(eq(expenses.id, id));
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
  return result[0] || null;
}

export async function createPurchaseOrder(po: typeof purchaseOrders.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(purchaseOrders).values(po);
  return { insertId: Number((result as any).insertId) };
}

export async function updatePurchaseOrder(id: number, updates: Partial<typeof purchaseOrders.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(purchaseOrders).set(updates).where(eq(purchaseOrders.id, id));
}

export async function deletePurchaseOrder(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(purchaseOrders).where(eq(purchaseOrders.id, id));
}

// ============================================
// PURCHASE ORDER ITEMS
// ============================================

export async function getPurchaseOrderItems(poId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.poId, poId));
}

export async function createPurchaseOrderItem(item: typeof purchaseOrderItems.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(purchaseOrderItems).values(item);
  return { insertId: Number((result as any).insertId) };
}

export async function updatePurchaseOrderItem(id: number, updates: Partial<typeof purchaseOrderItems.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(purchaseOrderItems).set(updates).where(eq(purchaseOrderItems.id, id));
}

export async function deletePurchaseOrderItem(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(purchaseOrderItems).where(eq(purchaseOrderItems.id, id));
}

// ============================================
// GOODS RECEIPTS
// ============================================

export async function getAllGoodsReceipts() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(goodsReceipts).orderBy(desc(goodsReceipts.createdAt));
}

export async function getGoodsReceiptsByPO(poId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(goodsReceipts).where(eq(goodsReceipts.poId, poId));
}

export async function createGoodsReceipt(receipt: typeof goodsReceipts.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(goodsReceipts).values(receipt);
  return { insertId: Number((result as any).insertId) };
}

export async function updateGoodsReceipt(id: number, updates: Partial<typeof goodsReceipts.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(goodsReceipts).set(updates).where(eq(goodsReceipts.id, id));
}

export async function deleteGoodsReceipt(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(goodsReceipts).where(eq(goodsReceipts.id, id));
}

// ============================================
// GOODS RECEIPT ITEMS
// ============================================

export async function getGoodsReceiptItems(receiptId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(goodsReceiptItems).where(eq(goodsReceiptItems.receiptId, receiptId));
}

export async function createGoodsReceiptItem(item: typeof goodsReceiptItems.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(goodsReceiptItems).values(item);
  return { insertId: Number((result as any).insertId) };
}

export async function updateGoodsReceiptItem(id: number, updates: Partial<typeof goodsReceiptItems.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(goodsReceiptItems).set(updates).where(eq(goodsReceiptItems.id, id));
}

export async function deleteGoodsReceiptItem(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(goodsReceiptItems).where(eq(goodsReceiptItems.id, id));
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
  return result[0] || null;
}

export async function createDelivery(delivery: typeof deliveries.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(deliveries).values(delivery);
  return { insertId: Number((result as any).insertId) };
}

export async function updateDelivery(id: number, updates: Partial<typeof deliveries.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(deliveries).set(updates).where(eq(deliveries.id, id));
}

export async function deleteDelivery(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(deliveries).where(eq(deliveries.id, id));
}

// ============================================
// DELIVERY ITEMS
// ============================================

export async function getDeliveryItems(deliveryId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(deliveryItems).where(eq(deliveryItems.deliveryId, deliveryId));
}

export async function createDeliveryItem(item: typeof deliveryItems.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(deliveryItems).values(item);
  return { insertId: Number((result as any).insertId) };
}

export async function updateDeliveryItem(id: number, updates: Partial<typeof deliveryItems.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(deliveryItems).set(updates).where(eq(deliveryItems.id, id));
}

export async function deleteDeliveryItem(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(deliveryItems).where(eq(deliveryItems.id, id));
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
  return result[0] || null;
}

export async function createTask(task: typeof tasks.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(tasks).values(task);
  return { insertId: Number((result as any).insertId) };
}

export async function updateTask(id: number, updates: Partial<typeof tasks.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(tasks).set(updates).where(eq(tasks.id, id));
}

export async function deleteTask(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(tasks).where(eq(tasks.id, id));
}

// ============================================
// TASK COMMENTS
// ============================================

export async function getTaskComments(taskId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(schema.taskComments).where(eq(schema.taskComments.taskId, taskId)).orderBy(asc(schema.taskComments.createdAt));
}

export async function createTaskComment(comment: typeof schema.taskComments.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(schema.taskComments).values(comment);
  return { insertId: Number((result as any).insertId) };
}

export async function updateTaskComment(id: number, updates: Partial<typeof schema.taskComments.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(schema.taskComments).set(updates).where(eq(schema.taskComments.id, id));
}

export async function deleteTaskComment(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(schema.taskComments).where(eq(schema.taskComments.id, id));
}

// ============================================
// CUSTOMER COMMUNICATIONS
// ============================================

export async function getCustomerCommunications(customerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(schema.customerCommunications).where(eq(schema.customerCommunications.customerId, customerId)).orderBy(desc(schema.customerCommunications.contactedAt));
}

export async function createCustomerCommunication(communication: typeof schema.customerCommunications.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(schema.customerCommunications).values(communication);
  return { insertId: Number((result as any).insertId) };
}

export async function updateCustomerCommunication(id: number, updates: Partial<typeof schema.customerCommunications.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(schema.customerCommunications).set(updates).where(eq(schema.customerCommunications.id, id));
}

export async function deleteCustomerCommunication(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(schema.customerCommunications).where(eq(schema.customerCommunications.id, id));
}

// ============================================
// INVENTORY HELPERS
// ============================================

export async function updateInventoryQuantity(productId: number, quantityChange: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const inv = await getInventoryByProductId(productId);
  if (inv) {
    await updateInventory(productId, { 
      quantity: (inv.quantity || 0) + quantityChange,
      lastRestocked: new Date()
    });
  }
}


// ============================================
// EXPENSE ANALYTICS
// ============================================
export async function getExpensesByCategory(startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  
  let query = db
    .select({
      categoryId: expenses.categoryId,
      categoryName: budgetCategories.name,
      totalAmount: sql<number>`SUM(${expenses.amount})`,
      count: sql<number>`COUNT(*)`,
    })
    .from(expenses)
    .leftJoin(budgetCategories, eq(expenses.categoryId, budgetCategories.id))
    .groupBy(expenses.categoryId, budgetCategories.name);
  
  if (startDate && endDate) {
    query = query.where(and(
      gte(expenses.expenseDate, startDate),
      lte(expenses.expenseDate, endDate)
    )) as any;
  }
  
  return await query;
}

export async function getExpensesByDepartment(startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  
  let query = db
    .select({
      departmentId: expenses.departmentId,
      departmentName: departments.name,
      totalAmount: sql<number>`SUM(${expenses.amount})`,
      count: sql<number>`COUNT(*)`,
    })
    .from(expenses)
    .leftJoin(departments, eq(expenses.departmentId, departments.id))
    .groupBy(expenses.departmentId, departments.name);
  
  if (startDate && endDate) {
    query = query.where(and(
      gte(expenses.expenseDate, startDate),
      lte(expenses.expenseDate, endDate)
    )) as any;
  }
  
  return await query;
}

// ============================================
// DEPARTMENTS (UPDATE)
// ============================================
export async function updateDepartment(id: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  return await db.update(departments).set(data).where(eq(departments.id, id));
}

// ============================================
// SETTINGS (SET)
// ============================================
export async function setSetting(key: string, value: string, category: string, description?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  
  // Check if setting exists
  const existing = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  
  if (existing.length > 0) {
    // Update existing
    return await db.update(settings)
      .set({ value, category, description, updatedAt: new Date() })
      .where(eq(settings.key, key));
  } else {
    // Create new
    return await db.insert(settings).values({ key, value, category, description });
  }
}


// ============================================
// MISSING FUNCTIONS
// ============================================

// Goods Receipts (wrapper for existing function)
export async function getGoodsReceipts(purchaseOrderId?: number) {
  if (purchaseOrderId) {
    return await getGoodsReceiptsByPO(purchaseOrderId);
  }
  return await getAllGoodsReceipts();
}

// Inventory
export async function getInventoryById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(inventory).where(eq(inventory.id, id)).limit(1);
  return result[0] || null;
}

// Budget Analytics
export async function getBudgetsByCategory() {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  
  return await db
    .select({
      categoryId: budgets.categoryId,
      categoryName: budgetCategories.name,
      totalAllocated: sql<number>`SUM(${budgets.allocatedAmount})`,
      totalSpent: sql<number>`SUM(${budgets.spentAmount})`,
      count: sql<number>`COUNT(*)`,
    })
    .from(budgets)
    .leftJoin(budgetCategories, eq(budgets.categoryId, budgetCategories.id))
    .groupBy(budgets.categoryId, budgetCategories.name);
}

// Departments
export async function deleteDepartment(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  return await db.delete(departments).where(eq(departments.id, id));
}


// Tender Templates
export async function getAllTemplates() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(tenderTemplates).orderBy(desc(tenderTemplates.createdAt));
}

// Budget Categories
export async function getBudgetCategories() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(budgetCategories).orderBy(asc(budgetCategories.name));
}


export async function getTemplateById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(tenderTemplates).where(eq(tenderTemplates.id, id)).limit(1);
  return result[0] || null;
}

export async function createTemplate(template: typeof tenderTemplates.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(tenderTemplates).values(template);
}
