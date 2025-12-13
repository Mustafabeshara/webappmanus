import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  router,
  protectedProcedure,
  protectedMutationProcedure,
  publicProcedure,
} from "../_core/trpc";
import * as db from "../db";
import * as utils from "../_core/utils";

/**
 * Helper function to send notifications to the project owner
 */
async function notifyOwner(payload: {
  title: string;
  content: string;
}): Promise<boolean> {
  const { notifyOwner: notify } = await import("../_core/notification");
  return notify(payload);
}

export const tendersRouter = router({
  /**
   * List all tenders with pagination support
   */
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
      if (!input) {
        return await db.getAllTenders();
      }

      const { data, totalCount } = await db.getTendersPaginated(
        input.page,
        input.pageSize
      );
      const totalPages = Math.ceil(totalCount / input.pageSize);

      return {
        data,
        pagination: {
          page: input.page,
          pageSize: input.pageSize,
          totalCount,
          totalPages,
          hasMore: input.page < totalPages,
        },
      };
    }),

  /**
   * List tenders with pagination (explicit paginated endpoint)
   */
  listPaginated: protectedProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
      })
    )
    .query(async ({ input }) => {
      const { data, totalCount } = await db.getTendersPaginated(
        input.page,
        input.pageSize
      );
      const totalPages = Math.ceil(totalCount / input.pageSize);

      return {
        data,
        pagination: {
          page: input.page,
          pageSize: input.pageSize,
          totalCount,
          totalPages,
          hasMore: input.page < totalPages,
        },
      };
    }),

  /**
   * Get a single tender by ID with items and participants
   */
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const tender = await db.getTenderById(input.id);
      const items = await db.getTenderItems(input.id);
      const participants = await db.getTenderParticipants(input.id);

      // Get bid items for each participant
      const participantsWithBids = await Promise.all(
        participants.map(async p => ({
          ...p,
          bidItems: await db.getParticipantBidItems(p.id),
        }))
      );

      return { tender, items, participants: participantsWithBids };
    }),

  /**
   * Create a new tender
   */
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(3, "Title must be at least 3 characters").max(255, "Title cannot exceed 255 characters"),
        description: z.string().max(10000, "Description cannot exceed 10000 characters").optional(),
        customerId: z.number().int().positive().optional(),
        departmentId: z.number().int().positive().optional(),
        categoryId: z.number().int().positive().optional(),
        templateId: z.number().int().positive().optional(),
        submissionDeadline: z.date().optional(),
        evaluationDeadline: z.date().optional(),
        requirements: z.string().max(50000, "Requirements cannot exceed 50000 characters").optional(),
        terms: z.string().max(50000, "Terms cannot exceed 50000 characters").optional(),
        estimatedValue: z.number().nonnegative("Estimated value must be non-negative").max(999999999999, "Value exceeds maximum").optional(),
        items: z
          .array(
            z.object({
              productId: z.number().int().positive().optional(),
              description: z.string().min(1, "Item description required").max(1000, "Item description too long"),
              quantity: z.number().int().positive("Quantity must be positive").max(1000000, "Quantity too large"),
              unit: z.string().max(50, "Unit too long").optional(),
              specifications: z.string().max(5000, "Specifications too long").optional(),
              estimatedPrice: z.number().nonnegative().max(999999999999, "Price exceeds maximum").optional(),
            })
          )
          .max(100, "Cannot add more than 100 items at once")
          .optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { items, ...tenderData } = input;
      const referenceNumber = utils.generateTenderReference();

      const result = await db.createTender({
        ...tenderData,
        referenceNumber,
        createdBy: ctx.user.id,
      } as any);

      const tenderId = Number(result.insertId);

      // Use bulk insert for better performance
      if (items && items.length > 0) {
        const itemsWithTenderId = items.map(item => ({
          tenderId,
          ...item,
        }));
        await db.createTenderItemsBulk(itemsWithTenderId as any);
      }

      return { success: true, tenderId, referenceNumber };
    }),

  /**
   * Bulk import up to 10 tenders at once (for historical data)
   */
  bulkImport: protectedProcedure
    .input(
      z.object({
        tenders: z
          .array(
            z.object({
              title: z.string().min(3).max(255),
              description: z.string().max(10000).optional(),
              submissionDeadline: z.date().optional(),
              evaluationDeadline: z.date().optional(),
              requirements: z.string().max(50000).optional(),
              terms: z.string().max(50000).optional(),
              estimatedValue: z.number().nonnegative().max(999999999999).optional(),
              status: z
                .enum(["draft", "open", "awarded", "closed", "archived"])
                .optional(),
              items: z
                .array(
                  z.object({
                    description: z.string().min(1).max(1000),
                    quantity: z.number().int().positive().max(1000000),
                    unit: z.string().max(50).optional(),
                    estimatedPrice: z.number().nonnegative().max(999999999999).optional(),
                  })
                )
                .max(100)
                .optional(),
            })
          )
          .min(1)
          .max(10),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const results: Array<{
        success: boolean;
        tenderId?: number;
        referenceNumber?: string;
        title: string;
        error?: string;
      }> = [];

      for (const tenderData of input.tenders) {
        try {
          const { items, ...tender } = tenderData;
          const referenceNumber = utils.generateTenderReference();

          const result = await db.createTender({
            ...tender,
            referenceNumber,
            createdBy: ctx.user.id,
          } as any);

          const tenderId = Number(result.insertId);

          // Use bulk insert for better performance
          if (items && items.length > 0) {
            const itemsWithTenderId = items.map(item => ({
              tenderId,
              ...item,
            }));
            await db.createTenderItemsBulk(itemsWithTenderId as any);
          }

          results.push({
            success: true,
            tenderId,
            referenceNumber,
            title: tender.title,
          });
        } catch (error) {
          results.push({
            success: false,
            title: tenderData.title,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;

      return {
        success: failureCount === 0,
        totalImported: successCount,
        totalFailed: failureCount,
        results,
      };
    }),

  /**
   * Create a tender from a template
   */
  createFromTemplate: protectedProcedure
    .input(
      z.object({
        templateId: z.number(),
        title: z.string(),
        customerId: z.number().optional(),
        submissionDeadline: z.date().optional(),
        evaluationDeadline: z.date().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const template = await db.getTenderTemplateById(input.templateId);
      if (!template) throw new TRPCError({ code: "NOT_FOUND" });

      const templateItems = await db.getTemplateItems(input.templateId);
      const referenceNumber = utils.generateTenderReference();

      const result = await db.createTender({
        title: input.title,
        customerId: input.customerId,
        departmentId: template.departmentId,
        categoryId: template.categoryId,
        templateId: input.templateId,
        submissionDeadline: input.submissionDeadline,
        evaluationDeadline: input.evaluationDeadline,
        requirements: template.defaultRequirements,
        terms: template.defaultTerms,
        referenceNumber,
        createdBy: ctx.user.id,
      } as any);

      const tenderId = Number(result.insertId);

      for (const item of templateItems) {
        await db.createTenderItem({
          tenderId,
          productId: item.productId,
          description: item.description || "",
          quantity: item.quantity || 0,
          unit: item.unit,
          specifications: item.specifications,
          estimatedPrice: item.estimatedPrice,
        } as any);
      }

      return { success: true, tenderId, referenceNumber };
    }),

  /**
   * Update an existing tender
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        status: z
          .enum(["draft", "open", "awarded", "closed", "archived"])
          .optional(),
        submissionDeadline: z.date().optional(),
        evaluationDeadline: z.date().optional(),
        requirements: z.string().optional(),
        terms: z.string().optional(),
        estimatedValue: z.number().optional(),
        awardedSupplierId: z.number().optional(),
        awardedValue: z.number().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;

      if (data.status === "awarded" && data.awardedSupplierId) {
        (data as any).awardedAt = new Date();

        // Notify owner of tender award
        const tender = await db.getTenderById(id);
        if (tender) {
          await notifyOwner({
            title: "Tender Awarded",
            content: `Tender "${tender.title}" has been awarded by ${ctx.user.name}`,
          });
        }
      }

      await db.updateTender(id, data);
      return { success: true };
    }),

  /**
   * Add a participant (supplier) to a tender with their bid
   */
  addParticipant: protectedProcedure
    .input(
      z.object({
        tenderId: z.number(),
        supplierId: z.number(),
        totalBidAmount: z.number().optional(),
        notes: z.string().optional(),
        bidItems: z
          .array(
            z.object({
              tenderItemId: z.number(),
              unitPrice: z.number(),
              totalPrice: z.number(),
              deliveryTime: z.string().optional(),
              notes: z.string().optional(),
            })
          )
          .optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { bidItems, ...participantData } = input;

      const result = await db.createTenderParticipant(participantData as any);
      const participantId = Number(result.insertId);

      if (bidItems) {
        for (const item of bidItems) {
          await db.createParticipantBidItem({
            participantId,
            ...item,
          } as any);
        }
      }

      return { success: true, participantId };
    }),

  /**
   * Update participation status for a tender
   */
  updateParticipation: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        isParticipating: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      await db.updateTender(input.id, {
        isParticipating: input.isParticipating,
      });
      return { success: true };
    }),

  /**
   * AI Analysis: Analyze tender for feasibility and recommendations
   */
  analyze: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const { analyzeTender: analyzeAI } = await import("../ai/tender-analysis");

      const tender = await db.getTenderById(input.id);
      if (!tender)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Tender not found",
        });

      const items = await db.getTenderItems(input.id);
      const departments = await db.getAllDepartments();
      const department = tender.departmentId
        ? departments.find(d => d.id === tender.departmentId)
        : null;

      // Get historical data
      const allTenders = await db.getAllTenders();
      const deptTenders = tender.departmentId
        ? allTenders.filter(
            t =>
              t.departmentId === tender.departmentId &&
              (t.status === "awarded" || t.status === "closed")
          )
        : [];
      const wonTenders = deptTenders.filter(t => t.status === "awarded");
      const historicalWinRate =
        deptTenders.length > 0
          ? (wonTenders.length / deptTenders.length) * 100
          : 50;

      const result = await analyzeAI({
        id: tender.id,
        title: tender.title,
        description: tender.description,
        status: tender.status,
        category: null, // Add if available
        department: department?.name || null,
        estimatedValue: tender.estimatedValue?.toString() || null,
        submissionDeadline: tender.submissionDeadline,
        items: items.map(i => ({
          description: i.description,
          quantity: i.quantity,
          unit: i.unit || "piece",
          estimatedPrice: Number(i.estimatedPrice) || undefined,
        })),
        historicalWinRate,
        totalSimilarTenders: deptTenders.length,
      });

      return result;
    }),

  /**
   * Get AI service status
   */
  getAIStatus: publicProcedure.query(async () => {
    const { getAIStatus } = await import("../ai/service");
    return getAIStatus();
  }),
});
