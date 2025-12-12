import { z } from "zod";
import { router, protectedProcedure, protectedMutationProcedure } from "../_core/trpc";
import * as db from "../db";
import * as utils from "../_core/utils";

/**
 * Invoices Router
 * Handles invoice management including CRUD operations,
 * pagination, and comprehensive AI-powered analytics
 */
export const invoicesRouter = router({
  /**
   * List all invoices with pagination support
   */
  list: protectedProcedure
    .input(
      z
        .object({
          page: z.number().min(1).default(1),
          limit: z.number().min(1).max(100).default(20),
          status: z
            .enum(["draft", "sent", "paid", "overdue", "cancelled"])
            .optional(),
          customerId: z.number().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const page = input?.page ?? 1;
      const limit = input?.limit ?? 20;
      const offset = (page - 1) * limit;

      const allInvoices = await db.getAllInvoices();

      // Apply filters
      let filteredInvoices = allInvoices;

      if (input?.status) {
        filteredInvoices = filteredInvoices.filter(
          (inv) => inv.status === input.status
        );
      }

      if (input?.customerId) {
        filteredInvoices = filteredInvoices.filter(
          (inv) => inv.customerId === input.customerId
        );
      }

      // Calculate pagination
      const total = filteredInvoices.length;
      const totalPages = Math.ceil(total / limit);
      const paginatedInvoices = filteredInvoices.slice(offset, offset + limit);

      return {
        invoices: paginatedInvoices,
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
   * Get a single invoice by ID with its items
   */
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const invoice = await db.getInvoiceById(input.id);
      const items = await db.getInvoiceItems(input.id);
      return { invoice, items };
    }),

  /**
   * Create a new invoice with items
   */
  create: protectedMutationProcedure
    .input(
      z.object({
        customerId: z.number(),
        tenderId: z.number().optional(),
        dueDate: z.date(),
        subtotal: z.number(),
        taxAmount: z.number().optional(),
        totalAmount: z.number(),
        paymentTerms: z.string().optional(),
        notes: z.string().optional(),
        items: z.array(
          z.object({
            productId: z.number().optional(),
            description: z.string(),
            quantity: z.number(),
            unitPrice: z.number(),
            totalPrice: z.number(),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { items, ...invoiceData } = input;
      const invoiceNumber = utils.generateInvoiceNumber();

      const result = await db.createInvoice({
        ...invoiceData,
        invoiceNumber,
        taxAmount: invoiceData.taxAmount || 0,
        createdBy: ctx.user.id,
      } as any);

      const invoiceId = Number(result.insertId);

      for (const item of items) {
        await db.createInvoiceItem({
          invoiceId,
          ...item,
        } as any);
      }

      return { success: true, invoiceId, invoiceNumber };
    }),

  /**
   * Update an existing invoice
   */
  update: protectedMutationProcedure
    .input(
      z.object({
        id: z.number(),
        status: z
          .enum(["draft", "sent", "paid", "overdue", "cancelled"])
          .optional(),
        paidAmount: z.number().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateInvoice(id, data);
      return { success: true };
    }),

  /**
   * AI-powered comprehensive invoice analytics
   * Provides insights including:
   * - Status breakdown and financial summary
   * - Outstanding, paid, and overdue amounts
   * - Customer payment history and reliability scores
   * - Overdue invoices list with days overdue
   * - Upcoming due invoices (next 14 days)
   * - Unmatched awarded tenders
   * - AI-generated insights and recommendations
   */
  aiAnalysis: protectedProcedure.query(async () => {
    const invoices = await db.getAllInvoices();
    const customers = await db.getAllCustomers();
    const tenders = await db.getAllTenders();

    const customerMap = new Map(customers.map((c) => [c.id, c]));
    const now = new Date();

    // Invoice status breakdown
    const statusCounts = {
      draft: 0,
      sent: 0,
      paid: 0,
      overdue: 0,
      cancelled: 0,
    };

    let totalOutstanding = 0;
    let totalPaid = 0;
    let totalOverdue = 0;
    const overdueInvoices: any[] = [];
    const upcomingDue: any[] = [];
    const customerPaymentHistory: Record<
      number,
      { paid: number; total: number; avgDays: number[] }
    > = {};

    for (const inv of invoices) {
      // Count by status - cast to string to handle TypeScript inference issues
      const status = inv.status as string;
      if (status in statusCounts) {
        statusCounts[status as keyof typeof statusCounts]++;
      }

      // Calculate amounts
      if (status === "paid") {
        totalPaid += inv.totalAmount;
      } else if (status !== "cancelled") {
        const outstanding = inv.totalAmount - (inv.paidAmount || 0);
        totalOutstanding += outstanding;

        // Check if overdue
        const dueDate = new Date(inv.dueDate);
        if (dueDate < now && status !== "paid") {
          totalOverdue += outstanding;
          overdueInvoices.push({
            id: inv.id,
            invoiceNumber: inv.invoiceNumber,
            customerName:
              customerMap.get(inv.customerId)?.name ||
              `Customer #${inv.customerId}`,
            amount: inv.totalAmount,
            dueDate: inv.dueDate,
            daysOverdue: Math.floor(
              (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
            ),
          });
        }

        // Check upcoming due (next 14 days)
        const daysUntilDue = Math.floor(
          (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysUntilDue > 0 && daysUntilDue <= 14) {
          upcomingDue.push({
            id: inv.id,
            invoiceNumber: inv.invoiceNumber,
            customerName:
              customerMap.get(inv.customerId)?.name ||
              `Customer #${inv.customerId}`,
            amount: outstanding,
            dueDate: inv.dueDate,
            daysUntilDue,
          });
        }
      }

      // Track customer payment patterns
      if (!customerPaymentHistory[inv.customerId]) {
        customerPaymentHistory[inv.customerId] = {
          paid: 0,
          total: 0,
          avgDays: [],
        };
      }
      customerPaymentHistory[inv.customerId].total++;
      if (inv.status === "paid") {
        customerPaymentHistory[inv.customerId].paid++;
      }
    }

    // Calculate customer reliability scores
    const customerScores = Object.entries(customerPaymentHistory).map(
      ([customerId, data]) => {
        const paymentRate =
          data.total > 0 ? (data.paid / data.total) * 100 : 0;
        return {
          customerId: Number(customerId),
          customerName:
            customerMap.get(Number(customerId))?.name ||
            `Customer #${customerId}`,
          totalInvoices: data.total,
          paidInvoices: data.paid,
          paymentRate: Math.round(paymentRate),
          riskLevel:
            paymentRate >= 90 ? "low" : paymentRate >= 70 ? "medium" : "high",
        };
      }
    );

    // Generate AI insights
    const insights: Array<{
      type: "warning" | "info" | "success";
      message: string;
    }> = [];

    if (overdueInvoices.length > 0) {
      insights.push({
        type: "warning",
        message: `${overdueInvoices.length} invoice(s) are overdue totaling KD ${(totalOverdue / 100).toLocaleString()}. Follow up immediately.`,
      });
    }

    if (upcomingDue.length > 0) {
      insights.push({
        type: "info",
        message: `${upcomingDue.length} invoice(s) due within 14 days. Send payment reminders.`,
      });
    }

    const highRiskCustomers = customerScores.filter(
      (c) => c.riskLevel === "high"
    );
    if (highRiskCustomers.length > 0) {
      insights.push({
        type: "warning",
        message: `${highRiskCustomers.length} customer(s) have low payment rates (<70%). Consider requiring advance payment.`,
      });
    }

    const collectionRate =
      invoices.length > 0 ? (statusCounts.paid / invoices.length) * 100 : 0;

    if (collectionRate >= 80) {
      insights.push({
        type: "success",
        message: `Excellent collection rate of ${Math.round(collectionRate)}%. Keep up the good work!`,
      });
    }

    // Invoice-tender matching opportunities
    const unmatchedTenders = tenders.filter(
      (t) =>
        t.status === "awarded" && !invoices.some((inv) => inv.tenderId === t.id)
    );

    if (unmatchedTenders.length > 0) {
      insights.push({
        type: "info",
        message: `${unmatchedTenders.length} awarded tender(s) without invoices. Consider generating invoices.`,
      });
    }

    return {
      summary: {
        totalInvoices: invoices.length,
        totalOutstanding: totalOutstanding / 100,
        totalPaid: totalPaid / 100,
        totalOverdue: totalOverdue / 100,
        collectionRate: Math.round(collectionRate),
      },
      statusBreakdown: statusCounts,
      overdueInvoices: overdueInvoices
        .sort((a, b) => b.daysOverdue - a.daysOverdue)
        .slice(0, 10),
      upcomingDue: upcomingDue
        .sort((a, b) => a.daysUntilDue - b.daysUntilDue)
        .slice(0, 10),
      customerScores: customerScores
        .sort((a, b) => a.paymentRate - b.paymentRate)
        .slice(0, 10),
      unmatchedTenders: unmatchedTenders.slice(0, 5).map((t) => ({
        id: t.id,
        tenderNumber: t.referenceNumber,
        title: t.title,
        awardedValue: t.awardedValue,
      })),
      insights,
    };
  }),
});
