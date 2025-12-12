import { z } from "zod";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";

/**
 * HR Router
 * Handles employee management and leave requests
 */
export const hrRouter = router({
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
});
