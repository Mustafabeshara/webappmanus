/**
 * Main Application Router
 * Combines all domain-specific routers into a single tRPC router
 *
 * This file replaces the monolithic routers.ts by importing
 * domain-specific routers from the /routers directory.
 */

import { systemRouter } from "./_core/systemRouter";
import { router } from "./_core/trpc";

// Import all domain routers
import {
  authRouter,
  usersRouter,
  departmentsRouter,
  budgetsRouter,
  tendersRouter,
  inventoryRouter,
  invoicesRouter,
  expensesRouter,
  deliveriesRouter,
  suppliersRouter,
  customersRouter,
  productsRouter,
  requirementsRouter,
  purchaseOrdersRouter,
  tenderTemplatesRouter,
  tenderOCRRouter,
  tenderMatchRouter,
  documentsRouter,
  filesRouter,
  exportRouter,
  aiRouter,
  analyticsRouter,
  notificationsRouter,
  tasksRouter,
  taskManagementRouter,
  auditLogsRouter,
  settingsRouter,
  opportunitiesRouter,
  commissionsRouter,
  hrRouter,
  supplierCatalogRouter,
} from "./routers";

/**
 * Main application router that combines all feature routers
 * Each router is responsible for its own domain logic
 */
export const appRouter = router({
  // System health and diagnostics
  system: systemRouter,

  // Core authentication and user management
  auth: authRouter,
  users: usersRouter,
  departments: departmentsRouter,

  // Budget and financial management
  budgets: budgetsRouter,
  expenses: expensesRouter,
  invoices: invoicesRouter,

  // Procurement and tender management
  tenders: tendersRouter,
  tenderTemplates: tenderTemplatesRouter,
  tenderOCR: tenderOCRRouter,
  tenderMatch: tenderMatchRouter,
  requirements: requirementsRouter,
  purchaseOrders: purchaseOrdersRouter,

  // Inventory and product management
  inventory: inventoryRouter,
  products: productsRouter,

  // Supplier and customer relations
  suppliers: suppliersRouter,
  supplierCatalog: supplierCatalogRouter,
  customers: customersRouter,

  // Logistics and delivery
  deliveries: deliveriesRouter,

  // Documents and files
  documents: documentsRouter,
  files: filesRouter,
  export: exportRouter,

  // AI and analytics
  ai: aiRouter,
  analytics: analyticsRouter,

  // Operations and notifications
  notifications: notificationsRouter,
  tasks: tasksRouter,
  taskManagement: taskManagementRouter,
  auditLogs: auditLogsRouter,
  settings: settingsRouter,

  // Sales and CRM
  opportunities: opportunitiesRouter,
  commissions: commissionsRouter,

  // HR management
  hr: hrRouter,
});

export type AppRouter = typeof appRouter;
