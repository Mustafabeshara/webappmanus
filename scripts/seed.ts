import "dotenv/config";
import { SQL, and, eq } from "drizzle-orm";
import { AnyMySqlColumn, AnyMySqlTable } from "drizzle-orm/mysql-core";
import { drizzle } from "drizzle-orm/mysql2";
import {
  budgetCategories,
  budgets,
  customers,
  departments,
  documentFolders,
  documents,
  expenses,
  inventory,
  invoiceItems,
  invoices,
  products,
  suppliers,
  tasks,
  users,
} from "../drizzle/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required to run seeding");
}

// Use connection string directly for simplicity in seed scripts
const db = drizzle(process.env.DATABASE_URL);

async function ensureRecord({
  table,
  idColumn,
  where,
  values,
  label,
}: {
  table: AnyMySqlTable;
  idColumn: AnyMySqlColumn;
  where: SQL | ReturnType<typeof and> | ReturnType<typeof eq>;
  values: Record<string, unknown>;
  label: string;
}) {
  const existing = await db
    .select({ id: idColumn })
    .from(table)
    .where(where as SQL)
    .limit(1);

  if (existing.length) {
    console.info(`✓ ${label} exists`);
    return existing[0].id as number;
  }

  await db.insert(table).values(values);

  const created = await db
    .select({ id: idColumn })
    .from(table)
    .where(where as SQL)
    .limit(1);

  console.info(`+ ${label} created`);
  return created[0].id as number;
}

async function main() {
  // Core users
  const adminId = await ensureRecord({
    table: users,
    idColumn: users.id,
    where: eq(users.openId, "seed-admin"),
    values: {
      openId: "seed-admin",
      name: "Seed Admin",
      email: "admin@example.com",
      role: "admin",
    },
    label: "user: seed-admin",
  });

  const opsUserId = await ensureRecord({
    table: users,
    idColumn: users.id,
    where: eq(users.openId, "seed-ops"),
    values: {
      openId: "seed-ops",
      name: "Operations Lead",
      email: "ops@example.com",
      role: "user",
    },
    label: "user: seed-ops",
  });

  // Departments
  const opsDeptId = await ensureRecord({
    table: departments,
    idColumn: departments.id,
    where: eq(departments.code, "OPS"),
    values: {
      name: "Operations",
      code: "OPS",
      description: "Operations and logistics",
      managerId: adminId,
    },
    label: "department: OPS",
  });

  const clinicalDeptId = await ensureRecord({
    table: departments,
    idColumn: departments.id,
    where: eq(departments.code, "CLIN"),
    values: {
      name: "Clinical Engineering",
      code: "CLIN",
      description: "Clinical and biomedical engineering",
      managerId: opsUserId,
    },
    label: "department: CLIN",
  });

  // Budget categories (aligns with existing budget seed)
  const opsCategoryId = await ensureRecord({
    table: budgetCategories,
    idColumn: budgetCategories.id,
    where: eq(budgetCategories.code, "OPS"),
    values: {
      name: "Operations",
      code: "OPS",
      description: "Operational expenses",
    },
    label: "budget category: OPS",
  });

  const itCategoryId = await ensureRecord({
    table: budgetCategories,
    idColumn: budgetCategories.id,
    where: eq(budgetCategories.code, "IT"),
    values: {
      name: "IT & Technology",
      code: "IT",
      description: "Information technology and software",
    },
    label: "budget category: IT",
  });

  // Budgets
  const opsBudgetId = await ensureRecord({
    table: budgets,
    idColumn: budgets.id,
    where: and(
      eq(budgets.name, "Operations 2025"),
      eq(budgets.fiscalYear, 2025)
    ),
    values: {
      name: "Operations 2025",
      categoryId: opsCategoryId,
      departmentId: opsDeptId,
      fiscalYear: 2025,
      allocatedAmount: 50_000_000,
      spentAmount: 12_000_000,
      status: "active",
      approvalStatus: "approved",
      approvedBy: adminId,
      approvedAt: new Date(),
      createdBy: adminId,
      notes: "Ops allocation for logistics and services",
    },
    label: "budget: Operations 2025",
  });

  const itBudgetId = await ensureRecord({
    table: budgets,
    idColumn: budgets.id,
    where: and(
      eq(budgets.name, "IT Modernization 2025"),
      eq(budgets.fiscalYear, 2025)
    ),
    values: {
      name: "IT Modernization 2025",
      categoryId: itCategoryId,
      departmentId: clinicalDeptId,
      fiscalYear: 2025,
      allocatedAmount: 30_000_000,
      spentAmount: 9_000_000,
      status: "active",
      approvalStatus: "approved",
      approvedBy: adminId,
      approvedAt: new Date(),
      createdBy: adminId,
      notes: "Refresh of clinical systems and device integrations",
    },
    label: "budget: IT Modernization 2025",
  });

  // Suppliers & customers
  const supplierId = await ensureRecord({
    table: suppliers,
    idColumn: suppliers.id,
    where: eq(suppliers.code, "SUP-ACME"),
    values: {
      code: "SUP-ACME",
      name: "ACME Med Supply",
      contactPerson: "Dana Carter",
      email: "dana@acme-med.example.com",
      phone: "+1-555-123-0001",
      address: "100 Industry Park, Springfield",
      complianceStatus: "compliant",
      rating: 5,
      createdBy: adminId,
    },
    label: "supplier: SUP-ACME",
  });

  const customerId = await ensureRecord({
    table: customers,
    idColumn: customers.id,
    where: eq(customers.code, "CUST-HOSP-1"),
    values: {
      code: "CUST-HOSP-1",
      name: "Metro Health Hospital",
      type: "hospital",
      contactPerson: "Dr. Samir Patel",
      email: "samir.patel@metrohealth.example.com",
      phone: "+1-555-222-0101",
      address: "200 Healthcare Ave, Capital City",
      creditLimit: 75_000_000,
      createdBy: adminId,
    },
    label: "customer: CUST-HOSP-1",
  });

  // Products and inventory
  const monitorProductId = await ensureRecord({
    table: products,
    idColumn: products.id,
    where: eq(products.sku, "MON-100"),
    values: {
      sku: "MON-100",
      name: "Vital Signs Monitor",
      description: "Multi-parameter monitor with SpO2 and NIBP",
      category: "Equipment",
      manufacturerId: supplierId,
      unitPrice: 480_000,
      unit: "unit",
      specifications: JSON.stringify({
        params: ["SpO2", "NIBP", "ECG"],
        screen: "12in",
      }),
      createdBy: adminId,
    },
    label: "product: MON-100",
  });

  const syringeProductId = await ensureRecord({
    table: products,
    idColumn: products.id,
    where: eq(products.sku, "SYN-10ML"),
    values: {
      sku: "SYN-10ML",
      name: "Syringe 10ml",
      description: "Sterile single-use 10ml syringe",
      category: "Medical Supplies",
      manufacturerId: supplierId,
      unitPrice: 12_000,
      unit: "box",
      specifications: JSON.stringify({ pack: 100, sterile: true }),
      createdBy: adminId,
    },
    label: "product: SYN-10ML",
  });

  const pumpProductId = await ensureRecord({
    table: products,
    idColumn: products.id,
    where: eq(products.sku, "INF-200"),
    values: {
      sku: "INF-200",
      name: "Infusion Pump",
      description: "Smart infusion pump with drug library",
      category: "Equipment",
      manufacturerId: supplierId,
      unitPrice: 620_000,
      unit: "unit",
      specifications: JSON.stringify({ battery: "8h", connectivity: "WiFi" }),
      createdBy: adminId,
    },
    label: "product: INF-200",
  });

  await ensureRecord({
    table: inventory,
    idColumn: inventory.id,
    where: and(
      eq(inventory.productId, monitorProductId),
      eq(inventory.location, "Central Store")
    ),
    values: {
      productId: monitorProductId,
      quantity: 8,
      batchNumber: "MON-LOT-2401",
      expiryDate: new Date("2026-12-31T00:00:00Z"),
      location: "Central Store",
      minStockLevel: 2,
      maxStockLevel: 12,
      lastRestocked: new Date("2025-02-01T00:00:00Z"),
    },
    label: "inventory: MON-100 @ Central Store",
  });

  await ensureRecord({
    table: inventory,
    idColumn: inventory.id,
    where: and(
      eq(inventory.productId, syringeProductId),
      eq(inventory.location, "Ward A")
    ),
    values: {
      productId: syringeProductId,
      quantity: 250,
      batchNumber: "SYN-LOT-2502",
      expiryDate: new Date("2027-03-31T00:00:00Z"),
      location: "Ward A",
      minStockLevel: 100,
      maxStockLevel: 400,
      lastRestocked: new Date("2025-01-18T00:00:00Z"),
    },
    label: "inventory: SYN-10ML @ Ward A",
  });

  await ensureRecord({
    table: inventory,
    idColumn: inventory.id,
    where: and(
      eq(inventory.productId, pumpProductId),
      eq(inventory.location, "ICU")
    ),
    values: {
      productId: pumpProductId,
      quantity: 4,
      batchNumber: "INF-LOT-2312",
      expiryDate: new Date("2026-06-30T00:00:00Z"),
      location: "ICU",
      minStockLevel: 1,
      maxStockLevel: 6,
      lastRestocked: new Date("2025-01-05T00:00:00Z"),
    },
    label: "inventory: INF-200 @ ICU",
  });

  // Invoices & items
  const invoiceId = await ensureRecord({
    table: invoices,
    idColumn: invoices.id,
    where: eq(invoices.invoiceNumber, "INV-2025-001"),
    values: {
      invoiceNumber: "INV-2025-001",
      customerId,
      issueDate: new Date("2025-02-10T00:00:00Z"),
      dueDate: new Date("2025-03-10T00:00:00Z"),
      subtotal: 1_560_000,
      taxAmount: 78_000,
      totalAmount: 1_638_000,
      paidAmount: 819_000,
      status: "sent",
      paymentTerms: "Net 30",
      notes: "Partial payment received",
      createdBy: opsUserId,
    },
    label: "invoice: INV-2025-001",
  });

  await ensureRecord({
    table: invoiceItems,
    idColumn: invoiceItems.id,
    where: and(
      eq(invoiceItems.invoiceId, invoiceId),
      eq(invoiceItems.description, "Vital Signs Monitor")
    ),
    values: {
      invoiceId,
      productId: monitorProductId,
      description: "Vital Signs Monitor",
      quantity: 2,
      unitPrice: 480_000,
      totalPrice: 960_000,
    },
    label: "invoice item: monitor",
  });

  await ensureRecord({
    table: invoiceItems,
    idColumn: invoiceItems.id,
    where: and(
      eq(invoiceItems.invoiceId, invoiceId),
      eq(invoiceItems.description, "Syringe 10ml boxes")
    ),
    values: {
      invoiceId,
      productId: syringeProductId,
      description: "Syringe 10ml boxes",
      quantity: 50,
      unitPrice: 12_000,
      totalPrice: 600_000,
    },
    label: "invoice item: syringes",
  });

  // Expenses
  await ensureRecord({
    table: expenses,
    idColumn: expenses.id,
    where: eq(expenses.expenseNumber, "EXP-OPS-001"),
    values: {
      expenseNumber: "EXP-OPS-001",
      title: "Fleet maintenance",
      description: "Quarterly preventive maintenance for vehicles",
      categoryId: opsCategoryId,
      budgetId: opsBudgetId,
      departmentId: opsDeptId,
      amount: 1_850_000,
      expenseDate: new Date("2025-02-05T00:00:00Z"),
      status: "approved",
      approvalLevel: 1,
      approvedBy: adminId,
      approvedAt: new Date("2025-02-06T00:00:00Z"),
      notes: "Vendor ACME Auto",
      createdBy: opsUserId,
    },
    label: "expense: EXP-OPS-001",
  });

  const itExpenseId = await ensureRecord({
    table: expenses,
    idColumn: expenses.id,
    where: eq(expenses.expenseNumber, "EXP-IT-001"),
    values: {
      expenseNumber: "EXP-IT-001",
      title: "Cloud subscription",
      description: "Q1 SaaS renewals for clinical systems",
      categoryId: itCategoryId,
      budgetId: itBudgetId,
      departmentId: clinicalDeptId,
      amount: 2_200_000,
      expenseDate: new Date("2025-01-20T00:00:00Z"),
      status: "pending",
      approvalLevel: 0,
      notes: "Awaiting approval",
      createdBy: adminId,
    },
    label: "expense: EXP-IT-001",
  });

  // Document folders and documents
  const invoiceFolderId = await ensureRecord({
    table: documentFolders,
    idColumn: documentFolders.id,
    where: and(
      eq(documentFolders.name, "Invoices"),
      eq(documentFolders.category, "billing")
    ),
    values: {
      name: "Invoices",
      category: "billing",
      requiredDocuments: JSON.stringify(["invoice", "po", "delivery_note"]),
      reminderEnabled: true,
      createdBy: adminId,
    },
    label: "document folder: Invoices",
  });

  await ensureRecord({
    table: documents,
    idColumn: documents.id,
    where: and(
      eq(documents.entityType, "invoice"),
      eq(documents.entityId, invoiceId)
    ),
    values: {
      folderId: invoiceFolderId,
      entityType: "invoice",
      entityId: invoiceId,
      fileName: "INV-2025-001.pdf",
      fileKey: "invoices/INV-2025-001.pdf",
      fileUrl:
        "https://example-bucket.s3.amazonaws.com/invoices/INV-2025-001.pdf",
      fileSize: 120_000,
      mimeType: "application/pdf",
      documentType: "invoice",
      version: 1,
      status: "completed",
      extractionStatus: "reviewed",
      uploadedBy: opsUserId,
    },
    label: "document: invoice pdf",
  });

  // Tasks
  await ensureRecord({
    table: tasks,
    idColumn: tasks.id,
    where: eq(tasks.title, "Collect delivery note for INV-2025-001"),
    values: {
      title: "Collect delivery note for INV-2025-001",
      description: "Awaiting delivery paperwork from Metro Health",
      status: "in_progress",
      priority: "high",
      assignedTo: opsUserId,
      relatedEntityType: "invoice",
      relatedEntityId: invoiceId,
      dueDate: new Date("2025-03-05"),
      createdBy: adminId,
    },
    label: "task: delivery note",
  });

  await ensureRecord({
    table: tasks,
    idColumn: tasks.id,
    where: eq(tasks.title, "Review cloud subscription renewal"),
    values: {
      title: "Review cloud subscription renewal",
      description: "Confirm scope and budget alignment for Q1 SaaS renewals",
      status: "todo",
      priority: "medium",
      assignedTo: adminId,
      departmentId: clinicalDeptId,
      relatedEntityType: "expense",
      relatedEntityId: itExpenseId,
      dueDate: new Date("2025-02-28"),
      createdBy: opsUserId,
    },
    label: "task: cloud renewal",
  });

  console.info("Seed complete");
}

try {
  await main();
  process.exit(0);
} catch (error) {
  console.error("Seeding failed", error);
  process.exit(1);
}
