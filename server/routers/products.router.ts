/**
 * Products Router
 *
 * Handles product CRUD operations with pagination support.
 * Includes inventory integration for stock management.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, protectedMutationProcedure } from "../_core/trpc";
import * as db from "../db";
import { productSchemas } from "../_core/validationSchemas";
import * as utils from "../_core/utils";
import {
  paginationInput,
  createPaginatedResponse,
  getPaginationOffsets,
} from "../_core/pagination";

// ============================================
// ROUTER
// ============================================

export const productsRouter = router({
  /**
   * List all products with optional pagination
   */
  list: protectedProcedure
    .input(paginationInput.optional())
    .query(async ({ input }) => {
      const allProducts = await db.getAllProducts();

      // If no pagination requested, return all (backwards compatible)
      if (!input) {
        return allProducts;
      }

      const { offset, limit } = getPaginationOffsets(input);
      const paginatedItems = allProducts.slice(offset, offset + limit);

      return createPaginatedResponse(
        paginatedItems,
        input.page,
        limit,
        allProducts.length
      );
    }),

  /**
   * Get single product by ID with inventory data
   */
  get: protectedProcedure
    .input(productSchemas.get)
    .query(async ({ input }) => {
      const product = await db.getProductById(input.id);

      if (!product) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found",
        });
      }

      // Get inventory data for this product
      const inventoryList = await db.getInventoryByProduct(input.id);
      const inventory =
        inventoryList && inventoryList.length > 0 ? inventoryList[0] : null;

      return {
        ...product,
        currentStock: inventory?.quantity || 0,
        minStockLevel: inventory?.minStockLevel || 0,
        location: inventory?.location || null,
      };
    }),

  /**
   * Create new product with initial inventory
   */
  create: protectedMutationProcedure
    .input(productSchemas.create)
    .mutation(async ({ input, ctx }) => {
      // Generate unique SKU
      const sku = utils.generateProductSKU();

      const {
        minStockLevel,
        maxStockLevel,
        initialQuantity,
        location,
        ...productData
      } = input;

      // Create product
      const result = await db.createProduct({
        ...productData,
        sku,
        createdBy: ctx.user.id,
      } as any);

      const productId = Number(result.insertId);

      // Create initial inventory record
      if (productId) {
        await db.createInventory({
          productId,
          quantity: initialQuantity || 0,
          minStockLevel: minStockLevel || 0,
          maxStockLevel: maxStockLevel,
          location,
        } as any);
      }

      return {
        success: true,
        sku,
        productId,
      };
    }),

  /**
   * Update existing product
   */
  update: protectedMutationProcedure
    .input(productSchemas.update)
    .mutation(async ({ input }) => {
      const { id, ...data } = input;

      // Verify product exists
      const product = await db.getProductById(id);
      if (!product) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found",
        });
      }

      await db.updateProduct(id, data);

      return { success: true };
    }),
});
