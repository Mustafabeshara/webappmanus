import { z } from "zod";
import { router, protectedProcedure, protectedMutationProcedure } from "../_core/trpc";
import * as db from "../db";

/**
 * Analytics Router
 *
 * Provides comprehensive business analytics including:
 * - Dashboard metrics and aggregated data
 * - Financial forecasts
 * - Anomaly detection and management
 * - AI-powered business insights
 */
export const analyticsRouter = router({
  /**
   * Dashboard - Aggregated metrics across all business areas
   * Returns summary counts and status for budgets, tenders, invoices, expenses, inventory, and anomalies
   */
  dashboard: protectedProcedure.query(async () => {
    const budgets = await db.getAllBudgets();
    const tenders = await db.getAllTenders();
    const invoices = await db.getAllInvoices();
    const expenses = await db.getAllExpenses();
    const lowStock = await db.getLowStockItems();
    const anomalies = await db.getActiveAnomalies();

    return {
      budgets: {
        total: budgets.length,
        active: budgets.filter(b => b.status === "active").length,
        overBudget: budgets.filter(b => b.spentAmount > b.allocatedAmount)
          .length,
      },
      tenders: {
        total: tenders.length,
        open: tenders.filter(t => t.status === "open").length,
        awarded: tenders.filter(t => t.status === "awarded").length,
      },
      invoices: {
        total: invoices.length,
        unpaid: invoices.filter(i => i.status !== "paid").length,
        overdue: invoices.filter(i => i.status === "overdue").length,
      },
      expenses: {
        total: expenses.length,
        pending: expenses.filter(e => e.status === "pending").length,
      },
      inventory: {
        lowStock: lowStock.length,
      },
      anomalies: {
        active: anomalies.length,
        critical: anomalies.filter(a => a.severity === "critical").length,
      },
    };
  }),

  /**
   * Forecasts - Retrieve all financial and business forecasts
   * Returns predictive analytics data for planning and decision-making
   */
  forecasts: protectedProcedure.query(async () => {
    return await db.getAllForecasts();
  }),

  /**
   * Anomalies - Retrieve all detected anomalies
   * Returns system-detected irregularities and unusual patterns in business data
   */
  anomalies: protectedProcedure.query(async () => {
    return await db.getAllAnomalies();
  }),

  /**
   * Update Anomaly - Update anomaly status and add notes
   * Used to acknowledge, investigate, resolve, or mark anomalies as false positives
   */
  updateAnomaly: protectedMutationProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum([
          "new",
          "acknowledged",
          "investigating",
          "resolved",
          "false_positive",
        ]),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;

      if (data.status === "resolved") {
        (data as any).resolvedBy = ctx.user.id;
        (data as any).resolvedAt = new Date();
      }

      await db.updateAnomaly(id, data);
      return { success: true };
    }),

  /**
   * AI Insights - Comprehensive business analytics powered by intelligent data analysis
   *
   * Provides deep insights including:
   * - Financial summary (revenue, expenses, profit, pending/overdue amounts)
   * - Tender performance (win rate, average value, recent activity)
   * - Delivery performance (on-time rate, quality metrics)
   * - Budget health (utilization, over-budget alerts)
   * - Inventory alerts (low stock, out of stock warnings)
   * - Customer insights (active customers, engagement rates)
   * - Supplier performance (ratings, reliability)
   * - Monthly trends (6-month historical data)
   * - AI-generated insights with priority levels
   * - Top customer analysis by revenue
   */
  aiInsights: protectedProcedure.query(async () => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const [
      tenders,
      budgets,
      invoices,
      expenses,
      deliveries,
      customers,
      products,
      suppliers,
    ] = await Promise.all([
      db.getAllTenders(),
      db.getAllBudgets(),
      db.getAllInvoices(),
      db.getAllExpenses(),
      db.getAllDeliveries(),
      db.getAllCustomers(),
      db.getAllProducts(),
      db.getAllSuppliers(),
    ]);

    // Financial metrics
    const totalRevenue = invoices
      .filter(i => i.status === "paid")
      .reduce((sum, i) => sum + i.totalAmount, 0);
    const totalExpenses = expenses
      .filter(e => e.status === "approved")
      .reduce((sum, e) => sum + e.amount, 0);
    const pendingRevenue = invoices
      .filter(i => i.status !== "paid" && i.status !== "cancelled")
      .reduce((sum, i) => sum + (i.totalAmount - (i.paidAmount || 0)), 0);
    const overdueRevenue = invoices
      .filter(i => i.status === "overdue")
      .reduce((sum, i) => sum + (i.totalAmount - (i.paidAmount || 0)), 0);

    // Tender performance
    const recentTenders = tenders.filter(
      t => new Date(t.createdAt) >= thirtyDaysAgo
    );
    const awardedTenders = tenders.filter(t => t.status === "awarded");
    const totalTenderValue = awardedTenders.reduce(
      (sum, t) => sum + (t.awardedValue || t.estimatedValue || 0),
      0
    );
    const avgTenderValue =
      awardedTenders.length > 0
        ? Math.round(totalTenderValue / awardedTenders.length)
        : 0;
    const tenderWinRate =
      tenders.length > 0
        ? Math.round(
            (awardedTenders.length /
              tenders.filter(t => t.status !== "draft" && t.status !== "open")
                .length) *
              100
          ) || 0
        : 0;

    // Delivery performance
    const completedDeliveries = deliveries.filter(
      d => d.status === "delivered"
    );
    const onTimeDeliveries = completedDeliveries.filter(d => {
      if (!d.deliveredDate || !d.scheduledDate) return false;
      return new Date(d.deliveredDate) <= new Date(d.scheduledDate);
    });
    const onTimeRate =
      completedDeliveries.length > 0
        ? Math.round(
            (onTimeDeliveries.length / completedDeliveries.length) * 100
          )
        : 100;

    // Budget health
    const activeBudgets = budgets.filter(b => b.status === "active");
    const overBudgetCount = activeBudgets.filter(
      b => b.spentAmount > b.allocatedAmount
    ).length;
    const totalBudgetAllocated = activeBudgets.reduce(
      (sum, b) => sum + b.allocatedAmount,
      0
    );
    const totalBudgetSpent = activeBudgets.reduce(
      (sum, b) => sum + b.spentAmount,
      0
    );
    const budgetUtilization =
      totalBudgetAllocated > 0
        ? Math.round((totalBudgetSpent / totalBudgetAllocated) * 100)
        : 0;

    // Inventory health
    const lowStockItems = products.filter(
      p => p.quantity <= (p.minStockLevel || 10)
    );
    const outOfStockItems = products.filter(p => p.quantity === 0);
    const inventoryValue = products.reduce(
      (sum, p) => sum + p.quantity * (p.unitPrice || 0),
      0
    );

    // Customer insights
    const activeCustomers = customers.filter(c => {
      const hasRecentInvoice = invoices.some(
        i => i.customerId === c.id && new Date(i.createdAt) >= thirtyDaysAgo
      );
      const hasRecentDelivery = deliveries.some(
        d => d.customerId === c.id && new Date(d.createdAt) >= thirtyDaysAgo
      );
      return hasRecentInvoice || hasRecentDelivery;
    });

    // Supplier performance
    const activeSuppliers = suppliers.filter(s => s.status === "active");
    const avgSupplierRating =
      activeSuppliers.length > 0
        ? Math.round(
            activeSuppliers.reduce(
              (sum, s) => sum + (s.performanceScore || 0),
              0
            ) / activeSuppliers.length
          )
        : 0;

    // Generate AI insights
    const insights: {
      type: "success" | "warning" | "info" | "critical";
      category: string;
      message: string;
      priority: number;
    }[] = [];

    // Financial insights
    if (overdueRevenue > 0) {
      insights.push({
        type: overdueRevenue > totalRevenue * 0.2 ? "critical" : "warning",
        category: "Finance",
        message: `SAR ${(overdueRevenue / 100).toLocaleString()} in overdue invoices requiring immediate follow-up`,
        priority: overdueRevenue > totalRevenue * 0.2 ? 1 : 2,
      });
    }
    if (pendingRevenue > totalRevenue * 0.5) {
      insights.push({
        type: "info",
        category: "Finance",
        message: `SAR ${(pendingRevenue / 100).toLocaleString()} in pending revenue - consider sending payment reminders`,
        priority: 3,
      });
    }
    if (totalRevenue > totalExpenses * 1.5) {
      insights.push({
        type: "success",
        category: "Finance",
        message:
          "Strong revenue-to-expense ratio indicates healthy financial position",
        priority: 5,
      });
    }

    // Tender insights
    if (tenderWinRate >= 50) {
      insights.push({
        type: "success",
        category: "Tenders",
        message: `${tenderWinRate}% tender win rate - excellent competitive positioning`,
        priority: 4,
      });
    } else if (tenderWinRate < 25 && tenders.length > 5) {
      insights.push({
        type: "warning",
        category: "Tenders",
        message: `Low tender win rate (${tenderWinRate}%) - review pricing strategy and proposal quality`,
        priority: 2,
      });
    }
    if (recentTenders.length === 0) {
      insights.push({
        type: "info",
        category: "Tenders",
        message:
          "No new tenders in the last 30 days - consider expanding market outreach",
        priority: 3,
      });
    }

    // Delivery insights
    if (onTimeRate < 80) {
      insights.push({
        type: "warning",
        category: "Deliveries",
        message: `On-time delivery rate at ${onTimeRate}% - review logistics processes`,
        priority: 2,
      });
    } else if (onTimeRate >= 95) {
      insights.push({
        type: "success",
        category: "Deliveries",
        message: `Excellent on-time delivery rate of ${onTimeRate}%`,
        priority: 5,
      });
    }

    // Budget insights
    if (overBudgetCount > 0) {
      insights.push({
        type: "critical",
        category: "Budget",
        message: `${overBudgetCount} budget(s) exceeded allocated amount - immediate review needed`,
        priority: 1,
      });
    }
    if (budgetUtilization > 90) {
      insights.push({
        type: "warning",
        category: "Budget",
        message: `Budget utilization at ${budgetUtilization}% - consider reallocation or additional funding`,
        priority: 2,
      });
    }

    // Inventory insights
    if (outOfStockItems.length > 0) {
      insights.push({
        type: "critical",
        category: "Inventory",
        message: `${outOfStockItems.length} product(s) out of stock - urgent replenishment needed`,
        priority: 1,
      });
    } else if (lowStockItems.length > 0) {
      insights.push({
        type: "warning",
        category: "Inventory",
        message: `${lowStockItems.length} product(s) running low on stock`,
        priority: 2,
      });
    }

    // Customer insights
    if (
      activeCustomers.length < customers.length * 0.5 &&
      customers.length > 5
    ) {
      insights.push({
        type: "info",
        category: "Customers",
        message:
          "Less than 50% of customers active in last 30 days - consider re-engagement campaigns",
        priority: 3,
      });
    }

    // Sort insights by priority
    insights.sort((a, b) => a.priority - b.priority);

    // Monthly trend data (last 6 months)
    const monthlyTrends = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const monthRevenue = invoices
        .filter(inv => {
          const d = new Date(inv.paidAt || inv.createdAt);
          return d >= monthStart && d <= monthEnd && inv.status === "paid";
        })
        .reduce((sum, inv) => sum + inv.totalAmount, 0);

      const monthExpenses = expenses
        .filter(exp => {
          const d = new Date(exp.approvedAt || exp.createdAt);
          return (
            d >= monthStart && d <= monthEnd && exp.status === "approved"
          );
        })
        .reduce((sum, exp) => sum + exp.amount, 0);

      const monthTenders = tenders.filter(t => {
        const d = new Date(t.createdAt);
        return d >= monthStart && d <= monthEnd;
      }).length;

      monthlyTrends.push({
        month: monthStart.toLocaleDateString("en-US", {
          month: "short",
          year: "2-digit",
        }),
        revenue: Math.round(monthRevenue / 100),
        expenses: Math.round(monthExpenses / 100),
        tenders: monthTenders,
      });
    }

    return {
      summary: {
        totalRevenue: Math.round(totalRevenue / 100),
        totalExpenses: Math.round(totalExpenses / 100),
        netProfit: Math.round((totalRevenue - totalExpenses) / 100),
        pendingRevenue: Math.round(pendingRevenue / 100),
        overdueRevenue: Math.round(overdueRevenue / 100),
        inventoryValue: Math.round(inventoryValue / 100),
      },
      metrics: {
        tenderWinRate,
        avgTenderValue: Math.round(avgTenderValue / 100),
        onTimeDeliveryRate: onTimeRate,
        budgetUtilization,
        activeCustomers: activeCustomers.length,
        totalCustomers: customers.length,
        avgSupplierRating,
        activeSuppliers: activeSuppliers.length,
      },
      alerts: {
        overBudgetCount,
        lowStockCount: lowStockItems.length,
        outOfStockCount: outOfStockItems.length,
        overdueInvoices: invoices.filter(i => i.status === "overdue").length,
        pendingDeliveries: deliveries.filter(
          d => d.status === "planned" || d.status === "in_transit"
        ).length,
      },
      insights: insights.slice(0, 8),
      trends: monthlyTrends,
      topCustomers: customers
        .map(c => {
          const customerRevenue = invoices
            .filter(i => i.customerId === c.id && i.status === "paid")
            .reduce((sum, i) => sum + i.totalAmount, 0);
          return {
            id: c.id,
            name: c.name,
            revenue: Math.round(customerRevenue / 100),
            invoiceCount: invoices.filter(i => i.customerId === c.id).length,
          };
        })
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5),
    };
  }),
});
