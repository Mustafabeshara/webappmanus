import { getDb } from "./db";
import { sql, gte, lte, and, count, sum } from "drizzle-orm";
import {
  tenders,
  budgets,
  budgetCategories,
  invoices,
  purchaseOrders,
  inventory,
  deliveries,
  expenses,
} from "../drizzle/schema";

export async function getTenderAnalytics(startDate?: Date, endDate?: Date) {
  const database = await getDb();
  if (!database) throw new Error('Database not available');
  
  const conditions = [];
  if (startDate) conditions.push(gte(tenders.publishDate, startDate));
  if (endDate) conditions.push(lte(tenders.publishDate, endDate));
  
  const result = await database
    .select({
      status: tenders.status,
      count: count(),
      totalValue: sum(tenders.estimatedValue),
    })
    .from(tenders)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .groupBy(tenders.status);
  
  return result.map(r => ({
    status: r.status,
    count: Number(r.count),
    totalValue: Number(r.totalValue || 0),
  }));
}

export async function getBudgetAnalytics(fiscalYear?: number) {
  const database = await getDb();
  if (!database) throw new Error('Database not available');
  
  const result = await database
    .select({
      categoryName: budgetCategories.name,
      budgetCount: count(),
      totalAllocated: sum(budgets.allocatedAmount),
      totalSpent: sum(budgets.spentAmount),
    })
    .from(budgets)
    .leftJoin(budgetCategories, sql`${budgets.categoryId} = ${budgetCategories.id}`)
    .where(fiscalYear ? sql`${budgets.fiscalYear} = ${fiscalYear}` : undefined)
    .groupBy(budgetCategories.id, budgetCategories.name);
  
  return result.map(r => ({
    categoryName: r.categoryName || 'Uncategorized',
    budgetCount: Number(r.budgetCount),
    totalAllocated: Number(r.totalAllocated || 0),
    totalSpent: Number(r.totalSpent || 0),
    totalRemaining: Number(r.totalAllocated || 0) - Number(r.totalSpent || 0),
  }));
}

export async function getInvoiceAnalytics(startDate?: Date, endDate?: Date) {
  const database = await getDb();
  if (!database) throw new Error('Database not available');
  
  const conditions = [];
  if (startDate) conditions.push(gte(invoices.issueDate, startDate));
  if (endDate) conditions.push(lte(invoices.issueDate, endDate));
  
  const result = await database
    .select({
      status: invoices.status,
      count: count(),
      totalAmount: sum(invoices.totalAmount),
    })
    .from(invoices)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .groupBy(invoices.status);
  
  return result.map(r => ({
    status: r.status,
    count: Number(r.count),
    totalAmount: Number(r.totalAmount || 0),
  }));
}

export async function getPurchaseOrderAnalytics(startDate?: Date, endDate?: Date) {
  const database = await getDb();
  if (!database) throw new Error('Database not available');
  
  const conditions = [];
  if (startDate) conditions.push(gte(purchaseOrders.issueDate, startDate));
  if (endDate) conditions.push(lte(purchaseOrders.issueDate, endDate));
  
  const result = await database
    .select({
      status: purchaseOrders.status,
      count: count(),
      totalAmount: sum(purchaseOrders.totalAmount),
    })
    .from(purchaseOrders)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .groupBy(purchaseOrders.status);
  
  return result.map(r => ({
    status: r.status,
    count: Number(r.count),
    totalAmount: Number(r.totalAmount || 0),
  }));
}

export async function getInventoryAnalytics() {
  const database = await getDb();
  if (!database) throw new Error('Database not available');
  
  const result = await database
    .select({
      totalItems: count(),
      totalQuantity: sum(inventory.quantity),
      totalValue: sql<number>`0`  // No unit cost in inventory, would need to join with products,
    })
    .from(inventory);
  
  // Count low stock and out of stock separately
  const lowStock = await database
    .select({ count: count() })
    .from(inventory)
    .where(sql`${inventory.quantity} <= ${inventory.minStockLevel}`);
  
  const outOfStock = await database
    .select({ count: count() })
    .from(inventory)
    .where(sql`${inventory.quantity} = 0`);
  
  return {
    totalItems: Number(result[0]?.totalItems || 0),
    totalQuantity: Number(result[0]?.totalQuantity || 0),
    lowStockCount: Number(lowStock[0]?.count || 0),
    outOfStockCount: Number(outOfStock[0]?.count || 0),
    totalValue: Number(result[0]?.totalValue || 0),
  };
}

export async function getDeliveryAnalytics(startDate?: Date, endDate?: Date) {
  const database = await getDb();
  if (!database) throw new Error('Database not available');
  
  const conditions = [];
  if (startDate) conditions.push(gte(deliveries.createdAt, startDate));
  if (endDate) conditions.push(lte(deliveries.createdAt, endDate));
  
  const result = await database
    .select({
      status: deliveries.status,
      count: count(),
    })
    .from(deliveries)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .groupBy(deliveries.status);
  
  return result.map(r => ({
    status: r.status,
    count: Number(r.count),
  }));
}

export async function getRecentActivity(limit: number = 10) {
  const database = await getDb();
  if (!database) throw new Error('Database not available');
  
  // Get recent tenders
  const recentTenders = await database
    .select({
      type: sql<string>`'tender'`,
      reference: tenders.referenceNumber,
      status: tenders.status,
      createdAt: tenders.createdAt,
    })
    .from(tenders)
    .orderBy(sql`${tenders.createdAt} DESC`)
    .limit(limit);
  
  // Get recent invoices
  const recentInvoices = await database
    .select({
      type: sql<string>`'invoice'`,
      reference: invoices.invoiceNumber,
      status: invoices.status,
      createdAt: invoices.issueDate,
    })
    .from(invoices)
    .orderBy(sql`${invoices.issueDate} DESC`)
    .limit(limit);
  
  // Get recent POs
  const recentPOs = await database
    .select({
      type: sql<string>`'po'`,
      reference: purchaseOrders.poNumber,
      status: purchaseOrders.status,
      createdAt: purchaseOrders.issueDate,
    })
    .from(purchaseOrders)
    .orderBy(sql`${purchaseOrders.issueDate} DESC`)
    .limit(limit);
  
  // Get recent expenses
  const recentExpenses = await database
    .select({
      type: sql<string>`'expense'`,
      reference: expenses.expenseNumber,
      status: expenses.status,
      createdAt: expenses.createdAt,
    })
    .from(expenses)
    .orderBy(sql`${expenses.createdAt} DESC`)
    .limit(limit);
  
  // Get recent deliveries
  const recentDeliveries = await database
    .select({
      type: sql<string>`'delivery'`,
      reference: deliveries.deliveryNumber,
      status: deliveries.status,
      createdAt: deliveries.createdAt,
    })
    .from(deliveries)
    .orderBy(sql`${deliveries.createdAt} DESC`)
    .limit(limit);
  
  // Combine and sort all activities
  const allActivities = [
    ...recentTenders,
    ...recentInvoices,
    ...recentPOs,
    ...recentExpenses,
    ...recentDeliveries,
  ];
  
  return allActivities
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}
