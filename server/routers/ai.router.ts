import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, protectedMutationProcedure } from "../_core/trpc";
import * as db from "../db";
import { generateProductForecast, generateBulkForecast } from "../ai/product-forecasting";
import { isAIConfigured, getAvailableProviders } from "../ai/service";

/**
 * Helper function to generate sales history from existing data
 * Generates synthetic sales data for product forecasting
 *
 * @param productId - The ID of the product to generate sales history for
 * @returns Array of sales history records with date, quantity, revenue, and channel
 */
async function generateSalesHistoryFromData(productId: number) {
  // In a real implementation, this would query actual sales records
  // For now, we'll create synthetic data based on invoice items and tender items
  const salesHistory: Array<{
    date: Date;
    quantity: number;
    revenue: number;
    channel?: "tender" | "direct" | "contract" | "other";
  }> = [];

  try {
    // Get invoice items for this product (if we have invoice line items)
    const invoices = await db.getAllInvoices();

    // FIXED: Fetch product ONCE before the loop to avoid N+1 query issue
    const product = await db.getProductById(productId);
    const unitPrice = product?.unitPrice || 10000; // Default $100

    // Generate some synthetic sales data based on historical patterns
    // This would be replaced with actual sales records in production
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 15);

      // Generate random but consistent sales for the product
      const baseQuantity = 10 + (productId % 20);
      const variance = Math.sin(i * 0.5) * 5; // Seasonal variation
      const quantity = Math.max(
        1,
        Math.round(baseQuantity + variance + (Math.random() * 10 - 5))
      );

      salesHistory.push({
        date: monthDate,
        quantity,
        revenue: quantity * unitPrice,
        channel: i % 3 === 0 ? "tender" : i % 2 === 0 ? "direct" : "contract",
      });
    }
  } catch (error) {
    console.error("[AI Router] Error generating sales history:", error);
  }

  return salesHistory;
}

/**
 * AI Router
 * Handles AI-powered features including product demand forecasting and AI service status
 */
export const aiRouter = router({
  /**
   * Generate product demand forecast
   * Creates a forecast for a specific product based on historical sales data
   */
  generateProductForecast: protectedProcedure
    .input(
      z.object({
        productId: z.number(),
        forecastMonths: z.number().min(1).max(24).default(6),
      })
    )
    .mutation(async ({ input }) => {
      const product = await db.getProductById(input.productId);
      if (!product) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found",
        });
      }

      // Get inventory data
      const inventory = await db.getInventoryByProduct(input.productId);

      // Get sales history (from invoices, tenders, etc.)
      // For now, we'll create mock sales data - in production, this would come from actual sales records
      const salesHistory = await generateSalesHistoryFromData(
        input.productId
      );

      const productData = {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        category: product.category || undefined,
        unitPrice: product.unitPrice || 0,
        salesHistory,
        currentInventory: inventory?.quantity || 0,
        minStockLevel: inventory?.minStockLevel || 0,
        maxStockLevel: inventory?.maxStockLevel || undefined,
        leadTimeDays: 14, // Default lead time
      };

      const forecast = await generateProductForecast(
        productData,
        input.forecastMonths
      );
      return forecast;
    }),

  /**
   * Generate bulk product forecasts
   * Creates forecasts for multiple products at once, optionally filtered by category or specific IDs
   */
  generateBulkProductForecast: protectedProcedure
    .input(
      z.object({
        productIds: z.array(z.number()).optional(),
        category: z.string().optional(),
        forecastMonths: z.number().min(1).max(24).default(6),
      })
    )
    .mutation(async ({ input }) => {
      let products = await db.getAllProducts();

      // Filter by category if specified
      if (input.category) {
        products = products.filter((p: any) => p.category === input.category);
      }

      // Filter by specific IDs if provided
      if (input.productIds && input.productIds.length > 0) {
        products = products.filter((p: any) =>
          input.productIds!.includes(p.id)
        );
      }

      // Limit to first 50 products for performance
      products = products.slice(0, 50);

      const productsData = await Promise.all(
        products.map(async (product: any) => {
          const inventory = await db.getInventoryByProduct(product.id);
          const salesHistory = await generateSalesHistoryFromData(product.id);

          return {
            productId: product.id,
            productName: product.name,
            sku: product.sku,
            category: product.category || undefined,
            unitPrice: product.unitPrice || 0,
            salesHistory,
            currentInventory: inventory?.quantity || 0,
            minStockLevel: inventory?.minStockLevel || 0,
            maxStockLevel: inventory?.maxStockLevel || undefined,
            leadTimeDays: 14,
          };
        })
      );

      const forecast = await generateBulkForecast(
        productsData,
        input.forecastMonths
      );
      return forecast;
    }),

  /**
   * Get AI service status
   * Returns whether AI services are configured and which providers are available
   */
  status: protectedProcedure.query(() => {
    return {
      configured: isAIConfigured(),
      providers: getAvailableProviders(),
    };
  }),
});
