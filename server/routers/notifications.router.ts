import { z } from "zod";
import { router, protectedProcedure, protectedMutationProcedure } from "../_core/trpc";
import * as db from "../db";
import {
  paginationInput,
  createPaginatedResponse,
  getPaginationOffsets,
} from "../_core/pagination";

export const notificationsRouter = router({
  // Get all notifications for the current user with pagination
  list: protectedProcedure
    .input(paginationInput.optional())
    .query(async ({ ctx, input }) => {
      const allNotifications = await db.getUserNotifications(ctx.user.id);

      // If no pagination requested, return all (backwards compatible)
      if (!input) {
        return allNotifications;
      }

      const { offset, limit } = getPaginationOffsets(input);
      const paginatedItems = allNotifications.slice(offset, offset + limit);

      return createPaginatedResponse(
        paginatedItems,
        input.page,
        limit,
        allNotifications.length
      );
    }),

  // Get only unread notifications
  unread: protectedProcedure.query(async ({ ctx }) => {
    return await db.getUnreadNotifications(ctx.user.id);
  }),

  // Mark a single notification as read
  markRead: protectedMutationProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.markNotificationRead(input.id);
      return { success: true };
    }),

  // Mark all notifications as read for the current user
  markAllRead: protectedMutationProcedure.mutation(async ({ ctx }) => {
    await db.markAllNotificationsRead(ctx.user.id);
    return { success: true };
  }),

  // AI-powered notification analysis and smart features
  aiAnalysis: protectedProcedure.query(async ({ ctx }) => {
    const [
      allNotifications,
      unreadNotifications,
      tenders,
      invoices,
      deliveries,
      products,
      budgets,
    ] = await Promise.all([
      db.getUserNotifications(ctx.user.id),
      db.getUnreadNotifications(ctx.user.id),
      db.getAllTenders(),
      db.getAllInvoices(),
      db.getAllDeliveries(),
      db.getAllProducts(),
      db.getAllBudgets(),
    ]);

    // Summary statistics
    const summary = {
      totalNotifications: allNotifications.length,
      unreadCount: unreadNotifications.length,
      urgentCount: unreadNotifications.filter(n => n.priority === "urgent")
        .length,
      highPriorityCount: unreadNotifications.filter(
        n => n.priority === "high"
      ).length,
      readRate:
        allNotifications.length > 0
          ? Math.round(
              ((allNotifications.length - unreadNotifications.length) /
                allNotifications.length) *
                100
            )
          : 100,
    };

    // Group notifications by type
    const byType: Record<string, number> = {};
    for (const notification of allNotifications) {
      byType[notification.type] = (byType[notification.type] || 0) + 1;
    }

    // Group by category
    const byCategory: Record<string, number> = {};
    for (const notification of allNotifications) {
      const category = notification.category || "general";
      byCategory[category] = (byCategory[category] || 0) + 1;
    }

    // Smart alerts - proactive notifications based on business state
    const smartAlerts: Array<{
      type: "critical" | "warning" | "info";
      category: string;
      message: string;
      actionUrl?: string;
    }> = [];

    // Check for tender deadlines
    const upcomingTenderDeadlines = tenders.filter(t => {
      if (t.status !== "open" || !t.deadline) return false;
      const daysUntil = Math.ceil(
        (new Date(t.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      return daysUntil >= 0 && daysUntil <= 3;
    });
    if (upcomingTenderDeadlines.length > 0) {
      smartAlerts.push({
        type: "critical",
        category: "Tender Deadline",
        message: `${upcomingTenderDeadlines.length} tender(s) have deadlines within the next 3 days. Review and submit before they expire.`,
        actionUrl: "/tenders",
      });
    }

    // Check for overdue invoices
    const overdueInvoices = invoices.filter(inv => {
      if (inv.status === "paid") return false;
      if (!inv.dueDate) return false;
      return new Date(inv.dueDate) < new Date();
    });
    if (overdueInvoices.length > 0) {
      const totalOverdue = overdueInvoices.reduce(
        (sum, inv) => sum + Number(inv.total || 0),
        0
      );
      smartAlerts.push({
        type: "critical",
        category: "Cash Flow Alert",
        message: `${overdueInvoices.length} overdue invoice(s) totaling SAR ${totalOverdue.toLocaleString()}. Follow up to improve cash flow.`,
        actionUrl: "/invoices",
      });
    }

    // Check for late deliveries
    const lateDeliveries = deliveries.filter(d => {
      if (d.status === "delivered" || d.status === "cancelled") return false;
      if (!d.expectedDate) return false;
      return new Date(d.expectedDate) < new Date();
    });
    if (lateDeliveries.length > 0) {
      smartAlerts.push({
        type: "warning",
        category: "Delivery Delay",
        message: `${lateDeliveries.length} delivery(ies) are past their expected date. Contact suppliers/logistics to resolve delays.`,
        actionUrl: "/deliveries",
      });
    }

    // Check for low stock items
    const lowStockProducts = products.filter(
      p =>
        Number(p.quantity || 0) <= Number(p.reorderLevel || 0) &&
        Number(p.quantity || 0) > 0
    );
    if (lowStockProducts.length > 0) {
      smartAlerts.push({
        type: "warning",
        category: "Inventory Alert",
        message: `${lowStockProducts.length} product(s) are running low on stock. Consider placing purchase orders.`,
        actionUrl: "/inventory",
      });
    }

    // Check for out of stock items
    const outOfStockProducts = products.filter(
      p => Number(p.quantity || 0) === 0
    );
    if (outOfStockProducts.length > 0) {
      smartAlerts.push({
        type: "critical",
        category: "Inventory Critical",
        message: `${outOfStockProducts.length} product(s) are completely out of stock! Immediate action required.`,
        actionUrl: "/inventory",
      });
    }

    // Check for over-budget items
    const overBudgets = budgets.filter(
      b => Number(b.spent || 0) > Number(b.amount || 0)
    );
    if (overBudgets.length > 0) {
      smartAlerts.push({
        type: "critical",
        category: "Budget Alert",
        message: `${overBudgets.length} budget(s) have exceeded their allocated amount. Review spending immediately.`,
        actionUrl: "/budgets",
      });
    }

    // Check for budgets near limit (>90%)
    const nearLimitBudgets = budgets.filter(b => {
      const utilization =
        (Number(b.spent || 0) / Number(b.amount || 1)) * 100;
      return utilization >= 90 && utilization <= 100;
    });
    if (nearLimitBudgets.length > 0) {
      smartAlerts.push({
        type: "warning",
        category: "Budget Warning",
        message: `${nearLimitBudgets.length} budget(s) are at 90%+ utilization. Monitor spending closely.`,
        actionUrl: "/budgets",
      });
    }

    // AI Insights
    const insights: Array<{
      type: "info" | "warning" | "success";
      message: string;
    }> = [];

    // Notification engagement analysis
    if (summary.readRate < 50) {
      insights.push({
        type: "warning",
        message: `Your notification read rate is ${summary.readRate}%. Consider reviewing and clearing notifications regularly for better workflow management.`,
      });
    } else if (summary.readRate >= 80) {
      insights.push({
        type: "success",
        message: `Great job! You maintain an ${summary.readRate}% notification read rate, showing excellent engagement with system alerts.`,
      });
    }

    // Unread notification backlog
    if (summary.unreadCount > 20) {
      insights.push({
        type: "warning",
        message: `You have ${summary.unreadCount} unread notifications. Consider using filters or bulk actions to manage your notification backlog.`,
      });
    }

    // Urgent notifications
    if (summary.urgentCount > 0) {
      insights.push({
        type: "warning",
        message: `${summary.urgentCount} urgent notification(s) require immediate attention. Address these first.`,
      });
    }

    // Most common notification type
    const topType = Object.entries(byType).sort((a, b) => b[1] - a[1])[0];
    if (topType) {
      insights.push({
        type: "info",
        message: `Your most frequent notification type is "${topType[0]}" (${topType[1]} notifications). This indicates where most system activity is occurring.`,
      });
    }

    // Recent notification trends (last 24h vs previous)
    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;
    const twoDaysAgo = now - 48 * 60 * 60 * 1000;

    const last24h = allNotifications.filter(
      n => new Date(n.createdAt).getTime() > dayAgo
    ).length;
    const previous24h = allNotifications.filter(n => {
      const ts = new Date(n.createdAt).getTime();
      return ts > twoDaysAgo && ts <= dayAgo;
    }).length;

    if (last24h > previous24h * 1.5 && previous24h > 0) {
      insights.push({
        type: "info",
        message: `Notification volume increased ${Math.round(((last24h - previous24h) / previous24h) * 100)}% in the last 24 hours. Higher activity detected.`,
      });
    }

    // Prioritized notifications (smart sorting)
    const prioritizedNotifications = [...unreadNotifications]
      .sort((a, b) => {
        // Priority score: urgent=4, high=3, normal=2, low=1
        const priorityScore: Record<string, number> = {
          urgent: 4,
          high: 3,
          normal: 2,
          low: 1,
        };
        const scoreA = priorityScore[a.priority] || 2;
        const scoreB = priorityScore[b.priority] || 2;

        if (scoreA !== scoreB) return scoreB - scoreA;

        // Then by recency
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      })
      .slice(0, 10);

    // Notification velocity (average per day over last 7 days)
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const lastWeekNotifications = allNotifications.filter(
      n => new Date(n.createdAt).getTime() > weekAgo
    );
    const avgPerDay = Math.round(lastWeekNotifications.length / 7);

    return {
      summary,
      byType,
      byCategory,
      smartAlerts,
      insights,
      prioritizedNotifications,
      metrics: {
        avgNotificationsPerDay: avgPerDay,
        last24hCount: last24h,
        previous24hCount: previous24h,
        weeklyTotal: lastWeekNotifications.length,
      },
    };
  }),

  // Get notification preferences/settings analysis
  preferences: protectedProcedure.query(async ({ ctx }) => {
    const notifications = await db.getUserNotifications(ctx.user.id);

    // Analyze notification patterns to suggest preferences
    const typeFrequency: Record<string, number> = {};
    const categoryFrequency: Record<string, number> = {};
    const readRateByType: Record<string, { read: number; total: number }> =
      {};

    for (const n of notifications) {
      typeFrequency[n.type] = (typeFrequency[n.type] || 0) + 1;

      const cat = n.category || "general";
      categoryFrequency[cat] = (categoryFrequency[cat] || 0) + 1;

      if (!readRateByType[n.type]) {
        readRateByType[n.type] = { read: 0, total: 0 };
      }
      readRateByType[n.type].total++;
      if (n.isRead) readRateByType[n.type].read++;
    }

    // Calculate engagement scores
    const engagementScores = Object.entries(readRateByType).map(
      ([type, stats]) => ({
        type,
        readRate: Math.round((stats.read / stats.total) * 100),
        count: stats.total,
        suggestion:
          stats.read / stats.total < 0.3
            ? "Consider muting or consolidating these notifications"
            : stats.read / stats.total > 0.8
              ? "High engagement - keep these enabled"
              : "Normal engagement",
      })
    );

    return {
      typeFrequency,
      categoryFrequency,
      engagementScores: engagementScores.sort((a, b) => b.count - a.count),
      recommendations: engagementScores
        .filter(e => e.readRate < 30)
        .map(
          e =>
            `Consider reducing "${e.type}" notifications (only ${e.readRate}% read rate)`
        ),
    };
  }),
});
