import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { notifyOwner } from "./_core/notification";
import { systemRouter } from "./_core/systemRouter";
import {
  adminMutationProcedure,
  adminProcedure,
  protectedMutationProcedure,
  protectedProcedure,
  publicProcedure,
  router,
  sensitiveProcedure,
  uploadProcedure,
} from "./_core/trpc";
import {
  budgetCategorySchemas,
  budgetSchemas,
  departmentSchemas,
  idSchema,
  requirementSchemas,
  userSchemas,
} from "./_core/validationSchemas";
import {
  analyzeExpenses,
  analyzeInventory,
  generateBudgetForecast,
  getAvailableProviders,
  isAIConfigured,
} from "./ai";
import {
  extractExpenseData,
  extractInvoiceData,
  extractTenderData,
  performOCR,
} from "./aiService";
import * as db from "./db";
import { EXPORT_CONFIGS, generateExport } from "./export";
import * as ocrService from "./ocr";
import { storagePut } from "./storage";
import * as utils from "./utils";

const REQUIREMENT_STATUSES = [
  "draft",
  "department_review",
  "committee_pending",
  "committee_approved",
  "submitted_to_cms",
  "budget_allocated",
  "tender_posted",
  "award_pending",
  "award_approved",
  "discount_requested",
  "contract_issued",
  "closed",
  "rejected",
] as const;

const APPROVAL_ROLES = [
  "head_of_department",
  "committee_head",
  "specialty_head",
  "fatwa",
  "ctc",
  "audit",
] as const;

const THRESHOLD_FATWA = 75_000 * 100; // cents
const THRESHOLD_CTC_AUDIT = 100_000 * 100; // cents

function determineApprovalGate(totalValueCents: number) {
  if (totalValueCents > THRESHOLD_CTC_AUDIT) return "ctc_audit";
  if (totalValueCents >= THRESHOLD_FATWA) return "fatwa";
  return "committee";
}

async function requireRequirementsPermission(
  ctx: { user: { id: number; role: string } },
  action: "view" | "create" | "edit" | "approve"
) {
  if (ctx.user.role === "admin") return;
  const allowed = await checkPermission(ctx.user.id, "requirements", action);
  if (!allowed) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Not authorized for requirements module",
    });
  }
}

function requiredApprovalsForGate(
  gate: (typeof APPROVAL_ROLES)[number] | string
) {
  if (gate === "ctc_audit") {
    return ["committee_head", "fatwa", "ctc", "audit"] as const;
  }
  if (gate === "fatwa") {
    return ["committee_head", "fatwa"] as const;
  }
  return ["committee_head"] as const;
}

function hasRequiredApprovals(
  approvals: Array<{ role: string; decision: string }>,
  gate: string
) {
  const needed = requiredApprovalsForGate(gate);
  return needed.every(role =>
    approvals.some(a => a.role === role && a.decision === "approved")
  );
}

// Simple text tokenization for matching
function tokenize(text: string | null | undefined): Set<string> {
  if (!text) return new Set();
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean)
  );
}

function scoreSupplierAgainstTender(
  tenderItems: Array<{ description?: string; specifications?: string }>,
  supplierProducts: Array<{
    name?: string;
    description?: string;
    specifications?: string;
  }>
) {
  let total = 0;
  let max = tenderItems.length * 100;

  for (const item of tenderItems) {
    const itemTokens = new Set([
      ...tokenize(item.description),
      ...tokenize(item.specifications),
    ]);
    let best = 0;
    for (const product of supplierProducts) {
      const productTokens = new Set([
        ...tokenize(product.name),
        ...tokenize(product.description),
        ...tokenize((product as any).specifications),
      ]);
      const intersection = [...itemTokens].filter(t => productTokens.has(t));
      const score =
        itemTokens.size === 0
          ? 0
          : Math.round((intersection.length / itemTokens.size) * 100);
      if (score > best) best = score;
    }
    total += best;
  }

  return {
    total,
    coveragePercent: max === 0 ? 0 : Math.round((total / max) * 100),
  };
}

// Note: adminProcedure is now imported from _core/trpc.ts

// Helper to check user permissions
async function checkPermission(
  userId: number,
  module: string,
  action: "view" | "create" | "edit" | "delete" | "approve"
) {
  const permissions = await db.getUserPermissions(userId);
  const modulePermission = permissions.find(p => p.module === module);

  if (!modulePermission) return false;

  const permissionMap = {
    view: modulePermission.canView,
    create: modulePermission.canCreate,
    edit: modulePermission.canEdit,
    delete: modulePermission.canDelete,
    approve: modulePermission.canApprove,
  };

  return permissionMap[action] || false;
}

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ============================================
  // USER MANAGEMENT
  // ============================================
  users: router({
    list: adminProcedure.query(async () => {
      return await db.getAllUsers();
    }),

    // Basic user list for non-admin users (e.g., for task assignment)
    listBasic: protectedProcedure.query(async () => {
      const users = await db.getAllUsers();
      // Return only id and name for non-admin use cases
      return users.map(u => ({ id: u.id, name: u.name }));
    }),

    updateRole: adminMutationProcedure
      .input(userSchemas.updateRole)
      .mutation(async ({ input }) => {
        await db.updateUserRole(input.userId, input.role);
        return { success: true };
      }),

    getPermissions: adminProcedure
      .input(z.object({ userId: idSchema }))
      .query(async ({ input }) => {
        return await db.getUserPermissions(input.userId);
      }),

    updatePermission: adminMutationProcedure
      .input(userSchemas.updatePermission)
      .mutation(async ({ input }) => {
        await db.upsertUserPermission(input);
        return { success: true };
      }),
  }),

  // ============================================
  // DEPARTMENTS
  // ============================================
  departments: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllDepartments();
    }),

    create: protectedMutationProcedure
      .input(departmentSchemas.create)
      .mutation(async ({ input, ctx }) => {
        const code = utils.generateDepartmentCode(input.name);
        await db.createDepartment({
          ...input,
          code,
          createdBy: ctx.user.id,
        } as any);
        return { success: true };
      }),

    update: protectedMutationProcedure
      .input(departmentSchemas.update)
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateDepartment(id, data);
        return { success: true };
      }),
  }),

  // ============================================
  // BUDGET CATEGORIES
  // ============================================
  budgetCategories: router({
    list: protectedProcedure.query(async () => {
      const categories = await db.getAllBudgetCategories();

      // Return default categories if none exist in database
      if (!categories || categories.length === 0) {
        return [
          {
            id: 1,
            name: "Medical Equipment",
            code: "MED-EQ",
            description: "Medical devices and equipment",
            parentId: null,
            isActive: true,
          },
          {
            id: 2,
            name: "Laboratory Supplies",
            code: "LAB-SUP",
            description: "Lab consumables and supplies",
            parentId: null,
            isActive: true,
          },
          {
            id: 3,
            name: "Pharmaceuticals",
            code: "PHARMA",
            description: "Medicines and pharmaceutical products",
            parentId: null,
            isActive: true,
          },
          {
            id: 4,
            name: "IT & Technology",
            code: "IT-TECH",
            description: "Computers, software, and IT services",
            parentId: null,
            isActive: true,
          },
          {
            id: 5,
            name: "Facilities & Maintenance",
            code: "FAC-MAINT",
            description: "Building maintenance and facilities",
            parentId: null,
            isActive: true,
          },
          {
            id: 6,
            name: "Office Supplies",
            code: "OFF-SUP",
            description: "General office supplies and stationery",
            parentId: null,
            isActive: true,
          },
          {
            id: 7,
            name: "Training & Development",
            code: "TRAIN-DEV",
            description: "Staff training and professional development",
            parentId: null,
            isActive: true,
          },
          {
            id: 8,
            name: "Biomedical Engineering",
            code: "BIOMED",
            description: "Biomedical equipment and services",
            parentId: null,
            isActive: true,
          },
          {
            id: 9,
            name: "Capital Projects",
            code: "CAP-PROJ",
            description: "Major capital expenditures",
            parentId: null,
            isActive: true,
          },
          {
            id: 10,
            name: "Operational Expenses",
            code: "OPS-EXP",
            description: "Day-to-day operational costs",
            parentId: null,
            isActive: true,
          },
        ];
      }

      return categories;
    }),

    create: protectedMutationProcedure
      .input(budgetCategorySchemas.create)
      .mutation(async ({ input }) => {
        const code = utils.generateBudgetCategoryCode(input.name);
        await db.createBudgetCategory({
          ...input,
          code,
        } as any);
        return { success: true };
      }),
  }),

  // ============================================
  // BUDGETS
  // ============================================
  budgets: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllBudgets();
    }),

    get: protectedProcedure
      .input(budgetSchemas.get)
      .query(async ({ input }) => {
        return await db.getBudgetById(input.id);
      }),

    create: protectedMutationProcedure
      .input(budgetSchemas.create)
      .mutation(async ({ input, ctx }) => {
        await db.createBudget({
          ...input,
          createdBy: ctx.user.id,
        } as any);
        return { success: true };
      }),

    update: protectedMutationProcedure
      .input(budgetSchemas.update)
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateBudget(id, data);
        return { success: true };
      }),

    approve: protectedMutationProcedure
      .input(budgetSchemas.approve)
      .mutation(async ({ input, ctx }) => {
        const budget = await db.getBudgetById(input.id);
        if (!budget) throw new TRPCError({ code: "NOT_FOUND" });

        await db.updateBudget(input.id, {
          approvalStatus: input.approved ? "approved" : "rejected",
          approvedBy: ctx.user.id,
          approvedAt: new Date(),
        });

        // Notify owner of budget approval/rejection
        await notifyOwner({
          title: `Budget ${input.approved ? "Approved" : "Rejected"}`,
          content: `Budget "${budget.name}" has been ${input.approved ? "approved" : "rejected"} by ${ctx.user.name}`,
        });

        return { success: true };
      }),

    // AI-powered budget forecasting
    forecast: protectedProcedure
      .input(
        z.object({
          timeframeDays: z.number().default(90),
        })
      )
      .mutation(async ({ input }) => {
        // Get all budgets
        const budgets = await db.getAllBudgets();

        // Get all expenses for trend analysis
        const expenses = await db.getAllExpenses();

        // Transform data for the AI forecasting service
        const budgetData = budgets.map(b => ({
          id: b.id,
          name: b.name,
          fiscalYear: b.fiscalYear,
          allocatedAmount: b.allocatedAmount,
          spentAmount: b.spentAmount,
          departmentId: b.departmentId,
          status: b.status,
        }));

        const expenseData = expenses.map(e => ({
          id: e.id,
          amount: e.amount,
          date: e.expenseDate || e.createdAt || new Date(),
          category: e.title || null,
          vendorName: null,
        }));

        // Generate forecast
        const forecast = await generateBudgetForecast(
          budgetData,
          expenseData,
          input.timeframeDays
        );

        return { forecast };
      }),

    getAIStatus: protectedProcedure.query(async () => {
      return {
        configured: isAIConfigured(),
        providers: getAvailableProviders(),
      };
    }),
  }),

  // ============================================
  // REQUIREMENTS & CMS WORKFLOW
  // ============================================
  requirements: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      await requireRequirementsPermission(ctx, "view");
      return await db.getAllRequirementRequests();
    }),

    get: protectedProcedure
      .input(requirementSchemas.get)
      .query(async ({ input, ctx }) => {
        await requireRequirementsPermission(ctx, "view");
        return await db.getRequirementRequestById(input.id);
      }),

    create: protectedMutationProcedure
      .input(requirementSchemas.create)
      .mutation(async ({ input, ctx }) => {
        await requireRequirementsPermission(ctx, "create");
        const totalValue = input.items.reduce(
          (sum, item) => sum + item.estimatedUnitPrice * item.quantity,
          0
        );
        const gate = determineApprovalGate(totalValue);

        const { requestId } = await db.createRequirementRequest(
          {
            hospital: input.hospital,
            specialty: input.specialty,
            departmentId: input.departmentId,
            fiscalYear: input.fiscalYear,
            notes: input.notes,
            approvalGate: gate,
            status: "draft",
            createdBy: ctx.user.id,
          } as any,
          input.items as any
        );

        await db.createAuditLog({
          userId: ctx.user.id,
          action: "create",
          entityType: "requirements_request",
          entityId: requestId,
          changes: JSON.stringify({ totalValue, approvalGate: gate }),
          ipAddress: ctx.req.ip,
          userAgent: ctx.req.headers["user-agent"],
        } as any);

        return { requestId, totalValue, approvalGate: gate };
      }),

    updateStatus: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          status: z.enum(REQUIREMENT_STATUSES),
        })
      )
      .mutation(async ({ input, ctx }) => {
        await requireRequirementsPermission(ctx, "edit");

        const requirement = await db.getRequirementRequestById(input.id);
        if (!requirement) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Requirement not found",
          });
        }

        const approvals = (requirement as any).approvals || [];
        const needsApprovalForStatus = new Set([
          "submitted_to_cms",
          "budget_allocated",
          "tender_posted",
          "award_pending",
          "award_approved",
          "discount_requested",
          "contract_issued",
          "closed",
        ]);

        if (
          needsApprovalForStatus.has(input.status) &&
          !hasRequiredApprovals(approvals, requirement.approvalGate)
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Required approvals not completed for this threshold",
          });
        }

        await db.updateRequirementStatus(input.id, input.status as any);
        await db.createAuditLog({
          userId: ctx.user.id,
          action: "update",
          entityType: "requirements_request",
          entityId: input.id,
          changes: JSON.stringify({ status: input.status }),
          ipAddress: ctx.req.ip,
          userAgent: ctx.req.headers["user-agent"],
        } as any);
        return { success: true };
      }),

    addApproval: protectedProcedure
      .input(
        z.object({
          requestId: z.number(),
          role: z.enum(APPROVAL_ROLES),
          decision: z.enum(["approved", "rejected"]),
          note: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        await requireRequirementsPermission(ctx, "approve");
        await db.addCommitteeApproval({
          requestId: input.requestId,
          role: input.role,
          decision: input.decision,
          note: input.note,
          approverId: ctx.user.id,
          approverName: ctx.user.name,
          decidedAt: new Date(),
        } as any);
        await db.createAuditLog({
          userId: ctx.user.id,
          action: "approve",
          entityType: "requirements_request",
          entityId: input.requestId,
          changes: JSON.stringify({
            role: input.role,
            decision: input.decision,
          }),
          ipAddress: ctx.req.ip,
          userAgent: ctx.req.headers["user-agent"],
        } as any);
        return { success: true };
      }),

    upsertCmsCase: protectedProcedure
      .input(
        z.object({
          requestId: z.number(),
          caseNumber: z.string().optional(),
          status: z
            .enum([
              "with_cms",
              "discount_requested",
              "awaiting_ctc",
              "awaiting_fatwa",
              "awaiting_audit",
              "contract_issued",
              "closed",
            ])
            .optional(),
          cmsContact: z.string().optional(),
          nextFollowupDate: z.string().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        await requireRequirementsPermission(ctx, "edit");
        const id = await db.upsertCmsCase(input.requestId, {
          caseNumber: input.caseNumber,
          status: input.status,
          cmsContact: input.cmsContact,
          nextFollowupDate: input.nextFollowupDate
            ? new Date(input.nextFollowupDate)
            : undefined,
          notes: input.notes,
        } as any);
        await db.createAuditLog({
          userId: ctx.user.id,
          action: "update",
          entityType: "requirements_request",
          entityId: input.requestId,
          changes: JSON.stringify({
            cmsCaseId: id,
            status: input.status,
            caseNumber: input.caseNumber,
          }),
          ipAddress: ctx.req.ip,
          userAgent: ctx.req.headers["user-agent"],
        } as any);
        return { success: true, cmsCaseId: id };
      }),

    addFollowup: protectedProcedure
      .input(
        z.object({
          requestId: z.number(),
          note: z.string(),
          contact: z.string().optional(),
          nextActionDate: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        await requireRequirementsPermission(ctx, "edit");
        await db.addCmsFollowup({
          requestId: input.requestId,
          note: input.note,
          contact: input.contact,
          followupDate: new Date(),
          nextActionDate: input.nextActionDate
            ? new Date(input.nextActionDate)
            : undefined,
          createdBy: ctx.user.id,
        } as any);
        await db.createAuditLog({
          userId: ctx.user.id,
          action: "update",
          entityType: "requirements_request",
          entityId: input.requestId,
          changes: JSON.stringify({ followup: input.note }),
          ipAddress: ctx.req.ip,
          userAgent: ctx.req.headers["user-agent"],
        } as any);
        return { success: true };
      }),
  }),

  // ============================================
  // SUPPLIERS
  // ============================================
  suppliers: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllSuppliers();
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getSupplierById(input.id);
      }),

    products: protectedProcedure
      .input(z.object({ supplierId: z.number() }))
      .query(async ({ input }) => {
        return await db.getProductsBySupplierId(input.supplierId);
      }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string(),
          contactPerson: z.string().optional(),
          email: z.string().optional(),
          phone: z.string().optional(),
          address: z.string().optional(),
          taxId: z.string().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const code = utils.generateSupplierCode();
        await db.createSupplier({
          ...input,
          code,
          createdBy: ctx.user.id,
        } as any);
        return { success: true, code };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          contactPerson: z.string().optional(),
          email: z.string().optional(),
          phone: z.string().optional(),
          address: z.string().optional(),
          taxId: z.string().optional(),
          complianceStatus: z
            .enum(["compliant", "pending", "non_compliant"])
            .optional(),
          rating: z.number().optional(),
          notes: z.string().optional(),
          isActive: z.boolean().optional(),
        })
      )
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
  }),

  // ============================================
  // CUSTOMERS
  // ============================================
  customers: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllCustomers();
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getCustomerById(input.id);
      }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string(),
          type: z.enum(["hospital", "clinic", "pharmacy", "other"]),
          contactPerson: z.string().optional(),
          email: z.string().optional(),
          phone: z.string().optional(),
          address: z.string().optional(),
          taxId: z.string().optional(),
          creditLimit: z.number().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const code = utils.generateCustomerCode();
        await db.createCustomer({
          ...input,
          code,
          createdBy: ctx.user.id,
        } as any);
        return { success: true, code };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          type: z.enum(["hospital", "clinic", "pharmacy", "other"]).optional(),
          contactPerson: z.string().optional(),
          email: z.string().optional(),
          phone: z.string().optional(),
          address: z.string().optional(),
          taxId: z.string().optional(),
          creditLimit: z.number().optional(),
          notes: z.string().optional(),
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateCustomer(id, data);
        return { success: true };
      }),

    getCommunications: protectedProcedure
      .input(z.object({ customerId: z.number() }))
      .query(async ({ input }) => {
        return await db.getCustomerCommunications(input.customerId);
      }),

    addCommunication: protectedProcedure
      .input(
        z.object({
          customerId: z.number(),
          type: z.enum(["email", "phone", "meeting", "note"]),
          subject: z.string().optional(),
          content: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        await db.createCustomerCommunication({
          ...input,
          contactedBy: ctx.user.id,
        } as any);
        return { success: true };
      }),
  }),

  // ============================================
  // PRODUCTS
  // ============================================
  products: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllProducts();
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const product = await db.getProductById(input.id);
        if (!product) return null;

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

    create: protectedProcedure
      .input(
        z.object({
          name: z.string(),
          description: z.string().optional(),
          category: z.string().optional(),
          manufacturerId: z.number().optional(),
          unitPrice: z.number().optional(),
          unit: z.string().optional(),
          specifications: z.string().optional(),
          // Inventory fields
          minStockLevel: z.number().optional(),
          maxStockLevel: z.number().optional(),
          initialQuantity: z.number().optional(),
          location: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
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

        return { success: true, sku, productId };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          description: z.string().optional(),
          category: z.string().optional(),
          manufacturerId: z.number().optional(),
          unitPrice: z.number().optional(),
          unit: z.string().optional(),
          specifications: z.string().optional(),
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateProduct(id, data);
        return { success: true };
      }),
  }),

  // ============================================
  // INVENTORY
  // ============================================
  inventory: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllInventory();
    }),

    lowStock: protectedProcedure.query(async () => {
      return await db.getLowStockItems();
    }),

    byProduct: protectedProcedure
      .input(z.object({ productId: z.number() }))
      .query(async ({ input }) => {
        return await db.getInventoryByProduct(input.productId);
      }),

    create: protectedProcedure
      .input(
        z.object({
          productId: z.number(),
          quantity: z.number(),
          batchNumber: z.string().optional(),
          expiryDate: z.date().optional(),
          location: z.string().optional(),
          minStockLevel: z.number().optional(),
          maxStockLevel: z.number().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        await db.createInventory(input as any);
        return { success: true };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          quantity: z.number().optional(),
          batchNumber: z.string().optional(),
          expiryDate: z.date().optional(),
          location: z.string().optional(),
          minStockLevel: z.number().optional(),
          maxStockLevel: z.number().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateInventory(id, data);
        return { success: true };
      }),

    // AI-powered inventory optimization
    optimize: protectedProcedure.mutation(async () => {
      // Get all inventory with product details
      const inventoryItems = await db.getAllInventory();
      const products = await db.getAllProducts();

      // Create a product lookup map
      const productMap = new Map(products.map(p => [p.id, p]));

      // Transform inventory data for AI analysis
      const itemsForAnalysis = inventoryItems.map(inv => {
        const product = productMap.get(inv.productId);
        return {
          id: inv.id,
          productId: inv.productId,
          productName: product?.name || `Product #${inv.productId}`,
          productSku: product?.sku || `SKU-${inv.productId}`,
          category: product?.category || undefined,
          quantity: inv.quantity,
          minStockLevel: inv.minStockLevel || 10,
          maxStockLevel: inv.maxStockLevel || undefined,
          unitPrice: product?.price || undefined,
          expiryDate: inv.expiryDate || null,
          location: inv.location || undefined,
          lastRestocked: inv.updatedAt || null,
        };
      });

      const analysis = await analyzeInventory(itemsForAnalysis);
      return { analysis };
    }),

    getAIStatus: protectedProcedure.query(async () => {
      return {
        configured: isAIConfigured(),
        providers: getAvailableProviders(),
      };
    }),
  }),

  // ============================================
  // TENDER TEMPLATES
  // ============================================
  tenderTemplates: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllTenderTemplates();
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const template = await db.getTenderTemplateById(input.id);
        const items = await db.getTemplateItems(input.id);
        return { template, items };
      }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string(),
          description: z.string().optional(),
          categoryId: z.number().optional(),
          departmentId: z.number().optional(),
          defaultRequirements: z.string().optional(),
          defaultTerms: z.string().optional(),
          items: z
            .array(
              z.object({
                productId: z.number().optional(),
                description: z.string(),
                quantity: z.number().optional(),
                unit: z.string().optional(),
                estimatedPrice: z.number().optional(),
                specifications: z.string().optional(),
              })
            )
            .optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { items, ...templateData } = input;

        const result = await db.createTenderTemplate({
          ...templateData,
          createdBy: ctx.user.id,
        } as any);

        const templateId = Number(result.insertId);

        if (items) {
          for (const item of items) {
            await db.createTemplateItem({
              templateId,
              ...item,
            } as any);
          }
        }

        return { success: true, templateId };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteTenderTemplate(input.id);
        return { success: true };
      }),
  }),

  // ============================================
  // TENDERS
  // ============================================
  tenders: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllTenders();
    }),

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

    create: protectedProcedure
      .input(
        z.object({
          title: z.string(),
          description: z.string().optional(),
          customerId: z.number().optional(),
          departmentId: z.number().optional(),
          categoryId: z.number().optional(),
          templateId: z.number().optional(),
          submissionDeadline: z.date().optional(),
          evaluationDeadline: z.date().optional(),
          requirements: z.string().optional(),
          terms: z.string().optional(),
          estimatedValue: z.number().optional(),
          items: z
            .array(
              z.object({
                productId: z.number().optional(),
                description: z.string(),
                quantity: z.number(),
                unit: z.string().optional(),
                specifications: z.string().optional(),
                estimatedPrice: z.number().optional(),
              })
            )
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

        if (items) {
          for (const item of items) {
            await db.createTenderItem({
              tenderId,
              ...item,
            } as any);
          }
        }

        return { success: true, tenderId, referenceNumber };
      }),

    // Bulk import up to 10 tenders at once (for historical data)
    bulkImport: protectedProcedure
      .input(
        z.object({
          tenders: z
            .array(
              z.object({
                title: z.string(),
                description: z.string().optional(),
                submissionDeadline: z.date().optional(),
                evaluationDeadline: z.date().optional(),
                requirements: z.string().optional(),
                terms: z.string().optional(),
                estimatedValue: z.number().optional(),
                status: z
                  .enum(["draft", "open", "awarded", "closed", "archived"])
                  .optional(),
                items: z
                  .array(
                    z.object({
                      description: z.string(),
                      quantity: z.number(),
                      unit: z.string().optional(),
                      estimatedPrice: z.number().optional(),
                    })
                  )
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

            if (items && items.length > 0) {
              for (const item of items) {
                await db.createTenderItem({
                  tenderId,
                  ...item,
                } as any);
              }
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

    // AI Analysis Endpoints
    analyze: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const { analyzeTender: analyzeAI } = await import(
          "./ai/tender-analysis"
        );

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

    getAIStatus: publicProcedure.query(async () => {
      const { getAIStatus } = await import("./ai/service");
      return getAIStatus();
    }),
  }),

  // ============================================
  // INVOICES
  // ============================================
  invoices: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllInvoices();
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const invoice = await db.getInvoiceById(input.id);
        const items = await db.getInvoiceItems(input.id);
        return { invoice, items };
      }),

    create: protectedProcedure
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

    update: protectedProcedure
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

    // AI-powered invoice analytics and insights
    aiAnalysis: protectedProcedure.query(async () => {
      const invoices = await db.getAllInvoices();
      const customers = await db.getAllCustomers();
      const tenders = await db.getAllTenders();
      const deliveries = await db.getAllDeliveries();

      const customerMap = new Map(customers.map(c => [c.id, c]));
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
        // Count by status
        statusCounts[inv.status as keyof typeof statusCounts]++;

        // Calculate amounts
        if (inv.status === "paid") {
          totalPaid += inv.totalAmount;
        } else if (inv.status !== "cancelled") {
          const outstanding = inv.totalAmount - (inv.paidAmount || 0);
          totalOutstanding += outstanding;

          // Check if overdue
          const dueDate = new Date(inv.dueDate);
          if (dueDate < now && inv.status !== "paid") {
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
        c => c.riskLevel === "high"
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
        t =>
          t.status === "awarded" && !invoices.some(inv => inv.tenderId === t.id)
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
        unmatchedTenders: unmatchedTenders.slice(0, 5).map(t => ({
          id: t.id,
          tenderNumber: t.tenderNumber,
          title: t.title,
          awardedValue: t.awardedValue,
        })),
        insights,
      };
    }),
  }),

  // ============================================
  // EXPENSES
  // ============================================
  expenses: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllExpenses();
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getExpenseById(input.id);
      }),

    create: protectedProcedure
      .input(
        z.object({
          title: z.string(),
          description: z.string().optional(),
          categoryId: z.number(),
          budgetId: z.number().optional(),
          departmentId: z.number().optional(),
          tenderId: z.number().optional(),
          amount: z.number(),
          expenseDate: z.date().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const expenseNumber = utils.generateExpenseNumber();

        const result = await db.createExpense({
          ...input,
          expenseNumber,
          createdBy: ctx.user.id,
        } as any);

        return { success: true, expenseNumber, id: Number(result.insertId) };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string().optional(),
          description: z.string().optional(),
          amount: z.number().optional(),
          status: z
            .enum(["draft", "pending", "approved", "rejected", "paid"])
            .optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateExpense(id, data);
        return { success: true };
      }),

    approve: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          approved: z.boolean(),
          rejectionReason: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const expense = await db.getExpenseById(input.id);
        if (!expense) throw new TRPCError({ code: "NOT_FOUND" });

        await db.updateExpense(input.id, {
          status: input.approved ? "approved" : "rejected",
          approvedBy: ctx.user.id,
          approvedAt: new Date(),
          rejectionReason: input.rejectionReason,
        });

        // Update budget spent amount if approved
        if (input.approved && expense.budgetId) {
          await db.updateBudgetSpent(expense.budgetId, expense.amount);

          // Check for budget overrun
          const budget = await db.getBudgetById(expense.budgetId);
          if (
            budget &&
            utils.isBudgetOverThreshold(
              budget.allocatedAmount,
              budget.spentAmount + expense.amount,
              90
            )
          ) {
            await notifyOwner({
              title: "Budget Alert: 90% Threshold Reached",
              content: `Budget "${budget.name}" has reached 90% of allocated amount`,
            });
          }
        }

        return { success: true };
      }),

    // AI-powered expense analysis
    analyze: protectedProcedure.mutation(async () => {
      // Get all expenses
      const expenses = await db.getAllExpenses();

      // Get budget categories for category suggestions
      const budgetCategories = await db.getAllBudgetCategories();
      const categoryNames = budgetCategories.map(c => c.name);

      // Transform expenses for AI analysis
      const expenseData = expenses.map(e => ({
        id: e.id,
        title: e.title,
        description: e.description || null,
        amount: e.amount,
        category: null, // We'll derive this from categoryId
        categoryId: e.categoryId,
        departmentId: e.departmentId,
        vendorName: null,
        expenseDate: e.expenseDate || e.createdAt || new Date(),
        status: e.status,
      }));

      // Run AI analysis
      const analysis = await analyzeExpenses(
        expenseData,
        categoryNames.length > 0
          ? categoryNames
          : [
              "Office Supplies",
              "Travel",
              "Software",
              "Equipment",
              "Marketing",
              "Professional Services",
              "Utilities",
              "Maintenance",
              "Training",
              "Medical",
            ]
      );

      return { analysis };
    }),

    getAIStatus: protectedProcedure.query(async () => {
      return {
        configured: isAIConfigured(),
        providers: getAvailableProviders(),
      };
    }),
  }),

  // ============================================
  // DELIVERIES
  // ============================================
  deliveries: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllDeliveries();
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const delivery = await db.getDeliveryById(input.id);
        const items = await db.getDeliveryItems(input.id);
        return { delivery, items };
      }),

    create: protectedProcedure
      .input(
        z.object({
          customerId: z.number(),
          tenderId: z.number().optional(),
          invoiceId: z.number().optional(),
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

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          status: z
            .enum(["planned", "in_transit", "delivered", "cancelled"])
            .optional(),
          deliveredDate: z.date().optional(),
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
            await db.updateInventoryQuantity(item.productId, item.quantity);
          }
        }

        return { success: true };
      }),

    // AI-powered delivery analytics and predictions
    aiAnalysis: protectedProcedure.query(async () => {
      const deliveries = await db.getAllDeliveries();
      const customers = await db.getAllCustomers();
      const suppliers = await db.getAllSuppliers();

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
  }),

  // ============================================
  // DOCUMENTS & AI EXTRACTION
  // ============================================
  documents: router({
    folders: router({
      list: protectedProcedure.query(async () => {
        return await db.getAllDocumentFolders();
      }),

      create: protectedProcedure
        .input(
          z.object({
            name: z.string(),
            category: z.string(),
            parentId: z.number().optional(),
            requiredDocuments: z.string().optional(),
            reminderEnabled: z.boolean().optional(),
          })
        )
        .mutation(async ({ input, ctx }) => {
          await db.createDocumentFolder({
            ...input,
            createdBy: ctx.user.id,
          } as any);
          return { success: true };
        }),
    }),

    byEntity: protectedProcedure
      .input(
        z.object({
          entityType: z.string(),
          entityId: z.number(),
        })
      )
      .query(async ({ input }) => {
        return await db.getDocumentsByEntity(input.entityType, input.entityId);
      }),

    upload: uploadProcedure
      .input(
        z.object({
          entityType: z.string(),
          entityId: z.number(),
          folderId: z.number().optional(),
          fileName: z.string(),
          fileData: z.string(), // base64
          mimeType: z.string(),
          documentType: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // Upload to S3
        const buffer = Buffer.from(input.fileData, "base64");
        const fileKey = `documents/${input.entityType}/${input.entityId}/${Date.now()}-${input.fileName}`;
        const { url } = await storagePut(fileKey, buffer, input.mimeType);

        // Save document record
        const result = await db.createDocument({
          folderId: input.folderId,
          entityType: input.entityType,
          entityId: input.entityId,
          fileName: input.fileName,
          fileKey,
          fileUrl: url,
          fileSize: buffer.length,
          mimeType: input.mimeType,
          documentType: input.documentType,
          uploadedBy: ctx.user.id,
        } as any);

        const documentId = Number(result.insertId);

        return { success: true, documentId, fileUrl: url };
      }),

    extractData: protectedProcedure
      .input(
        z.object({
          documentId: z.number(),
          extractionType: z.enum(["tender", "invoice", "expense"]),
        })
      )
      .mutation(async ({ input }) => {
        const document = await db.getDocumentById(input.documentId);

        if (!document)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Document not found",
          });

        // Update document status
        await db.updateDocument(input.documentId, {
          extractionStatus: "processing",
        });

        try {
          // Perform OCR if needed
          let documentText = "";
          if (
            document.mimeType?.startsWith("image/") ||
            document.mimeType === "application/pdf"
          ) {
            const ocrResult = await performOCR(document.fileUrl);
            if (!ocrResult.success) {
              throw new Error("OCR failed");
            }
            documentText = ocrResult.text;
          }

          // Extract data based on type
          let extractionResult;
          switch (input.extractionType) {
            case "tender":
              extractionResult = await extractTenderData(
                documentText,
                document.fileUrl
              );
              break;
            case "invoice":
              extractionResult = await extractInvoiceData(documentText);
              break;
            case "expense":
              extractionResult = await extractExpenseData(documentText);
              break;
          }

          if (!extractionResult.success) {
            throw new Error("Extraction failed");
          }

          // Save extraction result
          await db.createExtractionResult({
            documentId: input.documentId,
            extractedData: JSON.stringify(extractionResult.data),
            confidenceScores: JSON.stringify(extractionResult.confidence),
            provider: extractionResult.provider,
            ocrProvider: extractionResult.ocrProvider,
          } as any);

          // Update document status
          await db.updateDocument(input.documentId, {
            extractionStatus: "completed",
          });

          return {
            success: true,
            data: extractionResult.data,
            confidence: extractionResult.confidence,
          };
        } catch (error) {
          await db.updateDocument(input.documentId, {
            extractionStatus: "failed",
          });
          throw error;
        }
      }),

    getExtraction: protectedProcedure
      .input(z.object({ documentId: z.number() }))
      .query(async ({ input }) => {
        return await db.getExtractionResult(input.documentId);
      }),
  }),

  // ============================================
  // TENDER OCR EXTRACTION (Python-based)
  // ============================================
  tenderOCR: router({
    // Check if OCR service is available
    status: protectedProcedure.query(async () => {
      return await ocrService.getOCRStatus();
    }),

    // Upload and extract tender PDF in one step
    uploadAndExtract: uploadProcedure
      .input(
        z.object({
          fileName: z.string(),
          fileData: z.string(), // base64 PDF data
          department: z.string().default("Biomedical Engineering"),
          tenderId: z.number().optional(), // Link to existing tender
          saveToTender: z.boolean().default(false), // Create/update tender from results
        })
      )
      .mutation(async ({ input, ctx }) => {
        // Validate it's a PDF
        if (!input.fileName.toLowerCase().endsWith(".pdf")) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Only PDF files are supported for OCR extraction",
          });
        }

        // Upload to S3 first
        const buffer = Buffer.from(input.fileData, "base64");
        const fileKey = `tender-ocr/${Date.now()}-${input.fileName}`;
        const { url } = await storagePut(fileKey, buffer, "application/pdf");

        // Create document record
        const docResult = await db.createDocument({
          entityType: input.tenderId ? "tender" : "ocr_upload",
          entityId: input.tenderId || 0,
          fileName: input.fileName,
          fileKey,
          fileUrl: url,
          fileSize: buffer.length,
          mimeType: "application/pdf",
          documentType: "tender_pdf",
          uploadedBy: ctx.user.id,
          status: "processing",
          extractionStatus: "processing",
        } as any);

        const documentId = Number((docResult as any).insertId);

        // Run OCR extraction
        const ocrResult = await ocrService.extractTenderFromBase64(
          input.fileData,
          input.fileName,
          {
            department: input.department,
            languages: ["eng", "ara"],
            dpi: 300,
            maxPages: 10,
          }
        );

        if (!ocrResult.success || !ocrResult.data) {
          // Update document status to failed
          await db.updateDocument(documentId, {
            status: "failed",
            extractionStatus: "failed",
          });

          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: ocrResult.error || "OCR extraction failed",
          });
        }

        // Save extraction result
        await db.createExtractionResult({
          documentId,
          extractedData: JSON.stringify(ocrResult.data),
          confidenceScores: JSON.stringify({
            overall: ocrResult.data.ocr_confidence,
          }),
          provider: "tesseract",
          ocrProvider: "tesseract",
        } as any);

        // Update document status
        await db.updateDocument(documentId, {
          status: "completed",
          extractionStatus: "completed",
        });

        // Optionally create/update tender from extracted data
        let tenderId = input.tenderId;
        if (input.saveToTender && ocrResult.data) {
          const tenderData = {
            title:
              ocrResult.data.title ||
              `Tender ${ocrResult.data.reference_number}`,
            referenceNumber: ocrResult.data.reference_number,
            description: ocrResult.data.specifications_text || "",
            status: "draft" as const,
            submissionDeadline: ocrResult.data.closing_date
              ? new Date(
                  ocrResult.data.closing_date.split("/").reverse().join("-")
                )
              : null,
            createdBy: ctx.user.id,
          };

          if (tenderId) {
            // Update existing tender
            await db.updateTender(tenderId, tenderData);
          } else {
            // Create new tender
            const tenderResult = await db.createTender(tenderData as any);
            tenderId = Number((tenderResult as any).insertId);

            // Link document to tender
            await db.updateDocument(documentId, {
              entityType: "tender",
              entityId: tenderId,
            });
          }

          // Create tender items from extracted items
          if (ocrResult.data.items && ocrResult.data.items.length > 0) {
            for (const item of ocrResult.data.items) {
              await db.createTenderItem({
                tenderId: tenderId,
                description: item.description,
                quantity: parseInt(item.quantity) || 1,
                unit: item.unit || "units",
                specifications: item.specifications || "",
              } as any);
            }
          }
        }

        return {
          success: true,
          documentId,
          tenderId,
          extraction: ocrResult.data,
          fileUrl: url,
        };
      }),

    // Extract from an existing document
    extractFromDocument: protectedProcedure
      .input(
        z.object({
          documentId: z.number(),
          department: z.string().default("Biomedical Engineering"),
        })
      )
      .mutation(async ({ input }) => {
        // Get document
        const documents = await db.getDocumentsByEntity("", 0);
        const document = documents.find(d => d.id === input.documentId);

        if (!document) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Document not found",
          });
        }

        if (document.mimeType !== "application/pdf") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Only PDF files are supported for OCR extraction",
          });
        }

        // Update status to processing
        await db.updateDocument(input.documentId, {
          extractionStatus: "processing",
        });

        // Download file and run OCR
        // Note: For S3 files, you'd need to download first
        const ocrResult = await ocrService.extractTenderFromPDF(
          document.fileUrl,
          {
            department: input.department,
          }
        );

        if (!ocrResult.success || !ocrResult.data) {
          await db.updateDocument(input.documentId, {
            extractionStatus: "failed",
          });

          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: ocrResult.error || "OCR extraction failed",
          });
        }

        // Save extraction result
        await db.createExtractionResult({
          documentId: input.documentId,
          extractedData: JSON.stringify(ocrResult.data),
          confidenceScores: JSON.stringify({
            overall: ocrResult.data.ocr_confidence,
          }),
          provider: "tesseract",
          ocrProvider: "tesseract",
        } as any);

        // Update status
        await db.updateDocument(input.documentId, {
          extractionStatus: "completed",
        });

        return {
          success: true,
          extraction: ocrResult.data,
        };
      }),

    // Get extraction results for a document
    getResults: protectedProcedure
      .input(z.object({ documentId: z.number() }))
      .query(async ({ input }) => {
        const result = await db.getExtractionResult(input.documentId);
        if (!result) return null;

        return {
          ...result,
          extractedData: result.extractedData
            ? JSON.parse(result.extractedData)
            : null,
          confidenceScores: result.confidenceScores
            ? JSON.parse(result.confidenceScores)
            : null,
        };
      }),
  }),

  // ============================================
  // ANALYTICS & FORECASTING
  // ============================================
  analytics: router({
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

    forecasts: protectedProcedure.query(async () => {
      return await db.getAllForecasts();
    }),

    anomalies: protectedProcedure.query(async () => {
      return await db.getAllAnomalies();
    }),

    updateAnomaly: protectedProcedure
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

    // AI-powered comprehensive business insights
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
  }),

  // ============================================
  // NOTIFICATIONS
  // ============================================
  notifications: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserNotifications(ctx.user.id);
    }),

    unread: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUnreadNotifications(ctx.user.id);
    }),

    markRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.markNotificationRead(input.id);
        return { success: true };
      }),

    markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
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
  }),

  // ============================================
  // AUDIT LOGS
  // ============================================
  auditLogs: router({
    list: adminProcedure
      .input(
        z
          .object({
            entityType: z.string().optional(),
            action: z.string().optional(),
            userId: z.number().optional(),
            startDate: z.date().optional(),
            endDate: z.date().optional(),
            limit: z.number().optional(),
            offset: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return await db.getAuditLogs(input);
      }),

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
  }),

  // ============================================
  // SETTINGS
  // ============================================
  settings: router({
    list: adminProcedure.query(async () => {
      return await db.getAllSettings();
    }),

    get: adminProcedure
      .input(z.object({ key: z.string() }))
      .query(async ({ input }) => {
        return await db.getSetting(input.key);
      }),

    update: adminProcedure
      .input(
        z.object({
          key: z.string(),
          value: z.string(),
          category: z.string(),
          description: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        await db.upsertSetting({
          ...input,
          updatedBy: ctx.user.id,
        } as any);
        return { success: true };
      }),
  }),

  // Purchase Orders router
  purchaseOrders: router({
    getAll: protectedProcedure.query(async () => {
      return await db.getAllPurchaseOrders();
    }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const po = await db.getPurchaseOrderById(input.id);
        if (!po) throw new TRPCError({ code: "NOT_FOUND" });
        const items = await db.getPurchaseOrderItems(input.id);
        return { ...po, items };
      }),

    create: protectedProcedure
      .input(
        z.object({
          poNumber: z.string(),
          supplierId: z.number(),
          departmentId: z.number().optional(),
          orderDate: z.string(),
          expectedDeliveryDate: z.string().optional(),
          totalAmount: z.number(),
          taxAmount: z.number().optional(),
          shippingCost: z.number().optional(),
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
        const { items, ...poData } = input;
        return await db.createPurchaseOrder(
          { ...poData, createdBy: ctx.user.id } as any,
          items as any
        );
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          status: z
            .enum([
              "draft",
              "pending",
              "approved",
              "ordered",
              "partially_received",
              "received",
              "cancelled",
            ])
            .optional(),
          actualDeliveryDate: z.string().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updatePurchaseOrder(id, data as any);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deletePurchaseOrder(input.id);
        return { success: true };
      }),
  }),

  // Tasks router
  tasks: router({
    getAll: protectedProcedure.query(async () => {
      return await db.getAllTasks();
    }),

    getMyTasks: protectedProcedure.query(async ({ ctx }) => {
      return await db.getTasksByAssignee(ctx.user.id);
    }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const task = await db.getTaskById(input.id);
        if (!task) throw new TRPCError({ code: "NOT_FOUND" });
        return task;
      }),

    create: protectedProcedure
      .input(
        z.object({
          title: z.string(),
          description: z.string().optional(),
          priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
          assignedTo: z.number().optional(),
          departmentId: z.number().optional(),
          relatedEntityType: z.string().optional(),
          relatedEntityId: z.number().optional(),
          dueDate: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        return await db.createTask({ ...input, createdBy: ctx.user.id } as any);
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string().optional(),
          description: z.string().optional(),
          status: z
            .enum(["todo", "in_progress", "review", "completed", "cancelled"])
            .optional(),
          priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
          assignedTo: z.number().optional(),
          dueDate: z.string().optional(),
          completedAt: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateTask(id, data as any);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const task = await db.getTaskById(input.id);
        if (!task) throw new TRPCError({ code: "NOT_FOUND" });

        // Only creator or admin can delete
        if (task.createdBy !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        await db.deleteTask(input.id);
        return { success: true };
      }),
  }),

  // ============================================
  // Opportunities (Pipeline) & Forecast Inputs
  // ============================================
  opportunities: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllOpportunities();
    }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string(),
          customerId: z.number().optional(),
          amount: z.number().min(0),
          probability: z.number().min(0).max(100).default(50),
          stage: z
            .enum([
              "prospect",
              "proposal",
              "negotiation",
              "verbal",
              "won",
              "lost",
            ])
            .default("prospect"),
          expectedCloseDate: z.string().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        return await db.createOpportunity({
          ...input,
          expectedCloseDate: input.expectedCloseDate
            ? new Date(input.expectedCloseDate)
            : undefined,
          createdBy: ctx.user.id,
          ownerId: ctx.user.id,
        } as any);
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          amount: z.number().optional(),
          probability: z.number().min(0).max(100).optional(),
          stage: z
            .enum([
              "prospect",
              "proposal",
              "negotiation",
              "verbal",
              "won",
              "lost",
            ])
            .optional(),
          expectedCloseDate: z.string().optional(),
          status: z.enum(["open", "closed"]).optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, expectedCloseDate, ...rest } = input;
        await db.updateOpportunity(id, {
          ...rest,
          expectedCloseDate: expectedCloseDate
            ? new Date(expectedCloseDate)
            : undefined,
        });
        return { success: true };
      }),
  }),

  // ============================================
  // Commissions
  // ============================================
  commissions: router({
    listRules: protectedProcedure.query(async () => {
      return await db.listCommissionRules();
    }),

    createRule: adminProcedure
      .input(
        z.object({
          name: z.string(),
          scopeType: z.enum(["all", "product", "category"]).default("all"),
          productId: z.number().optional(),
          category: z.string().optional(),
          rateBps: z.number().min(0),
          minMarginBps: z.number().min(0).optional(),
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return await db.createCommissionRule(input as any);
      }),

    assignments: protectedProcedure.query(async () => {
      return await db.listCommissionAssignments();
    }),

    assignRule: adminProcedure
      .input(
        z.object({
          ruleId: z.number(),
          userId: z.number(),
        })
      )
      .mutation(async ({ input }) => {
        return await db.createCommissionAssignment(input as any);
      }),

    entries: protectedProcedure.query(async () => {
      return await db.listCommissionEntries();
    }),

    updateEntry: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          status: z.enum(["pending", "approved", "paid"]).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...rest } = input;
        await db.updateCommissionEntry(id, rest as any);
        return { success: true };
      }),
  }),

  // ============================================
  // HR: Employees & Leave
  // ============================================
  hr: router({
    employees: router({
      list: protectedProcedure.query(async () => {
        return await db.listEmployees();
      }),

      create: adminProcedure
        .input(
          z.object({
            userId: z.number().optional(),
            firstName: z.string().optional(),
            lastName: z.string().optional(),
            title: z.string().optional(),
            departmentId: z.number().optional(),
            managerId: z.number().optional(),
            hireDate: z.string().optional(),
            status: z.enum(["active", "on_leave", "terminated"]).optional(),
            email: z.string().optional(),
            phone: z.string().optional(),
          })
        )
        .mutation(async ({ input }) => {
          return await db.createEmployee({
            ...input,
            hireDate: input.hireDate ? new Date(input.hireDate) : undefined,
          } as any);
        }),

      update: adminProcedure
        .input(
          z.object({
            id: z.number(),
            firstName: z.string().optional(),
            lastName: z.string().optional(),
            title: z.string().optional(),
            departmentId: z.number().optional(),
            managerId: z.number().optional(),
            hireDate: z.string().optional(),
            status: z.enum(["active", "on_leave", "terminated"]).optional(),
            email: z.string().optional(),
            phone: z.string().optional(),
          })
        )
        .mutation(async ({ input }) => {
          const { id, hireDate, ...rest } = input;
          await db.updateEmployee(id, {
            ...rest,
            hireDate: hireDate ? new Date(hireDate) : undefined,
          } as any);
          return { success: true };
        }),
    }),

    leave: router({
      list: protectedProcedure.query(async () => {
        return await db.listLeaveRequests();
      }),

      create: protectedProcedure
        .input(
          z.object({
            employeeId: z.number(),
            type: z
              .enum(["vacation", "sick", "personal", "unpaid"])
              .default("vacation"),
            startDate: z.string(),
            endDate: z.string(),
            reason: z.string().optional(),
          })
        )
        .mutation(async ({ input, ctx }) => {
          return await db.createLeaveRequest({
            ...input,
            startDate: new Date(input.startDate),
            endDate: new Date(input.endDate),
            approverId: ctx.user.id,
          } as any);
        }),

      update: adminProcedure
        .input(
          z.object({
            id: z.number(),
            status: z.enum(["pending", "approved", "rejected"]),
            approverId: z.number().optional(),
          })
        )
        .mutation(async ({ input, ctx }) => {
          await db.updateLeaveRequest(input.id, {
            status: input.status,
            approverId: input.approverId ?? ctx.user.id,
            decidedAt: new Date(),
          } as any);
          return { success: true };
        }),
    }),
  }),

  // ============================================
  // Tender → Supplier/Product matching (basic scoring)
  // ============================================
  tenderMatch: router({
    byTender: protectedProcedure
      .input(z.object({ tenderId: z.number() }))
      .query(async ({ input }) => {
        const tender = await db.getTenderById(input.tenderId);
        if (!tender)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Tender not found",
          });

        const items = await db.getTenderItems(input.tenderId);
        const suppliers = await db.getAllSuppliers();
        const products = await db.getAllProducts();

        const supplierProducts = suppliers
          .map(supplier => {
            const prods = products.filter(
              p => p.manufacturerId === supplier.id
            );
            const score = scoreSupplierAgainstTender(items, prods);
            return { supplier, products: prods, score };
          })
          .sort((a, b) => b.score.total - a.score.total);

        return supplierProducts;
      }),
  }),
  // Files router for universal file management
  files: router({
    uploadToS3: uploadProcedure
      .input(
        z.object({
          fileName: z.string(),
          fileData: z.string(), // base64 encoded file data
          mimeType: z.string(),
          entityType: z.string(),
          entityId: z.number(),
          category: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // Basic safety checks
        const allowedMimeTypes = [
          "application/pdf",
          "image/png",
          "image/jpeg",
          "image/jpg",
          "text/plain",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "text/csv",
        ];
        const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB

        if (!allowedMimeTypes.includes(input.mimeType)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Unsupported file type",
          });
        }

        // Convert base64 to buffer
        const buffer = Buffer.from(input.fileData, "base64");
        const fileSize = buffer.length;

        if (fileSize > MAX_FILE_BYTES) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "File too large (max 25MB)",
          });
        }

        // Generate unique file key
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(7);
        const fileKey = `${input.entityType}/${input.entityId}/${timestamp}-${randomSuffix}-${input.fileName}`;

        // Upload to S3
        const { url } = await storagePut(fileKey, buffer, input.mimeType);

        // Save metadata to database
        const file = await db.createFile({
          fileName: input.fileName,
          fileKey,
          fileUrl: url,
          fileSize,
          mimeType: input.mimeType,
          entityType: input.entityType,
          entityId: input.entityId,
          category: input.category,
          uploadedBy: ctx.user.id,
        });

        return file;
      }),

    upload: uploadProcedure
      .input(
        z.object({
          fileName: z.string(),
          fileKey: z.string(),
          fileUrl: z.string(),
          fileSize: z.number(),
          mimeType: z.string(),
          entityType: z.string(),
          entityId: z.number(),
          category: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const file = await db.createFile({
          ...input,
          uploadedBy: ctx.user.id,
        });
        return file;
      }),

    getByEntity: protectedProcedure
      .input(
        z.object({
          entityType: z.string(),
          entityId: z.number(),
          category: z.string().optional(),
        })
      )
      .query(async ({ input }) => {
        return await db.getFilesByEntity(
          input.entityType,
          input.entityId,
          input.category
        );
      }),

    delete: sensitiveProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const file = await db.getFileById(input.id);
        if (!file) {
          throw new TRPCError({ code: "NOT_FOUND", message: "File not found" });
        }

        // Check if user owns the file or is admin
        if (file.uploadedBy !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Not authorized to delete this file",
          });
        }

        await db.deleteFile(input.id);
        return { success: true };
      }),

    getAll: protectedProcedure.query(async () => {
      return await db.getAllFiles();
    }),

    getHistory: protectedProcedure
      .input(z.object({ fileId: z.number() }))
      .query(async ({ input }) => {
        return await db.getFileHistory(input.fileId);
      }),

    replaceFile: protectedProcedure
      .input(
        z.object({
          originalFileId: z.number(),
          fileName: z.string(),
          fileData: z.string(), // base64 encoded
          mimeType: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // Get the original file to inherit entity info
        const originalFile = await db.getFileById(input.originalFileId);
        if (!originalFile) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Original file not found",
          });
        }

        // Check if user owns the file or is admin
        if (
          originalFile.uploadedBy !== ctx.user.id &&
          ctx.user.role !== "admin"
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Not authorized to replace this file",
          });
        }

        // Convert base64 to buffer
        const buffer = Buffer.from(input.fileData, "base64");
        const fileSize = buffer.length;

        // Generate unique file key
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(7);
        const fileKey = `${originalFile.entityType}/${originalFile.entityId}/${timestamp}-${randomSuffix}-${input.fileName}`;

        // Upload to S3
        const { url } = await storagePut(fileKey, buffer, input.mimeType);

        // Get the parent file ID (if original is already a version, use its parent)
        const parentFileId = originalFile.parentFileId || originalFile.id;

        // Get the next version number
        const history = await db.getFileHistory(parentFileId);
        const nextVersion = history.length + 1;

        // Mark the current file as replaced
        await db.markFileAsReplaced(input.originalFileId);

        // Create new version
        const newFile = await db.createFileVersion({
          fileName: input.fileName,
          fileKey,
          fileUrl: url,
          fileSize,
          mimeType: input.mimeType,
          entityType: originalFile.entityType,
          entityId: originalFile.entityId,
          category: originalFile.category,
          uploadedBy: ctx.user.id,
          version: nextVersion,
          parentFileId,
          isCurrent: true,
        });

        return newFile;
      }),

    rollbackToVersion: protectedProcedure
      .input(z.object({ versionId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const versionFile = await db.getFileById(input.versionId);
        if (!versionFile) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Version not found",
          });
        }

        // Check if user owns the file or is admin
        if (
          versionFile.uploadedBy !== ctx.user.id &&
          ctx.user.role !== "admin"
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Not authorized to rollback this file",
          });
        }

        // Get parent file ID
        const parentFileId = versionFile.parentFileId || versionFile.id;

        // Mark all versions as not current
        await db.markAllVersionsAsNotCurrent(parentFileId);

        // Mark this version as current
        await db.markFileAsCurrent(input.versionId);

        return { success: true };
      }),
  }),

  // ============================================
  // EXPORT
  // ============================================
  export: router({
    tenders: protectedProcedure
      .input(
        z.object({
          format: z.enum(["csv", "excel", "pdf"]),
        })
      )
      .mutation(async ({ input }) => {
        const tenders = await db.getAllTenders();
        const result = generateExport({
          format: input.format,
          filename: `tenders_${new Date().toISOString().split("T")[0]}`,
          title: "Tender Report",
          columns: EXPORT_CONFIGS.tenders.columns,
          data: tenders,
        });
        return result;
      }),

    budgets: protectedProcedure
      .input(
        z.object({
          format: z.enum(["csv", "excel", "pdf"]),
        })
      )
      .mutation(async ({ input }) => {
        const budgets = await db.getAllBudgets();
        const dataWithRemaining = budgets.map(b => ({
          ...b,
          remaining: b.allocatedAmount - b.spentAmount,
        }));
        const result = generateExport({
          format: input.format,
          filename: `budgets_${new Date().toISOString().split("T")[0]}`,
          title: "Budget Report",
          columns: EXPORT_CONFIGS.budgets.columns,
          data: dataWithRemaining,
        });
        return result;
      }),

    expenses: protectedProcedure
      .input(
        z.object({
          format: z.enum(["csv", "excel", "pdf"]),
        })
      )
      .mutation(async ({ input }) => {
        const expenses = await db.getAllExpenses();
        const result = generateExport({
          format: input.format,
          filename: `expenses_${new Date().toISOString().split("T")[0]}`,
          title: "Expense Report",
          columns: EXPORT_CONFIGS.expenses.columns,
          data: expenses,
        });
        return result;
      }),

    inventory: protectedProcedure
      .input(
        z.object({
          format: z.enum(["csv", "excel", "pdf"]),
        })
      )
      .mutation(async ({ input }) => {
        const inventory = await db.getAllInventory();
        const products = await db.getAllProducts();
        const productMap = new Map(products.map(p => [p.id, p]));

        const dataWithProducts = inventory.map(inv => {
          const product = productMap.get(inv.productId);
          return {
            ...inv,
            productName: product?.name || `Product #${inv.productId}`,
            sku: product?.sku || `SKU-${inv.productId}`,
          };
        });

        const result = generateExport({
          format: input.format,
          filename: `inventory_${new Date().toISOString().split("T")[0]}`,
          title: "Inventory Report",
          columns: EXPORT_CONFIGS.inventory.columns,
          data: dataWithProducts,
        });
        return result;
      }),

    invoices: protectedProcedure
      .input(
        z.object({
          format: z.enum(["csv", "excel", "pdf"]),
        })
      )
      .mutation(async ({ input }) => {
        const invoices = await db.getAllInvoices();
        const customers = await db.getAllCustomers();
        const customerMap = new Map(customers.map(c => [c.id, c]));

        const dataWithCustomers = invoices.map(inv => ({
          ...inv,
          customerName:
            customerMap.get(inv.customerId)?.name ||
            `Customer #${inv.customerId}`,
        }));

        const result = generateExport({
          format: input.format,
          filename: `invoices_${new Date().toISOString().split("T")[0]}`,
          title: "Invoice Report",
          columns: EXPORT_CONFIGS.invoices.columns,
          data: dataWithCustomers,
        });
        return result;
      }),

    suppliers: protectedProcedure
      .input(
        z.object({
          format: z.enum(["csv", "excel", "pdf"]),
        })
      )
      .mutation(async ({ input }) => {
        const suppliers = await db.getAllSuppliers();
        const result = generateExport({
          format: input.format,
          filename: `suppliers_${new Date().toISOString().split("T")[0]}`,
          title: "Supplier Report",
          columns: EXPORT_CONFIGS.suppliers.columns,
          data: suppliers,
        });
        return result;
      }),

    customers: protectedProcedure
      .input(
        z.object({
          format: z.enum(["csv", "excel", "pdf"]),
        })
      )
      .mutation(async ({ input }) => {
        const customers = await db.getAllCustomers();
        const result = generateExport({
          format: input.format,
          filename: `customers_${new Date().toISOString().split("T")[0]}`,
          title: "Customer Report",
          columns: EXPORT_CONFIGS.customers.columns,
          data: customers,
        });
        return result;
      }),

    // Generic export for any data
    custom: protectedProcedure
      .input(
        z.object({
          format: z.enum(["csv", "excel", "pdf"]),
          filename: z.string(),
          title: z.string().optional(),
          columns: z.array(
            z.object({
              key: z.string(),
              label: z.string(),
              format: z
                .enum(["currency", "date", "number", "percent", "boolean"])
                .optional(),
            })
          ),
          data: z.array(z.record(z.any())),
        })
      )
      .mutation(async ({ input }) => {
        const result = generateExport({
          format: input.format,
          filename: input.filename,
          title: input.title,
          columns: input.columns,
          data: input.data,
        });
        return result;
      }),
  }),
});

export type AppRouter = typeof appRouter;
