import { z } from "zod";
import { protectedMutationProcedure, protectedProcedure, router } from "../_core/trpc";

/**
 * Supplier Catalog Router
 * Handles supplier pricing, product comparison, and catalog management
 */
export const supplierCatalogRouter = router({
  updateSupplierPrice: protectedMutationProcedure
    .input(
      z.object({
        supplierId: z.number(),
        productId: z.number(),
        unitPrice: z.number(),
        currency: z.string().optional(),
        supplierProductCode: z.string().optional(),
        minimumOrderQuantity: z.number().optional(),
        leadTimeDays: z.number().optional(),
        validFrom: z.date().optional(),
        validUntil: z.date().optional(),
        changeReason: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { supplierCatalogService } = await import(
        "../_core/supplierCatalog"
      );
      const { changeReason, validFrom, validUntil, ...rest } = input;

      // Transform to match PriceUpdateInput interface
      return await supplierCatalogService.updateSupplierPrice({
        supplierId: rest.supplierId,
        productId: rest.productId,
        newPrice: rest.unitPrice,
        effectiveDate: validFrom?.toISOString(),
        expiryDate: validUntil?.toISOString(),
        notes: changeReason,
      });
    }),

  compareProductPrices: protectedProcedure
    .input(z.object({ productId: z.number() }))
    .query(async ({ input }) => {
      const { supplierCatalogService } = await import(
        "../_core/supplierCatalog"
      );

      return await supplierCatalogService.compareProductPrices(
        input.productId
      );
    }),

  detectDuplicateProducts: protectedProcedure
    .input(
      z.object({
        productId: z.number().optional(),
        threshold: z.number().min(0).max(1).optional(),
      })
    )
    .query(async ({ input }) => {
      const { supplierCatalogService } = await import(
        "../_core/supplierCatalog"
      );

      return await supplierCatalogService.detectDuplicateProducts(
        input.productId,
        input.threshold
      );
    }),

  standardizeProductSpecifications: protectedMutationProcedure
    .input(
      z.object({
        productId: z.number(),
        specifications: z.array(
          z.object({
            key: z.string(),
            value: z.string(),
            unit: z.string().optional(),
            isRequired: z.boolean().optional(),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { supplierCatalogService } = await import(
        "../_core/supplierCatalog"
      );

      return await supplierCatalogService.standardizeProductSpecifications(
        input.productId,
        input.specifications,
        ctx.user.id
      );
    }),

  analyzeSupplierPerformance: protectedProcedure
    .input(
      z.object({
        supplierId: z.number(),
        dateRange: z
          .object({
            start: z.date(),
            end: z.date(),
          })
          .optional(),
      })
    )
    .query(async ({ input }) => {
      const { supplierCatalogService } = await import(
        "../_core/supplierCatalog"
      );

      return await supplierCatalogService.analyzeSupplierPerformance(
        input.supplierId,
        input.dateRange
      );
    }),

  importSupplierCatalog: protectedMutationProcedure
    .input(
      z.object({
        supplierId: z.number(),
        catalogData: z.array(
          z.object({
            supplierProductCode: z.string(),
            productName: z.string(),
            description: z.string().optional(),
            category: z.string().optional(),
            unitPrice: z.number(),
            currency: z.string().optional(),
            specifications: z.record(z.string(), z.string()).optional(),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { supplierCatalogService } = await import(
        "../_core/supplierCatalog"
      );

      // Map input to match service method signature
      const catalogDataForService = input.catalogData.map(item => ({
        supplierProductCode: item.supplierProductCode,
        productName: item.productName,
        description: item.description,
        category: item.category,
        unitPrice: item.unitPrice,
        currency: item.currency,
        specifications: item.specifications,
      }));

      return await supplierCatalogService.importSupplierCatalog(
        input.supplierId,
        catalogDataForService,
        ctx.user.id
      );
    }),
});
