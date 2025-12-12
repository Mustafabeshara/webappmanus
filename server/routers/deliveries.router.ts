import { z } from "zod";
import { router, protectedProcedure, protectedMutationProcedure } from "../_core/trpc";
import * as db from "../db";
import * as utils from "../utils";

export const deliveriesRouter = router({
  /**
   * List all deliveries with pagination support
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

      const allDeliveries = await db.getAllDeliveries();

      // Apply pagination
      const paginatedDeliveries = allDeliveries.slice(offset, offset + limit);
      const total = allDeliveries.length;
      const totalPages = Math.ceil(total / limit);

      return {
        deliveries: paginatedDeliveries,
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
   * Get delivery by ID with items
   */
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const delivery = await db.getDeliveryById(input.id);
      const items = await db.getDeliveryItems(input.id);
      return { delivery, items };
    }),

  /**
   * Create new delivery with items
   */
  create: protectedMutationProcedure
    .input(
      z.object({
        customerId: z.number(),
        tenderId: z.number().optional(),
        invoiceId: z.number().optional(),
        purchaseOrderId: z.number().optional(),
        scheduledDate: z.date(),
        deliveryAddress: z.string(),
        driverName: z.string().optional(),
        vehicleNumber: z.string().optional(),
        notes: z.string().optional(),
        items: z.array(
          z.object({
            productId: z.number(),
            quantity: z.number(),
            batchNumber: z.string().optional(),
            notes: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { items, ...deliveryData } = input;
      const deliveryNumber = utils.generateDeliveryNumber();

      const result = await db.createDelivery({
        ...deliveryData,
        deliveryNumber,
        createdBy: ctx.user.id,
      } as any);

      const deliveryId = Number(result.insertId);

      for (const item of items) {
        await db.createDeliveryItem({
          deliveryId,
          ...item,
        } as any);
      }

      return { success: true, deliveryId, deliveryNumber };
    }),

  /**
   * Update delivery status with inventory updates when delivered
   */
  update: protectedMutationProcedure
    .input(
      z.object({
        id: z.number(),
        status: z
          .enum(["planned", "in_transit", "delivered", "cancelled"])
          .optional(),
        deliveredDate: z.date().optional(),
        driverName: z.string().optional(),
        vehicleNumber: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateDelivery(id, data);

      // Update inventory when delivered
      if (data.status === "delivered") {
        const items = await db.getDeliveryItems(id);
        for (const item of items) {
          // Reduce inventory quantity (negative change for deliveries)
          await db.updateInventoryQuantity(item.productId, -item.quantity);
        }
      }

      return { success: true };
    }),

  /**
   * AI-powered comprehensive delivery analytics
   * Provides status breakdown, on-time delivery rate, customer delivery history,
   * overdue/upcoming deliveries, and actionable insights
   */
  aiAnalysis: protectedProcedure.query(async () => {
    const deliveries = await db.getAllDeliveries();
    const customers = await db.getAllCustomers();

    const customerMap = new Map(customers.map(c => [c.id, c]));
    const now = new Date();

    // Status breakdown
    const statusCounts = {
      planned: 0,
      in_transit: 0,
      delivered: 0,
      cancelled: 0,
    };

    // Track deliveries by customer and performance
    const customerDeliveryHistory: Record<
      number,
      {
        totalDeliveries: number;
        onTimeDeliveries: number;
        lateDeliveries: number;
        cancelledDeliveries: number;
      }
    > = {};

    const overdueDeliveries: Array<{
      id: number;
      deliveryNumber: string;
      customerName: string;
      scheduledDate: string;
      daysOverdue: number;
      status: string;
    }> = [];

    const upcomingDeliveries: Array<{
      id: number;
      deliveryNumber: string;
      customerName: string;
      scheduledDate: string;
      daysUntil: number;
      status: string;
    }> = [];

    // Track delivery times for predictions
    const deliveryTimes: number[] = [];
    let totalDeliveries = 0;
    let onTimeCount = 0;
    let lateCount = 0;

    for (const delivery of deliveries) {
      statusCounts[delivery.status as keyof typeof statusCounts]++;

      // Customer tracking
      if (!customerDeliveryHistory[delivery.customerId]) {
        customerDeliveryHistory[delivery.customerId] = {
          totalDeliveries: 0,
          onTimeDeliveries: 0,
          lateDeliveries: 0,
          cancelledDeliveries: 0,
        };
      }
      customerDeliveryHistory[delivery.customerId].totalDeliveries++;

      if (delivery.status === "cancelled") {
        customerDeliveryHistory[delivery.customerId].cancelledDeliveries++;
      } else if (delivery.status === "delivered" && delivery.deliveredDate) {
        const scheduled = new Date(delivery.scheduledDate);
        const actual = new Date(delivery.deliveredDate);
        const daysDiff = Math.floor(
          (actual.getTime() - scheduled.getTime()) / (1000 * 60 * 60 * 24)
        );

        deliveryTimes.push(daysDiff);
        totalDeliveries++;

        if (daysDiff <= 0) {
          onTimeCount++;
          customerDeliveryHistory[delivery.customerId].onTimeDeliveries++;
        } else {
          lateCount++;
          customerDeliveryHistory[delivery.customerId].lateDeliveries++;
        }
      }

      // Check for overdue planned/in-transit deliveries
      if (
        (delivery.status === "planned" || delivery.status === "in_transit") &&
        delivery.scheduledDate
      ) {
        const scheduled = new Date(delivery.scheduledDate);
        const daysDiff = Math.floor(
          (now.getTime() - scheduled.getTime()) / (1000 * 60 * 60 * 24)
        );
        const customer = customerMap.get(delivery.customerId);

        if (daysDiff > 0) {
          overdueDeliveries.push({
            id: delivery.id,
            deliveryNumber: delivery.deliveryNumber,
            customerName:
              customer?.name || `Customer #${delivery.customerId}`,
            scheduledDate: delivery.scheduledDate.toString(),
            daysOverdue: daysDiff,
            status: delivery.status,
          });
        } else if (daysDiff >= -7) {
          // Due within 7 days
          upcomingDeliveries.push({
            id: delivery.id,
            deliveryNumber: delivery.deliveryNumber,
            customerName:
              customer?.name || `Customer #${delivery.customerId}`,
            scheduledDate: delivery.scheduledDate.toString(),
            daysUntil: Math.abs(daysDiff),
            status: delivery.status,
          });
        }
      }
    }

    // Sort by urgency
    overdueDeliveries.sort((a, b) => b.daysOverdue - a.daysOverdue);
    upcomingDeliveries.sort((a, b) => a.daysUntil - b.daysUntil);

    // Customer delivery reliability scores
    const customerScores = Object.entries(customerDeliveryHistory)
      .filter(([_, history]) => history.totalDeliveries > 0)
      .map(([customerId, history]) => {
        const customer = customerMap.get(Number(customerId));
        const successRate = Math.round(
          (history.onTimeDeliveries /
            (history.totalDeliveries - history.cancelledDeliveries || 1)) *
            100
        );

        return {
          customerId: Number(customerId),
          customerName: customer?.name || `Customer #${customerId}`,
          totalDeliveries: history.totalDeliveries,
          onTimeDeliveries: history.onTimeDeliveries,
          lateDeliveries: history.lateDeliveries,
          cancelledDeliveries: history.cancelledDeliveries,
          successRate: isNaN(successRate) ? 0 : successRate,
        };
      })
      .sort((a, b) => b.totalDeliveries - a.totalDeliveries);

    // Calculate on-time delivery rate
    const onTimeRate =
      totalDeliveries > 0
        ? Math.round((onTimeCount / totalDeliveries) * 100)
        : 100;

    // Average delivery variance
    const avgDeliveryVariance =
      deliveryTimes.length > 0
        ? (
            deliveryTimes.reduce((a, b) => a + b, 0) / deliveryTimes.length
          ).toFixed(1)
        : "0";

    // Generate AI insights
    const insights: Array<{
      type: "warning" | "info" | "success";
      message: string;
    }> = [];

    if (overdueDeliveries.length > 0) {
      insights.push({
        type: "warning",
        message: `${overdueDeliveries.length} deliveries are overdue and require immediate attention. The oldest is ${overdueDeliveries[0]?.daysOverdue} days late.`,
      });
    }

    if (onTimeRate < 80) {
      insights.push({
        type: "warning",
        message: `On-time delivery rate is ${onTimeRate}%, which is below the target of 80%. Consider reviewing logistics processes.`,
      });
    } else if (onTimeRate >= 95) {
      insights.push({
        type: "success",
        message: `Excellent delivery performance! ${onTimeRate}% on-time delivery rate.`,
      });
    }

    const highRiskCustomers = customerScores.filter(
      c => c.successRate < 70 && c.totalDeliveries >= 3
    );
    if (highRiskCustomers.length > 0) {
      insights.push({
        type: "info",
        message: `${highRiskCustomers.length} customers have delivery success rates below 70%. Consider investigating delivery challenges.`,
      });
    }

    if (upcomingDeliveries.length > 5) {
      insights.push({
        type: "info",
        message: `${upcomingDeliveries.length} deliveries scheduled within the next 7 days. Plan logistics accordingly.`,
      });
    }

    if (statusCounts.in_transit > 10) {
      insights.push({
        type: "info",
        message: `${statusCounts.in_transit} deliveries currently in transit. Monitor for potential delays.`,
      });
    }

    if (deliveries.length === 0) {
      insights.push({
        type: "info",
        message:
          "No delivery history available yet. Start creating deliveries to track performance.",
      });
    } else if (onTimeRate >= 90) {
      insights.push({
        type: "success",
        message: `Strong delivery performance with ${totalDeliveries} completed deliveries and ${onTimeRate}% on-time rate.`,
      });
    }

    return {
      summary: {
        totalDeliveries: deliveries.length,
        completedDeliveries: statusCounts.delivered,
        inTransit: statusCounts.in_transit,
        planned: statusCounts.planned,
        cancelled: statusCounts.cancelled,
        onTimeRate,
        avgDeliveryVariance: `${avgDeliveryVariance} days`,
      },
      statusBreakdown: statusCounts,
      overdueDeliveries: overdueDeliveries.slice(0, 10),
      upcomingDeliveries: upcomingDeliveries.slice(0, 10),
      customerScores: customerScores.slice(0, 10),
      insights,
    };
  }),
});
