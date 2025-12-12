import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { EXPORT_CONFIGS, generateExport } from "../export";

export const exportRouter = router({
  tenders: protectedProcedure
    .input(
      z.object({
        format: z.enum(["csv", "excel", "pdf"]),
      })
    )
    .mutation(async ({ input }) => {
      const tenders = await db.getAllTenders();
      const result = generateExport({
        format: input.format,
        filename: `tenders_${new Date().toISOString().split("T")[0]}`,
        title: "Tender Report",
        columns: EXPORT_CONFIGS.tenders.columns,
        data: tenders,
      });
      return result;
    }),

  budgets: protectedProcedure
    .input(
      z.object({
        format: z.enum(["csv", "excel", "pdf"]),
      })
    )
    .mutation(async ({ input }) => {
      const budgets = await db.getAllBudgets();
      const dataWithRemaining = budgets.map(b => ({
        ...b,
        remaining: b.allocatedAmount - b.spentAmount,
      }));
      const result = generateExport({
        format: input.format,
        filename: `budgets_${new Date().toISOString().split("T")[0]}`,
        title: "Budget Report",
        columns: EXPORT_CONFIGS.budgets.columns,
        data: dataWithRemaining,
      });
      return result;
    }),

  expenses: protectedProcedure
    .input(
      z.object({
        format: z.enum(["csv", "excel", "pdf"]),
      })
    )
    .mutation(async ({ input }) => {
      const expenses = await db.getAllExpenses();
      const result = generateExport({
        format: input.format,
        filename: `expenses_${new Date().toISOString().split("T")[0]}`,
        title: "Expense Report",
        columns: EXPORT_CONFIGS.expenses.columns,
        data: expenses,
      });
      return result;
    }),

  inventory: protectedProcedure
    .input(
      z.object({
        format: z.enum(["csv", "excel", "pdf"]),
      })
    )
    .mutation(async ({ input }) => {
      const inventory = await db.getAllInventory();
      const products = await db.getAllProducts();
      const productMap = new Map(products.map(p => [p.id, p]));

      // getAllInventory returns joined data with product info already included:
      // currentStock (not quantity), reorderLevel (not minStockLevel), id is product id
      const dataWithProducts = inventory.map(inv => ({
        ...inv,
        productName: inv.name || `Product #${inv.id}`,
        // sku is already included in joined data
      }));

      const result = generateExport({
        format: input.format,
        filename: `inventory_${new Date().toISOString().split("T")[0]}`,
        title: "Inventory Report",
        columns: EXPORT_CONFIGS.inventory.columns,
        data: dataWithProducts,
      });
      return result;
    }),

  invoices: protectedProcedure
    .input(
      z.object({
        format: z.enum(["csv", "excel", "pdf"]),
      })
    )
    .mutation(async ({ input }) => {
      const invoices = await db.getAllInvoices();
      const customers = await db.getAllCustomers();
      const customerMap = new Map(customers.map(c => [c.id, c]));

      const dataWithCustomers = invoices.map(inv => ({
        ...inv,
        customerName:
          customerMap.get(inv.customerId)?.name ||
          `Customer #${inv.customerId}`,
      }));

      const result = generateExport({
        format: input.format,
        filename: `invoices_${new Date().toISOString().split("T")[0]}`,
        title: "Invoice Report",
        columns: EXPORT_CONFIGS.invoices.columns,
        data: dataWithCustomers,
      });
      return result;
    }),

  suppliers: protectedProcedure
    .input(
      z.object({
        format: z.enum(["csv", "excel", "pdf"]),
      })
    )
    .mutation(async ({ input }) => {
      const suppliers = await db.getAllSuppliers();
      const result = generateExport({
        format: input.format,
        filename: `suppliers_${new Date().toISOString().split("T")[0]}`,
        title: "Supplier Report",
        columns: EXPORT_CONFIGS.suppliers.columns,
        data: suppliers,
      });
      return result;
    }),

  customers: protectedProcedure
    .input(
      z.object({
        format: z.enum(["csv", "excel", "pdf"]),
      })
    )
    .mutation(async ({ input }) => {
      const customers = await db.getAllCustomers();
      const result = generateExport({
        format: input.format,
        filename: `customers_${new Date().toISOString().split("T")[0]}`,
        title: "Customer Report",
        columns: EXPORT_CONFIGS.customers.columns,
        data: customers,
      });
      return result;
    }),

  // Generic export for any data
  custom: protectedProcedure
    .input(
      z.object({
        format: z.enum(["csv", "excel", "pdf"]),
        filename: z.string(),
        title: z.string().optional(),
        columns: z.array(
          z.object({
            key: z.string(),
            label: z.string(),
            format: z
              .enum(["currency", "date", "number", "percent", "boolean"])
              .optional(),
          })
        ),
        data: z.array(z.record(z.string(), z.any())),
      })
    )
    .mutation(async ({ input }) => {
      const result = generateExport({
        format: input.format,
        filename: input.filename,
        title: input.title,
        columns: input.columns,
        data: input.data,
      });
      return result;
    }),
});
