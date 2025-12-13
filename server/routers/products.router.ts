/**
 * Products Router
 *
 * Handles product CRUD operations with pagination support.
 * Includes inventory integration for stock management.
 * Enhanced with catalog info and competitor tracking.
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
import { commonSchemas } from "../_core/input-validation";

// ============================================
// ENHANCED SCHEMAS
// ============================================

const catalogInfoSchema = z.object({
  productId: z.number(),
  productCode: commonSchemas.safeString(100).optional(),
  barcode: commonSchemas.safeString(100).optional(),
  targetCustomers: z.string().optional(), // JSON string
  indication: z.string().optional(),
  prevalence: commonSchemas.safeString(255).optional(),
  marketDemand: z.enum(["low", "medium", "high", "very_high"]).optional(),
  demandNotes: z.string().optional(),
  competitors: z.string().optional(), // JSON string
  competitorPricing: z.string().optional(), // JSON string
  marketPosition: commonSchemas.safeString(255).optional(),
  uniqueSellingPoints: z.string().optional(), // JSON string
  certifications: z.string().optional(), // JSON string
  countryOfOrigin: commonSchemas.safeString(100).optional(),
  warranty: commonSchemas.safeString(255).optional(),
  shelfLife: commonSchemas.safeString(100).optional(),
  storageRequirements: z.string().optional(),
  hsCode: commonSchemas.safeString(20).optional(),
  regulatoryStatus: commonSchemas.safeString(255).optional(),
  sfdaRegistration: commonSchemas.safeString(100).optional(),
  pricingTiers: z.string().optional(), // JSON string
});

const competitorSchema = z.object({
  productId: z.number(),
  competitorName: commonSchemas.safeString(255),
  competitorProduct: commonSchemas.safeString(255).optional(),
  competitorPrice: z.number().int().min(0).optional(),
  competitorStrengths: z.string().optional(),
  competitorWeaknesses: z.string().optional(),
  marketShare: commonSchemas.safeString(50).optional(),
  notes: z.string().optional(),
});

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
   * Get product with full details (catalog info, competitors, specs, etc.)
   */
  getFullDetails: protectedProcedure
    .input(productSchemas.get)
    .query(async ({ input }) => {
      const product = await db.getProductWithFullDetails(input.id);

      if (!product) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found",
        });
      }

      // Get inventory data
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

  // ============================================
  // CATALOG INFO ENDPOINTS
  // ============================================

  /**
   * Get catalog info for a product
   */
  getCatalogInfo: protectedProcedure
    .input(z.object({ productId: z.number() }))
    .query(async ({ input }) => {
      return db.getProductCatalogInfo(input.productId);
    }),

  /**
   * Update or create catalog info for a product
   */
  upsertCatalogInfo: protectedMutationProcedure
    .input(catalogInfoSchema)
    .mutation(async ({ input }) => {
      const { productId, ...data } = input;

      // Verify product exists
      const product = await db.getProductById(productId);
      if (!product) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found",
        });
      }

      return db.upsertProductCatalogInfo(productId, data);
    }),

  // ============================================
  // COMPETITOR ENDPOINTS
  // ============================================

  /**
   * Get competitors for a product
   */
  getCompetitors: protectedProcedure
    .input(z.object({ productId: z.number() }))
    .query(async ({ input }) => {
      return db.getProductCompetitors(input.productId);
    }),

  /**
   * Add a competitor to a product
   */
  addCompetitor: protectedMutationProcedure
    .input(competitorSchema)
    .mutation(async ({ input }) => {
      // Verify product exists
      const product = await db.getProductById(input.productId);
      if (!product) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found",
        });
      }

      return db.createProductCompetitor(input as any);
    }),

  /**
   * Update a competitor
   */
  updateCompetitor: protectedMutationProcedure
    .input(
      z.object({
        id: z.number(),
        ...competitorSchema.omit({ productId: true }).shape,
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateProductCompetitor(id, data);
      return { success: true };
    }),

  /**
   * Delete a competitor
   */
  deleteCompetitor: protectedMutationProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteProductCompetitor(input.id);
      return { success: true };
    }),

  // ============================================
  // SPECIFICATIONS ENDPOINTS
  // ============================================

  /**
   * Get specifications for a product
   */
  getSpecifications: protectedProcedure
    .input(z.object({ productId: z.number() }))
    .query(async ({ input }) => {
      return db.getProductSpecifications(input.productId);
    }),

  /**
   * Add a specification to a product
   */
  addSpecification: protectedMutationProcedure
    .input(
      z.object({
        productId: z.number(),
        specKey: commonSchemas.safeString(100),
        specValue: z.string(),
        unit: commonSchemas.safeString(50).optional(),
        displayOrder: z.number().int().min(0).optional(),
        isPublic: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Verify product exists
      const product = await db.getProductById(input.productId);
      if (!product) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found",
        });
      }

      return db.createProductSpecification(input as any);
    }),

  /**
   * Update a specification
   */
  updateSpecification: protectedMutationProcedure
    .input(
      z.object({
        id: z.number(),
        specKey: commonSchemas.safeString(100).optional(),
        specValue: z.string().optional(),
        unit: commonSchemas.safeString(50).optional(),
        displayOrder: z.number().int().min(0).optional(),
        isPublic: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateProductSpecification(id, data);
      return { success: true };
    }),

  // ============================================
  // BULK OPERATIONS
  // ============================================

  /**
   * Bulk import products from Excel data
   */
  bulkImport: protectedMutationProcedure
    .input(
      z.object({
        supplierId: z.number(),
        products: z.array(
          z.object({
            name: commonSchemas.safeString(255),
            productCode: commonSchemas.safeString(100).optional(),
            description: z.string().optional(),
            category: commonSchemas.safeString(100).optional(),
            unitPrice: z.number().int().min(0).optional(),
            unit: commonSchemas.safeString(50).optional(),
            specifications: z.string().optional(),
            competitors: z.string().optional(),
            targetCustomers: z.string().optional(),
            indication: z.string().optional(),
            prevalence: commonSchemas.safeString(255).optional(),
            demand: z.enum(["low", "medium", "high", "very_high"]).optional(),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const results = {
        imported: 0,
        updated: 0,
        errors: [] as string[],
      };

      for (const product of input.products) {
        try {
          // Check if product exists by name or code
          const existing = product.productCode
            ? await db.findProductByNameOrCode(product.name, product.productCode)
            : null;

          if (existing) {
            // Update existing product
            await db.updateProduct(existing.id, {
              name: product.name,
              description: product.description,
              category: product.category,
              unitPrice: product.unitPrice,
              unit: product.unit,
              specifications: product.specifications,
              manufacturerId: input.supplierId,
            });

            // Update catalog info if provided
            if (
              product.targetCustomers ||
              product.indication ||
              product.prevalence ||
              product.demand ||
              product.competitors
            ) {
              await db.upsertProductCatalogInfo(existing.id, {
                productCode: product.productCode,
                targetCustomers: product.targetCustomers,
                indication: product.indication,
                prevalence: product.prevalence,
                marketDemand: product.demand,
                competitors: product.competitors,
              });
            }

            results.updated++;
          } else {
            // Create new product
            const sku = utils.generateProductSKU();
            const createResult = await db.createProduct({
              sku,
              name: product.name,
              description: product.description,
              category: product.category,
              unitPrice: product.unitPrice,
              unit: product.unit,
              specifications: product.specifications,
              manufacturerId: input.supplierId,
              createdBy: ctx.user.id,
            } as any);

            const productId = Number(createResult.insertId);

            // Create initial inventory
            if (productId) {
              await db.createInventory({
                productId,
                quantity: 0,
                minStockLevel: 1,
              } as any);

              // Create catalog info if provided
              if (
                product.productCode ||
                product.targetCustomers ||
                product.indication ||
                product.prevalence ||
                product.demand ||
                product.competitors
              ) {
                await db.upsertProductCatalogInfo(productId, {
                  productCode: product.productCode,
                  targetCustomers: product.targetCustomers,
                  indication: product.indication,
                  prevalence: product.prevalence,
                  marketDemand: product.demand,
                  competitors: product.competitors,
                });
              }
            }

            results.imported++;
          }
        } catch (error) {
          results.errors.push(
            `${product.name}: ${error instanceof Error ? error.message : "Unknown error"}`
          );
        }
      }

      return results;
    }),
});
