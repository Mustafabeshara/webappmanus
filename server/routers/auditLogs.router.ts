import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";
import {
  paginationInput,
  createPaginatedResponse,
  getPaginationOffsets,
} from "../_core/pagination";

/**
 * Audit Logs Router
 * Handles audit log tracking and querying for system activity monitoring
 */
export const auditLogsRouter = router({
  /**
   * List all audit logs with optional filtering (admin only)
   * Supports filtering by entity type, action, user, and date range
   */
  list: adminProcedure
    .input(
      z
        .object({
          entityType: z.string().optional(),
          action: z.string().optional(),
          userId: z.number().optional(),
          startDate: z.date().optional(),
          endDate: z.date().optional(),
        })
        .merge(paginationInput)
        .optional()
    )
    .query(async ({ input }) => {
      // Get all audit logs with filters
      const allLogs = await db.getAuditLogs({
        entityType: input?.entityType,
        action: input?.action,
        userId: input?.userId,
        startDate: input?.startDate,
        endDate: input?.endDate,
        limit: 10000, // Get all for pagination
      });

      // Apply pagination if provided
      if (input?.page) {
        const { offset, limit } = getPaginationOffsets(input);
        const paginatedItems = allLogs.slice(offset, offset + limit);

        return createPaginatedResponse(
          paginatedItems,
          input.page,
          limit,
          allLogs.length
        );
      }

      return allLogs;
    }),

  /**
   * Get audit logs for a specific entity
   * Anyone can view audit logs for entities they have access to
   */
  forEntity: protectedProcedure
    .input(
      z.object({
        entityType: z.string(),
        entityId: z.number(),
        limit: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      return await db.getAuditLogsForEntity(
        input.entityType,
        input.entityId,
        input.limit
      );
    }),

  /**
   * Get audit logs for a specific user
   * Users can only view their own activity unless they are admin
   */
  forUser: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
        limit: z.number().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      // Users can only view their own activity unless admin
      if (input.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Can only view your own activity",
        });
      }
      return await db.getAuditLogsByUser(input.userId, input.limit);
    }),

  /**
   * Get current user's own activity logs
   * Convenient endpoint for users to view their own activity
   */
  myActivity: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().optional(),
        })
        .optional()
    )
    .query(async ({ input, ctx }) => {
      return await db.getAuditLogsByUser(ctx.user.id, input?.limit);
    }),

  /**
   * Get audit log statistics and analytics (admin only)
   * Provides breakdown by action, entity type, and user
   */
  stats: adminProcedure
    .input(
      z
        .object({
          startDate: z.date().optional(),
          endDate: z.date().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const logs = await db.getAuditLogs({
        startDate: input?.startDate,
        endDate: input?.endDate,
        limit: 10000,
      });

      const stats = {
        totalActions: logs.length,
        actionBreakdown: {} as Record<string, number>,
        entityBreakdown: {} as Record<string, number>,
        userBreakdown: {} as Record<number, number>,
        recentActivity: logs.slice(0, 10),
      };

      for (const log of logs) {
        // Action breakdown
        stats.actionBreakdown[log.action] =
          (stats.actionBreakdown[log.action] || 0) + 1;
        // Entity breakdown
        stats.entityBreakdown[log.entityType] =
          (stats.entityBreakdown[log.entityType] || 0) + 1;
        // User breakdown
        stats.userBreakdown[log.userId] =
          (stats.userBreakdown[log.userId] || 0) + 1;
      }

      return stats;
    }),
});
