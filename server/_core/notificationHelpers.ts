import * as db from "../db";

/**
 * Helper functions for creating notifications across the application
 */

// Expense notifications
export async function notifyExpenseSubmitted(expenseId: number, submitterId: number, approverIds: number[]) {
  const expense = await db.getExpenseById(expenseId);
  if (!expense) return;

  for (const approverId of approverIds) {
    if (approverId !== submitterId) {
      await db.createNotification({
        userId: approverId,
        title: "New Expense Awaiting Approval",
        message: `${expense.title} - $${expense.amount} requires your approval`,
        type: "approval_request",
        entityType: "expenses",
        entityId: expenseId,
        isRead: false,
      });
    }
  }
}

export async function notifyExpenseApproved(expenseId: number, submitterId: number, approverName: string) {
  const expense = await db.getExpenseById(expenseId);
  if (!expense) return;

  await db.createNotification({
    userId: submitterId,
    title: "Expense Approved",
    message: `Your expense "${expense.title}" has been approved by ${approverName}`,
    type: "approval_granted",
    entityType: "expenses",
    entityId: expenseId,
    isRead: false,
  });
}

export async function notifyExpenseRejected(expenseId: number, submitterId: number, approverName: string, reason?: string) {
  const expense = await db.getExpenseById(expenseId);
  if (!expense) return;

  await db.createNotification({
    userId: submitterId,
    title: "Expense Rejected",
    message: `Your expense "${expense.title}" was rejected by ${approverName}${reason ? `: ${reason}` : ''}`,
    type: "approval_denied",
    entityType: "expenses",
    entityId: expenseId,
    isRead: false,
  });
}

// Budget notifications
export async function notifyBudgetExceeded(budgetId: number, utilization: number) {
  const budget = await db.getBudgetById(budgetId);
  if (!budget) return;

  // Notify budget owner and admins
  const admins = await db.getAllUsers({ role: 'admin' });
  
  for (const admin of admins) {
    await db.createNotification({
      userId: admin.id,
      title: utilization >= 100 ? "Budget Exceeded!" : "Budget Alert",
      message: `Budget "${budget.name}" is at ${utilization.toFixed(1)}% utilization`,
      type: utilization >= 100 ? "alert" : "warning",
        entityType: "budgets",
        entityId: budgetId,
      isRead: false,
    });
  }
}

// Inventory notifications
export async function notifyLowStock(inventoryId: number) {
  const item = await db.getInventoryById(inventoryId);
  if (!item) return;

  // Notify admins and inventory managers
  const admins = await db.getAllUsers({ role: 'admin' });
  
  for (const admin of admins) {
    await db.createNotification({
      userId: admin.id,
      title: "Low Stock Alert",
      message: `Inventory item (ID: ${inventoryId}) is below reorder level (Current: ${item.quantity}, Min: ${item.minStockLevel})`,
      type: "warning",
        entityType: "inventory",
        entityId: inventoryId,
      isRead: false,
    });
  }
}

// Task notifications
export async function notifyTaskAssigned(taskId: number, assigneeId: number, assignerName: string) {
  const task = await db.getTaskById(taskId);
  if (!task) return;

  await db.createNotification({
    userId: assigneeId,
    title: "New Task Assigned",
    message: `${assignerName} assigned you: "${task.title}"`,
    type: "task_assigned",
        entityType: "tasks",
        entityId: taskId,
    isRead: false,
  });
}

export async function notifyTaskStatusChanged(taskId: number, previousAssigneeId: number | null, newStatus: string, changerName: string) {
  const task = await db.getTaskById(taskId);
  if (!task || !previousAssigneeId) return;

  await db.createNotification({
    userId: previousAssigneeId,
    title: "Task Status Updated",
    message: `${changerName} changed "${task.title}" status to ${newStatus}`,
    type: "info",
    entityType: "tasks",
    entityId: taskId,
    isRead: false,
  });
}

// Purchase Order notifications
export async function notifyPONeedsApproval(poId: number, submitterId: number, approverIds: number[]) {
  const po = await db.getPurchaseOrderById(poId);
  if (!po) return;

  for (const approverId of approverIds) {
    if (approverId !== submitterId) {
      await db.createNotification({
        userId: approverId,
        title: "Purchase Order Awaiting Approval",
        message: `PO ${po.poNumber} - $${po.totalAmount} requires your approval`,
        type: "approval_request",
        entityType: "purchase_orders",
        entityId: poId,
        isRead: false,
      });
    }
  }
}

// Delivery notifications
export async function notifyDeliveryStatusChanged(deliveryId: number, newStatus: string) {
  const delivery = await db.getDeliveryById(deliveryId);
  if (!delivery) return;

  // Notify relevant users (customer contact, admins)
  const admins = await db.getAllUsers({ role: 'admin' });
  
  for (const admin of admins) {
    await db.createNotification({
      userId: admin.id,
      title: "Delivery Status Updated",
      message: `Delivery ${delivery.deliveryNumber} is now ${newStatus}`,
      type: "info",
        entityType: "deliveries",
        entityId: deliveryId,
      isRead: false,
    });
  }
}

// Invoice notifications
export async function notifyInvoiceOverdue(invoiceId: number) {
  const invoice = await db.getInvoiceById(invoiceId);
  if (!invoice) return;

  // Notify admins and finance team
  const admins = await db.getAllUsers({ role: 'admin' });
  
  for (const admin of admins) {
    await db.createNotification({
      userId: admin.id,
      title: "Invoice Overdue",
      message: `Invoice ${invoice.invoiceNumber} is overdue (Due: ${invoice.dueDate.toLocaleDateString()})`,
      type: "alert",
        entityType: "invoices",
        entityId: invoiceId,
      isRead: false,
    });
  }
}
