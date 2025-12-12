import { z } from "zod";
import { router, protectedProcedure, protectedMutationProcedure } from "../_core/trpc";
import * as db from "../db";
import { supplierSchemas } from "../_core/validationSchemas";
import * as utils from "../utils";

export const suppliersRouter = router({
  list: protectedProcedure
    .input(
      z
        .object({
          page: z.number().int().min(1).default(1),
          pageSize: z.number().int().min(1).max(100).default(20),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const allSuppliers = await db.getAllSuppliers();

      if (!input) {
        return allSuppliers;
      }

      const { page, pageSize } = input;
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;

      return {
        suppliers: allSuppliers.slice(startIndex, endIndex),
        total: allSuppliers.length,
        page,
        pageSize,
        totalPages: Math.ceil(allSuppliers.length / pageSize),
      };
    }),

  get: protectedProcedure
    .input(supplierSchemas.get)
    .query(async ({ input }) => {
      return await db.getSupplierById(input.id);
    }),

  products: protectedProcedure
    .input(supplierSchemas.products)
    .query(async ({ input }) => {
      return await db.getProductsBySupplierId(input.supplierId);
    }),

  create: protectedMutationProcedure
    .input(supplierSchemas.create)
    .mutation(async ({ input, ctx }) => {
      const code = utils.generateSupplierCode();
      await db.createSupplier({
        ...input,
        code,
        createdBy: ctx.user.id,
      } as any);
      return { success: true, code };
    }),

  update: protectedMutationProcedure
    .input(supplierSchemas.update)
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateSupplier(id, data);
      return { success: true };
    }),

  // AI-powered vendor scoring and analysis
  aiAnalysis: protectedProcedure.query(async () => {
    // Get all suppliers with their performance data
    const suppliers = await db.getAllSuppliers();
    const tenders = await db.getAllTenders();
    const deliveries = await db.getAllDeliveries();

    // Calculate vendor scores and insights
    const vendorAnalysis = suppliers.map(supplier => {
      // Count tender participations
      const supplierTenders = tenders.filter(
        t => t.supplierId === supplier.id
      );
      const wonTenders = supplierTenders.filter(t => t.status === "awarded");
      const winRate =
        supplierTenders.length > 0
          ? (wonTenders.length / supplierTenders.length) * 100
          : 0;

      // Calculate delivery performance
      const supplierDeliveries = deliveries.filter(
        d => d.supplierId === supplier.id
      );
      const onTimeDeliveries = supplierDeliveries.filter(d => {
        if (!d.expectedDate || !d.actualDate) return true;
        return new Date(d.actualDate) <= new Date(d.expectedDate);
      });
      const onTimeRate =
        supplierDeliveries.length > 0
          ? (onTimeDeliveries.length / supplierDeliveries.length) * 100
          : 100;

      // Calculate overall score (weighted)
      const qualityScore = supplier.rating || 3;
      const complianceScore =
        supplier.complianceStatus === "compliant"
          ? 5
          : supplier.complianceStatus === "pending"
            ? 3
            : 1;

      const overallScore =
        qualityScore * 0.3 +
        (winRate / 20) * 0.2 +
        (onTimeRate / 20) * 0.3 +
        complianceScore * 0.2;

      // Determine risk level
      let riskLevel: "low" | "medium" | "high" = "low";
      if (overallScore < 3) riskLevel = "high";
      else if (overallScore < 4) riskLevel = "medium";

      return {
        supplierId: supplier.id,
        supplierName: supplier.name,
        supplierCode: supplier.code,
        metrics: {
          winRate: Math.round(winRate * 10) / 10,
          onTimeRate: Math.round(onTimeRate * 10) / 10,
          qualityScore: qualityScore,
          complianceScore: complianceScore,
          totalTenders: supplierTenders.length,
          wonTenders: wonTenders.length,
          totalDeliveries: supplierDeliveries.length,
        },
        overallScore: Math.round(overallScore * 10) / 10,
        riskLevel,
        complianceStatus: supplier.complianceStatus || "pending",
        isActive: supplier.isActive,
      };
    });

    // Sort by overall score descending
    vendorAnalysis.sort((a, b) => b.overallScore - a.overallScore);

    // Generate AI insights
    const topPerformers = vendorAnalysis
      .filter(v => v.overallScore >= 4)
      .slice(0, 5);
    const atRisk = vendorAnalysis.filter(v => v.riskLevel === "high");
    const needsReview = vendorAnalysis.filter(
      v => v.complianceStatus === "pending"
    );

    const insights = [];

    if (topPerformers.length > 0) {
      insights.push({
        type: "success" as const,
        title: "Top Performing Vendors",
        message: `${topPerformers.length} vendors have excellent performance scores. Consider them for priority contracts.`,
        vendors: topPerformers.map(v => v.supplierName),
      });
    }

    if (atRisk.length > 0) {
      insights.push({
        type: "warning" as const,
        title: "High Risk Vendors",
        message: `${atRisk.length} vendor(s) require immediate attention due to poor performance metrics.`,
        vendors: atRisk.map(v => v.supplierName),
      });
    }

    if (needsReview.length > 0) {
      insights.push({
        type: "info" as const,
        title: "Compliance Review Needed",
        message: `${needsReview.length} vendor(s) have pending compliance status and need verification.`,
        vendors: needsReview.map(v => v.supplierName),
      });
    }

    // Calculate industry benchmarks
    const avgWinRate =
      vendorAnalysis.reduce((sum, v) => sum + v.metrics.winRate, 0) /
      (vendorAnalysis.length || 1);
    const avgOnTimeRate =
      vendorAnalysis.reduce((sum, v) => sum + v.metrics.onTimeRate, 0) /
      (vendorAnalysis.length || 1);

    return {
      vendors: vendorAnalysis,
      insights,
      benchmarks: {
        avgWinRate: Math.round(avgWinRate * 10) / 10,
        avgOnTimeRate: Math.round(avgOnTimeRate * 10) / 10,
        totalVendors: vendorAnalysis.length,
        activeVendors: vendorAnalysis.filter(v => v.isActive).length,
        compliantVendors: vendorAnalysis.filter(
          v => v.complianceStatus === "compliant"
        ).length,
      },
      recommendations: [
        { action: "Review high-risk vendors quarterly", priority: "high" },
        {
          action: "Complete compliance verification for pending vendors",
          priority: "medium",
        },
        {
          action: "Consider expanding partnerships with top performers",
          priority: "low",
        },
      ],
    };
  }),
});
