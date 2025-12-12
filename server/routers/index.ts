/**
 * Router Index - Combines all feature routers into the main appRouter
 *
 * Each router is split into its own file for maintainability.
 * Domain-driven organization with clear separation of concerns.
 */

// Core routers
export { authRouter } from "./auth.router";
export { usersRouter } from "./users.router";
export { departmentsRouter } from "./departments.router";

// Business domain routers
export { budgetsRouter } from "./budgets.router";
export { tendersRouter } from "./tenders.router";
export { inventoryRouter } from "./inventory.router";
export { invoicesRouter } from "./invoices.router";
export { expensesRouter } from "./expenses.router";
export { deliveriesRouter } from "./deliveries.router";
export { suppliersRouter } from "./suppliers.router";
export { customersRouter } from "./customers.router";
export { productsRouter } from "./products.router";
export { requirementsRouter } from "./requirements.router";
export { purchaseOrdersRouter } from "./purchaseOrders.router";

// Tender-related routers
export { tenderTemplatesRouter } from "./tenderTemplates.router";
export { tenderOCRRouter } from "./tenderOCR.router";
export { tenderMatchRouter } from "./tenderMatch.router";

// Document and file management
export { documentsRouter } from "./documents.router";
export { filesRouter } from "./files.router";
export { exportRouter } from "./export.router";

// AI and analytics
export { aiRouter } from "./ai.router";
export { analyticsRouter } from "./analytics.router";

// Operations
export { notificationsRouter } from "./notifications.router";
export { tasksRouter } from "./tasks.router";
export { taskManagementRouter } from "./taskManagement.router";
export { auditLogsRouter } from "./auditLogs.router";
export { settingsRouter } from "./settings.router";

// Sales and CRM
export { opportunitiesRouter } from "./opportunities.router";
export { commissionsRouter } from "./commissions.router";

// HR and supplier management
export { hrRouter } from "./hr.router";
export { supplierCatalogRouter } from "./supplierCatalog.router";

// Shared utilities
export { adminProcedure, checkPermission } from "./shared";
