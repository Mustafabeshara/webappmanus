import { z } from "zod";
import { router, protectedProcedure, protectedMutationProcedure } from "../_core/trpc";
import * as db from "../db";
import { inventorySchemas } from "../_core/validationSchemas";
import { analyzeInventory } from "../ai/inventory-optimization";
import { isAIConfigured, getAvailableProviders } from "../ai/service";

export const inventoryRouter = router({
  /**
   * List all inventory items with pagination support
   */
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(50),
      }).optional()
    )
    .query(async ({ input }) => {
      const page = input?.page || 1;
      const limit = input?.limit || 50;
      const offset = (page - 1) * limit;

      const allInventory = await db.getAllInventory();

      // Apply pagination
      const paginatedItems = allInventory.slice(offset, offset + limit);
      const total = allInventory.length;
      const totalPages = Math.ceil(total / limit);

      return {
        items: paginatedItems,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };
    }),

  /**
   * Get all low stock inventory items
   */
  lowStock: protectedProcedure.query(async () => {
    return await db.getLowStockItems();
  }),

  /**
   * Get inventory by product ID
   */
  byProduct: protectedProcedure
    .input(inventorySchemas.byProduct)
    .query(async ({ input }) => {
      return await db.getInventoryByProduct(input.productId);
    }),

  /**
   * Create new inventory entry
   */
  create: protectedMutationProcedure
    .input(inventorySchemas.create)
    .mutation(async ({ input }) => {
      await db.createInventory(input as any);
      return { success: true };
    }),

  /**
   * Update existing inventory entry
   */
  update: protectedMutationProcedure
    .input(inventorySchemas.update)
    .mutation(async ({ input }) => {
      const { id, expiryDate, ...rest } = input;
      // Convert string date to Date object if provided
      const data = {
        ...rest,
        expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      };
      await db.updateInventory(id, data);
      return { success: true };
    }),

  /**
   * AI-powered inventory optimization
   * Analyzes inventory levels and provides recommendations
   */
  optimize: protectedProcedure.mutation(async () => {
    // Get all inventory with product details
    const inventoryItems = await db.getAllInventory();
    const products = await db.getAllProducts();

    // Create a product lookup map
    const productMap = new Map(products.map(p => [p.id, p]));

    // Transform inventory data for AI analysis
    // getAllInventory returns joined data with renamed fields:
    // currentStock (not quantity), reorderLevel (not minStockLevel)
    const itemsForAnalysis = inventoryItems.map(inv => {
      return {
        id: inv.id,
        productId: inv.id, // product id from joined result
        productName: inv.name || `Product #${inv.id}`,
        productSku: inv.sku || `SKU-${inv.id}`,
        category: inv.category || undefined,
        quantity: inv.currentStock ?? 0,
        minStockLevel: inv.reorderLevel ?? 10,
        maxStockLevel: inv.maxStockLevel ?? undefined,
        unitPrice: inv.unitPrice ?? undefined,
        expiryDate: inv.expiryDate || null,
        location: inv.location || undefined,
        lastRestocked: inv.lastRestocked || null,
      };
    });

    const analysis = await analyzeInventory(itemsForAnalysis);
    return { analysis };
  }),

  /**
   * Get AI service configuration status
   */
  getAIStatus: protectedProcedure.query(async () => {
    return {
      configured: isAIConfigured(),
      providers: getAvailableProviders(),
    };
  }),
});
