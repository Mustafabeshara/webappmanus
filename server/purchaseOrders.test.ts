import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";

describe("Purchase Orders Module", () => {
  let testSupplierId: number;
  let testBudgetId: number;
  let testProductId: number;
  let testUserId: number;

  const mockContext = {
    user: { id: 1, openId: "test-user", name: "Test User", role: "admin" as const },
    req: {} as any,
    res: {} as any,
  };

  beforeAll(async () => {
    // Create test supplier with unique code
    const timestamp = Date.now();
    const supplierResult = await db.createSupplier({
      code: `SUP-POTEST-${timestamp}`,
      name: "Test Supplier for PO",
      contactPerson: "John Doe",
      email: "supplier@test.com",
      phone: "1234567890",
      address: "123 Test St",
      createdBy: 1,
    } as any);
    testSupplierId = Number(supplierResult.insertId);

    // Create test budget
    const budgetResult = await db.createBudget({
      name: "Test Budget for PO",
      fiscalYear: 2025,
      allocatedAmount: 100000000, // $1,000,000
      spentAmount: 0,
      categoryId: 1,
      departmentId: 1,
      startDate: new Date("2025-01-01"),
      endDate: new Date("2025-12-31"),
      status: "active",
      createdBy: 1,
    } as any);
    testBudgetId = Number(budgetResult.insertId);

    // Create test product
    const productResult = await db.createProduct({
      sku: `SKU-POTEST-${timestamp}`,
      name: "Test Product for PO",
      category: "Medical Supplies",
      unitPrice: 5000, // $50
      unit: "box",
      isActive: true,
      createdBy: 1,
    } as any);
    testProductId = Number(productResult.insertId);

    // Create inventory record for the product
    await db.createInventory({
      productId: testProductId,
      quantity: 100,
      minStockLevel: 10,
      location: "Warehouse A",
    } as any);

    testUserId = 1;
  });

  it("should create a purchase order with line items", async () => {
    const caller = appRouter.createCaller(mockContext);

    const result = await caller.purchaseOrders.create({
      supplierId: testSupplierId,
      budgetId: testBudgetId,
      deliveryDate: new Date("2025-02-01"),
      subtotal: 500000, // $5,000
      taxAmount: 50000, // $500
      totalAmount: 550000, // $5,500
      paymentTerms: "Net 30 days",
      deliveryAddress: "123 Hospital St, Medical District",
      notes: "Test PO creation",
      items: [
        {
          productId: testProductId,
          description: "Test Product for PO",
          quantity: 100,
          unitPrice: 5000,
          totalPrice: 500000,
        },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.poNumber).toMatch(/^PO-\d{6}-[A-Z0-9]{6}$/);
    expect(result.poId).toBeGreaterThan(0);

    // Verify PO was created
    const po = await db.getPurchaseOrderById(result.poId);
    expect(po).toBeTruthy();
    expect(po?.supplierId).toBe(testSupplierId);
    expect(po?.budgetId).toBe(testBudgetId);
    expect(po?.totalAmount).toBe(550000);
    expect(po?.status).toBe("draft");
    expect(po?.receivedStatus).toBe("not_received");

    // Verify line items were created
    const items = await db.getPurchaseOrderItems(result.poId);
    expect(items).toHaveLength(1);
    expect(items[0].productId).toBe(testProductId);
    expect(items[0].quantity).toBe(100);
    expect(items[0].unitPrice).toBe(5000);
    expect(items[0].receivedQuantity).toBe(0);
  });

  it("should approve a purchase order and update budget", async () => {
    const caller = appRouter.createCaller(mockContext);

    // Create PO
    const createResult = await caller.purchaseOrders.create({
      supplierId: testSupplierId,
      budgetId: testBudgetId,
      subtotal: 200000,
      taxAmount: 20000,
      totalAmount: 220000,
      items: [
        {
          description: "Test Item for Approval",
          quantity: 50,
          unitPrice: 4000,
          totalPrice: 200000,
        },
      ],
    });

    // Update status to submitted
    await caller.purchaseOrders.update({
      id: createResult.poId,
      status: "submitted",
    });

    // Get budget before approval
    const budgetBefore = await db.getBudgetById(testBudgetId);
    const spentBefore = budgetBefore?.spentAmount || 0;

    // Approve PO
    const approveResult = await caller.purchaseOrders.approve({
      id: createResult.poId,
      approved: true,
    });

    expect(approveResult.success).toBe(true);

    // Verify PO status updated
    const po = await db.getPurchaseOrderById(createResult.poId);
    expect(po?.status).toBe("approved");
    expect(po?.approvedBy).toBe(testUserId);
    expect(po?.approvedAt).toBeTruthy();

    // Verify budget spent amount updated
    const budgetAfter = await db.getBudgetById(testBudgetId);
    expect(budgetAfter?.spentAmount).toBe(spentBefore + 220000);
  });

  it("should reject a purchase order with reason", async () => {
    const caller = appRouter.createCaller(mockContext);

    // Create PO
    const createResult = await caller.purchaseOrders.create({
      supplierId: testSupplierId,
      subtotal: 100000,
      taxAmount: 10000,
      totalAmount: 110000,
      items: [
        {
          description: "Test Item for Rejection",
          quantity: 25,
          unitPrice: 4000,
          totalPrice: 100000,
        },
      ],
    });

    // Update status to submitted
    await caller.purchaseOrders.update({
      id: createResult.poId,
      status: "submitted",
    });

    // Reject PO
    const rejectResult = await caller.purchaseOrders.approve({
      id: createResult.poId,
      approved: false,
      rejectionReason: "Pricing too high, need to renegotiate",
    });

    expect(rejectResult.success).toBe(true);

    // Verify PO status and rejection reason
    const po = await db.getPurchaseOrderById(createResult.poId);
    expect(po?.status).toBe("rejected");
    expect(po?.rejectionReason).toBe("Pricing too high, need to renegotiate");
    expect(po?.approvedBy).toBe(testUserId);
  });

  it("should receive goods and update inventory", async () => {
    const caller = appRouter.createCaller(mockContext);

    // Create PO with product
    const createResult = await caller.purchaseOrders.create({
      supplierId: testSupplierId,
      subtotal: 250000,
      taxAmount: 25000,
      totalAmount: 275000,
      items: [
        {
          productId: testProductId,
          description: "Test Product for Goods Receipt",
          quantity: 50,
          unitPrice: 5000,
          totalPrice: 250000,
        },
      ],
    });

    // Approve PO
    await caller.purchaseOrders.update({
      id: createResult.poId,
      status: "approved",
    });

    // Get PO items
    const poItems = await db.getPurchaseOrderItems(createResult.poId);
    const poItemId = poItems[0].id;

    // Get inventory before receipt
    const inventoryBefore = await db.getInventoryByProduct(testProductId);
    const stockBefore = inventoryBefore[0]?.quantity || 0;

    // Receive goods
    const receiveResult = await caller.purchaseOrders.receiveGoods({
      poId: createResult.poId,
      items: [
        {
          poItemId,
          quantityReceived: 30,
          batchNumber: "BATCH-001",
          expiryDate: new Date("2026-12-31"),
          condition: "good",
          notes: "First partial delivery",
        },
      ],
      notes: "Partial goods receipt",
    });

    expect(receiveResult.success).toBe(true);
    expect(receiveResult.receiptNumber).toMatch(/^GRN-\d{6}-[A-Z0-9]{6}$/);

    // Verify PO item received quantity updated
    const updatedPoItems = await db.getPurchaseOrderItems(createResult.poId);
    expect(updatedPoItems[0].receivedQuantity).toBe(30);

    // Verify PO received status
    const po = await db.getPurchaseOrderById(createResult.poId);
    expect(po?.receivedStatus).toBe("partially_received");

    // Verify inventory updated
    const inventoryAfter = await db.getInventoryByProduct(testProductId);
    expect(inventoryAfter[0].quantity).toBe(stockBefore + 30);

    // Verify goods receipt created
    const receipts = await db.getGoodsReceipts(createResult.poId);
    expect(receipts).toHaveLength(1);
    expect(receipts[0].receiptNumber).toBe(receiveResult.receiptNumber);
    expect(receipts[0].receivedBy).toBe(testUserId);
  });

  it("should mark PO as completed when fully received", async () => {
    const caller = appRouter.createCaller(mockContext);

    // Create PO
    const createResult = await caller.purchaseOrders.create({
      supplierId: testSupplierId,
      subtotal: 100000,
      taxAmount: 10000,
      totalAmount: 110000,
      items: [
        {
          productId: testProductId,
          description: "Test Product for Full Receipt",
          quantity: 20,
          unitPrice: 5000,
          totalPrice: 100000,
        },
      ],
    });

    // Approve PO
    await caller.purchaseOrders.update({
      id: createResult.poId,
      status: "approved",
    });

    // Get PO items
    const poItems = await db.getPurchaseOrderItems(createResult.poId);
    const poItemId = poItems[0].id;

    // Receive all goods
    await caller.purchaseOrders.receiveGoods({
      poId: createResult.poId,
      items: [
        {
          poItemId,
          quantityReceived: 20,
          condition: "good",
        },
      ],
    });

    // Verify PO status
    const po = await db.getPurchaseOrderById(createResult.poId);
    expect(po?.receivedStatus).toBe("fully_received");
    expect(po?.status).toBe("completed");
    expect(po?.receivedDate).toBeTruthy();
  });

  it("should list all purchase orders", async () => {
    const caller = appRouter.createCaller(mockContext);

    const pos = await caller.purchaseOrders.list();

    expect(Array.isArray(pos)).toBe(true);
    expect(pos.length).toBeGreaterThan(0);
    expect(pos[0]).toHaveProperty("poNumber");
    expect(pos[0]).toHaveProperty("supplierId");
    expect(pos[0]).toHaveProperty("status");
    expect(pos[0]).toHaveProperty("receivedStatus");
  });

  it("should get purchase order details with items and receipts", async () => {
    const caller = appRouter.createCaller(mockContext);

    // Create PO
    const createResult = await caller.purchaseOrders.create({
      supplierId: testSupplierId,
      subtotal: 150000,
      taxAmount: 15000,
      totalAmount: 165000,
      items: [
        {
          description: "Test Item 1",
          quantity: 30,
          unitPrice: 5000,
          totalPrice: 150000,
        },
      ],
    });

    // Get PO details
    const details = await caller.purchaseOrders.get({ id: createResult.poId });

    expect(details.po).toBeTruthy();
    expect(details.po?.id).toBe(createResult.poId);
    expect(details.po?.poNumber).toBe(createResult.poNumber);
    expect(details.items).toHaveLength(1);
    expect(details.items[0].description).toBe("Test Item 1");
    expect(details.receipts).toBeDefined();
  });
});
