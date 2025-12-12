/**
 * Requirements Router
 *
 * Handles requirement requests and CMS workflow with approval gates.
 * Includes multi-level approval workflow based on monetary thresholds.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, protectedMutationProcedure } from "../_core/trpc";
import * as db from "../db";
import { requirementSchemas } from "../_core/validationSchemas";

// ============================================
// CONSTANTS
// ============================================

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

// Approval thresholds in cents
const THRESHOLD_FATWA = 75_000 * 100; // 75,000 SAR
const THRESHOLD_CTC_AUDIT = 100_000 * 100; // 100,000 SAR

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Determine approval gate based on total value
 */
function determineApprovalGate(totalValueCents: number): string {
  if (totalValueCents > THRESHOLD_CTC_AUDIT) return "ctc_audit";
  if (totalValueCents >= THRESHOLD_FATWA) return "fatwa";
  return "committee";
}

/**
 * Get required approval roles for a given gate
 */
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

/**
 * Check if all required approvals are completed
 */
function hasRequiredApprovals(
  approvals: Array<{ role: string; decision: string }>,
  gate: string
): boolean {
  const needed = requiredApprovalsForGate(gate);
  return needed.every(role =>
    approvals.some(a => a.role === role && a.decision === "approved")
  );
}

/**
 * Permission check for requirements module
 */
async function requireRequirementsPermission(
  ctx: { user: { id: number; role: string } },
  action: "view" | "create" | "edit" | "approve"
) {
  if (ctx.user.role === "admin") return;

  // Import checkPermission from db or appropriate module
  const { checkPermission } = await import("../db");

  const allowed = await checkPermission(ctx.user.id, "requirements", action);
  if (!allowed) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Not authorized for requirements module",
    });
  }
}

// ============================================
// ROUTER
// ============================================

export const requirementsRouter = router({
  /**
   * List all requirement requests
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    await requireRequirementsPermission(ctx, "view");
    return await db.getAllRequirementRequests();
  }),

  /**
   * Get single requirement request by ID
   */
  get: protectedProcedure
    .input(requirementSchemas.get)
    .query(async ({ input, ctx }) => {
      await requireRequirementsPermission(ctx, "view");
      return await db.getRequirementRequestById(input.id);
    }),

  /**
   * Create new requirement request
   */
  create: protectedMutationProcedure
    .input(requirementSchemas.create)
    .mutation(async ({ input, ctx }) => {
      await requireRequirementsPermission(ctx, "create");

      // Calculate total value and determine approval gate
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

      // Create audit log
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

  /**
   * Update requirement status with approval checks
   */
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

      // Check if status requires approvals
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

      // Create audit log
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

  /**
   * Add item to requirement request
   */
  addItem: protectedMutationProcedure
    .input(
      z.object({
        requestId: z.number(),
        description: z.string(),
        quantity: z.number().int().positive(),
        unit: z.string().default("unit"),
        estimatedUnitPrice: z.number().int().min(0),
        category: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await requireRequirementsPermission(ctx, "edit");

      const { requestId, ...itemData } = input;

      // Add item to requirement request
      await db.addRequirementItem({
        requestId,
        ...itemData,
      } as any);

      // Create audit log
      await db.createAuditLog({
        userId: ctx.user.id,
        action: "update",
        entityType: "requirements_request",
        entityId: requestId,
        changes: JSON.stringify({ addedItem: itemData }),
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers["user-agent"],
      } as any);

      return { success: true };
    }),

  /**
   * Remove item from requirement request
   */
  removeItem: protectedMutationProcedure
    .input(
      z.object({
        requestId: z.number(),
        itemId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await requireRequirementsPermission(ctx, "edit");

      await db.removeRequirementItem(input.itemId);

      // Create audit log
      await db.createAuditLog({
        userId: ctx.user.id,
        action: "update",
        entityType: "requirements_request",
        entityId: input.requestId,
        changes: JSON.stringify({ removedItemId: input.itemId }),
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers["user-agent"],
      } as any);

      return { success: true };
    }),

  /**
   * Get approval workflow status
   */
  getWorkflow: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireRequirementsPermission(ctx, "view");

      const requirement = await db.getRequirementRequestById(input.id);
      if (!requirement) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Requirement not found",
        });
      }

      const approvals = (requirement as any).approvals || [];
      const gate = requirement.approvalGate;
      const required = requiredApprovalsForGate(gate);
      const completed = hasRequiredApprovals(approvals, gate);

      return {
        approvalGate: gate,
        requiredApprovals: required,
        currentApprovals: approvals,
        isComplete: completed,
        threshold:
          gate === "ctc_audit"
            ? THRESHOLD_CTC_AUDIT
            : gate === "fatwa"
            ? THRESHOLD_FATWA
            : 0,
      };
    }),

  /**
   * Add approval to requirement
   */
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

      // Create audit log
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

  /**
   * Upsert CMS case information
   */
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

      // Create audit log
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

  /**
   * Add followup note to CMS case
   */
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

      // Create audit log
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
});
