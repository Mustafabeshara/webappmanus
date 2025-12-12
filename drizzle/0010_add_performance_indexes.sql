-- Migration: Add performance indexes for high-traffic queries
-- These indexes optimize common queries identified in code review

-- ============================================
-- USER & PERMISSION INDEXES
-- ============================================

-- Users: email lookup for login
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Users: openId lookup (auth flow)
-- Note: openId is already unique, so has implicit index

-- User permissions: find permissions by user
CREATE INDEX IF NOT EXISTS idx_user_permissions_userId ON user_permissions(userId);

-- User permissions: module-based permission checks
CREATE INDEX IF NOT EXISTS idx_user_permissions_module ON user_permissions(module);

-- ============================================
-- TENDER INDEXES (High traffic)
-- ============================================

-- Tenders: status filtering (very common)
CREATE INDEX IF NOT EXISTS idx_tenders_status ON tenders(status);

-- Tenders: date-based queries (submission deadline)
CREATE INDEX IF NOT EXISTS idx_tenders_submission_deadline ON tenders(submissionDeadline);

-- Tenders: customer and department filtering
CREATE INDEX IF NOT EXISTS idx_tenders_customerId ON tenders(customerId);
CREATE INDEX IF NOT EXISTS idx_tenders_departmentId ON tenders(departmentId);

-- Tender items: lookup by tender
CREATE INDEX IF NOT EXISTS idx_tender_items_tenderId ON tender_items(tenderId);

-- Tender participants: lookup by tender
CREATE INDEX IF NOT EXISTS idx_tender_participants_tenderId ON tender_participants(tenderId);
CREATE INDEX IF NOT EXISTS idx_tender_participants_supplierId ON tender_participants(supplierId);

-- ============================================
-- BUDGET & EXPENSE INDEXES
-- ============================================

-- Budgets: fiscal year queries
CREATE INDEX IF NOT EXISTS idx_budgets_fiscalYear ON budgets(fiscalYear);

-- Budgets: department filtering
CREATE INDEX IF NOT EXISTS idx_budgets_departmentId ON budgets(departmentId);

-- Budgets: status filtering
CREATE INDEX IF NOT EXISTS idx_budgets_status ON budgets(status);

-- Expenses: budget allocation lookup
CREATE INDEX IF NOT EXISTS idx_expenses_budgetId ON expenses(budgetId);

-- Expenses: status filtering
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);

-- Expenses: date range queries
CREATE INDEX IF NOT EXISTS idx_expenses_expenseDate ON expenses(expenseDate);

-- ============================================
-- INVOICE INDEXES
-- ============================================

-- Invoices: customer lookup
CREATE INDEX IF NOT EXISTS idx_invoices_customerId ON invoices(customerId);

-- Invoices: status filtering (important for overdue tracking)
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- Invoices: due date for overdue queries
CREATE INDEX IF NOT EXISTS idx_invoices_dueDate ON invoices(dueDate);

-- Invoice items: lookup by invoice
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoiceId ON invoice_items(invoiceId);

-- ============================================
-- INVENTORY & PRODUCT INDEXES
-- ============================================

-- Products: category filtering
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- Products: manufacturer lookup
CREATE INDEX IF NOT EXISTS idx_products_manufacturerId ON products(manufacturerId);

-- Inventory: product lookup (critical for stock checks)
CREATE INDEX IF NOT EXISTS idx_inventory_productId ON inventory(productId);

-- Inventory: low stock alerts (quantity vs minStockLevel)
CREATE INDEX IF NOT EXISTS idx_inventory_quantity ON inventory(quantity);

-- Product sales: product analytics
CREATE INDEX IF NOT EXISTS idx_product_sales_productId ON product_sales(productId);

-- Product sales: date range queries
CREATE INDEX IF NOT EXISTS idx_product_sales_saleDate ON product_sales(saleDate);

-- Product forecasts: product lookup
CREATE INDEX IF NOT EXISTS idx_product_forecasts_productId ON product_forecasts(productId);

-- ============================================
-- SUPPLIER & CUSTOMER INDEXES
-- ============================================

-- Suppliers: active filtering
CREATE INDEX IF NOT EXISTS idx_suppliers_isActive ON suppliers(isActive);

-- Suppliers: compliance status
CREATE INDEX IF NOT EXISTS idx_suppliers_complianceStatus ON suppliers(complianceStatus);

-- Customers: active filtering
CREATE INDEX IF NOT EXISTS idx_customers_isActive ON customers(isActive);

-- Customers: type filtering
CREATE INDEX IF NOT EXISTS idx_customers_type ON customers(type);

-- Customer communications: customer lookup
CREATE INDEX IF NOT EXISTS idx_customer_communications_customerId ON customer_communications(customerId);

-- ============================================
-- DELIVERY INDEXES
-- ============================================

-- Deliveries: status filtering (tracking)
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status);

-- Deliveries: expected date (upcoming/overdue)
CREATE INDEX IF NOT EXISTS idx_deliveries_expectedDate ON deliveries(expectedDate);

-- Deliveries: purchase order lookup
CREATE INDEX IF NOT EXISTS idx_deliveries_purchaseOrderId ON deliveries(purchaseOrderId);

-- ============================================
-- REQUIREMENTS INDEXES
-- ============================================

-- Requirements: status workflow
CREATE INDEX IF NOT EXISTS idx_requirements_requests_status ON requirements_requests(status);

-- Requirements: department filtering
CREATE INDEX IF NOT EXISTS idx_requirements_requests_departmentId ON requirements_requests(departmentId);

-- Requirements: fiscal year
CREATE INDEX IF NOT EXISTS idx_requirements_requests_fiscalYear ON requirements_requests(fiscalYear);

-- Requirement items: request lookup
CREATE INDEX IF NOT EXISTS idx_requirement_items_requestId ON requirement_items(requestId);

-- Committee approvals: request lookup
CREATE INDEX IF NOT EXISTS idx_committee_approvals_requestId ON committee_approvals(requestId);

-- ============================================
-- NOTIFICATION INDEXES
-- ============================================

-- Notifications: user lookup (inbox)
CREATE INDEX IF NOT EXISTS idx_notifications_userId ON notifications(userId);

-- Notifications: read status (unread count)
CREATE INDEX IF NOT EXISTS idx_notifications_isRead ON notifications(isRead);

-- Compound index for common query: unread notifications for user
CREATE INDEX IF NOT EXISTS idx_notifications_userId_isRead ON notifications(userId, isRead);

-- ============================================
-- AUDIT LOG INDEXES
-- ============================================

-- Audit logs: user activity tracking
CREATE INDEX IF NOT EXISTS idx_audit_logs_userId ON audit_logs(userId);

-- Audit logs: timestamp for date range queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);

-- Audit logs: action type filtering
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- ============================================
-- DOCUMENT INDEXES
-- ============================================

-- Documents: entity lookup (polymorphic)
CREATE INDEX IF NOT EXISTS idx_documents_entityType_entityId ON documents(entityType, entityId);

-- Documents: uploaded by
CREATE INDEX IF NOT EXISTS idx_documents_uploadedBy ON documents(uploadedBy);

-- ============================================
-- TASK INDEXES
-- ============================================

-- Tasks: assignee lookup
CREATE INDEX IF NOT EXISTS idx_tasks_assignedTo ON tasks(assignedTo);

-- Tasks: status filtering
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

-- Tasks: due date for upcoming/overdue
CREATE INDEX IF NOT EXISTS idx_tasks_dueDate ON tasks(dueDate);

-- ============================================
-- PURCHASE ORDER INDEXES
-- ============================================

-- Purchase orders: supplier lookup
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplierId ON purchase_orders(supplierId);

-- Purchase orders: status filtering
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);

-- Purchase order items: order lookup
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_purchaseOrderId ON purchase_order_items(purchaseOrderId);
