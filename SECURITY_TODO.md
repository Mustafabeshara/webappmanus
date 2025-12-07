# Security Implementation TODO

## Phase 1: Apply Permission Middleware to All Router Endpoints

### Tenders Module
- [ ] tenders.list - view permission
- [ ] tenders.get - view permission
- [ ] tenders.create - create permission
- [ ] tenders.update - edit permission
- [ ] tenders.delete - delete permission
- [ ] tenders.updateStatus - edit permission
- [ ] tenders.award - approve permission

### Budgets Module
- [ ] budgets.list - view permission
- [ ] budgets.get - view permission
- [ ] budgets.create - create permission
- [ ] budgets.update - edit permission
- [ ] budgets.delete - delete permission
- [ ] budgets.approve - approve permission

### Inventory Module
- [ ] inventory.list - view permission
- [ ] inventory.get - view permission
- [ ] inventory.create - create permission
- [ ] inventory.update - edit permission
- [ ] inventory.delete - delete permission
- [ ] inventory.restock - edit permission

### Suppliers Module
- [ ] suppliers.list - view permission
- [ ] suppliers.get - view permission
- [ ] suppliers.create - create permission
- [ ] suppliers.update - edit permission
- [ ] suppliers.delete - delete permission

### Customers Module
- [ ] customers.list - view permission
- [ ] customers.get - view permission
- [ ] customers.create - create permission
- [ ] customers.update - edit permission
- [ ] customers.delete - delete permission

### Invoices Module
- [ ] invoices.list - view permission
- [ ] invoices.get - view permission
- [ ] invoices.create - create permission
- [ ] invoices.update - edit permission
- [ ] invoices.delete - delete permission
- [ ] invoices.updateStatus - edit permission

### Purchase Orders Module
- [ ] purchaseOrders.list - view permission
- [ ] purchaseOrders.get - view permission
- [ ] purchaseOrders.create - create permission
- [ ] purchaseOrders.update - edit permission
- [ ] purchaseOrders.delete - delete permission
- [ ] purchaseOrders.updateStatus - edit permission
- [ ] purchaseOrders.approve - approve permission

### Expenses Module
- [ ] expenses.list - view permission
- [ ] expenses.get - view permission
- [ ] expenses.create - create permission
- [ ] expenses.update - edit permission
- [ ] expenses.delete - delete permission
- [ ] expenses.approve - approve permission
- [ ] expenses.bulkImport - create permission

### Deliveries Module
- [ ] deliveries.list - view permission
- [ ] deliveries.get - view permission
- [ ] deliveries.create - create permission
- [ ] deliveries.update - edit permission
- [ ] deliveries.delete - delete permission
- [ ] deliveries.updateStatus - edit permission

### Tasks Module
- [ ] tasks.list - view permission
- [ ] tasks.get - view permission
- [ ] tasks.create - create permission
- [ ] tasks.update - edit permission
- [ ] tasks.delete - delete permission
- [ ] tasks.updateStatus - edit permission

## Phase 2: Add IDOR Prevention

### High Priority (User-Created Resources)
- [ ] tenders.get - check createdBy or departmentId
- [ ] tenders.update - check createdBy or departmentId
- [ ] tenders.delete - check createdBy or departmentId
- [ ] budgets.get - check createdBy or departmentId
- [ ] budgets.update - check createdBy or departmentId
- [ ] budgets.delete - check createdBy or departmentId
- [ ] expenses.get - check createdBy or departmentId
- [ ] expenses.update - check createdBy or departmentId
- [ ] expenses.delete - check createdBy or departmentId
- [ ] tasks.get - check createdBy or assigneeId
- [ ] tasks.update - check createdBy or assigneeId
- [ ] tasks.delete - check createdBy

### Medium Priority (Department Resources)
- [ ] purchaseOrders.get - check departmentId
- [ ] purchaseOrders.update - check departmentId
- [ ] purchaseOrders.delete - check departmentId
- [ ] deliveries.get - check departmentId
- [ ] deliveries.update - check departmentId
- [ ] deliveries.delete - check departmentId

### Low Priority (Shared Resources)
- [ ] inventory.get - admin or department check
- [ ] inventory.update - admin or department check
- [ ] suppliers.get - no IDOR check (shared resource)
- [ ] customers.get - no IDOR check (shared resource)
- [ ] invoices.get - check customerId or departmentId

## Phase 3: Implement Audit Logging

### User Management Operations
- [ ] users.updateRole - log role changes
- [ ] users.updatePermissions - log permission changes
- [ ] users.updateDepartment - log department changes

### Approval Operations
- [ ] budgets.approve - log approval/rejection with reason
- [ ] expenses.approve - log approval/rejection with reason
- [ ] purchaseOrders.approve - log approval/rejection with reason
- [ ] tenders.award - log tender award decision

### Sensitive Data Updates
- [ ] suppliers.update - log if taxId or creditLimit changed
- [ ] customers.update - log if taxId or creditLimit changed
- [ ] budgets.update - log if allocatedAmount changed significantly
- [ ] expenses.update - log if amount changed after creation

### Critical Operations
- [ ] tenders.delete - log tender deletion
- [ ] budgets.delete - log budget deletion
- [ ] expenses.delete - log expense deletion
- [ ] purchaseOrders.delete - log PO deletion

## Phase 4: Testing

- [ ] Test permission enforcement (try accessing without permission)
- [ ] Test IDOR prevention (try accessing another user's resource)
- [ ] Test audit logging (verify logs are created)
- [ ] Test with admin role (should have full access)
- [ ] Test with user role (should have limited access)
- [ ] Verify no TypeScript errors
- [ ] Verify server starts successfully
- [ ] Create final checkpoint
