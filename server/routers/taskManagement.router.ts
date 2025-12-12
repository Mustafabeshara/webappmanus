import { z } from "zod";
import { protectedMutationProcedure, protectedProcedure, router } from "../_core/trpc";

/**
 * Task Management Router
 * Handles task creation, workflow templates, and analytics
 */
export const taskManagementRouter = router({
  createTask: protectedMutationProcedure
    .input(
      z.object({
        title: z.string(),
        description: z.string().optional(),
        assigneeId: z.number().optional(),
        priority: z.enum(["low", "medium", "high", "urgent"]),
        status: z
          .enum(["todo", "in_progress", "review", "done"])
          .default("todo"),
        dueDate: z.date().optional(),
        estimatedHours: z.number().optional(),
        category: z.string().optional(),
        tags: z.array(z.string()).optional(),
        dependencies: z
          .array(
            z.object({
              dependsOnTaskId: z.number(),
              dependencyType: z.enum([
                "finish_to_start",
                "start_to_start",
                "finish_to_finish",
                "start_to_finish",
              ]),
              lagDays: z.number().optional(),
              isBlocking: z.boolean().optional(),
            })
          )
          .default([]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { taskManagementService } = await import(
        "../_core/taskManagement"
      );
      const { dependencies, ...taskData } = input;

      return await taskManagementService.createTask(
        taskData,
        dependencies,
        ctx.user.id
      );
    }),

  updateTaskStatus: protectedMutationProcedure
    .input(
      z.object({
        taskId: z.number(),
        newStatus: z.enum(["todo", "in_progress", "review", "done"]),
        completionNotes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { taskManagementService } = await import(
        "../_core/taskManagement"
      );

      return await taskManagementService.updateTaskStatus(
        input.taskId,
        input.newStatus,
        ctx.user.id,
        input.completionNotes
      );
    }),

  createWorkflowTemplate: protectedMutationProcedure
    .input(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        category: z.string(),
        steps: z.array(
          z.object({
            name: z.string(),
            description: z.string().optional(),
            assigneeRole: z.string().optional(),
            estimatedDays: z.number().optional(),
            isRequired: z.boolean().optional(),
            autoAssign: z.boolean().optional(),
            dependencies: z.array(z.number()).optional(),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { taskManagementService } = await import(
        "../_core/taskManagement"
      );

      return await taskManagementService.createWorkflowTemplate(
        input,
        ctx.user.id
      );
    }),

  startWorkflowInstance: protectedMutationProcedure
    .input(
      z.object({
        templateId: z.number(),
        entityType: z.string(),
        entityId: z.number(),
        name: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { taskManagementService } = await import(
        "../_core/taskManagement"
      );

      return await taskManagementService.startWorkflowInstance(
        input.templateId,
        input.entityType,
        input.entityId,
        input.name,
        ctx.user.id
      );
    }),

  getTaskAnalytics: protectedProcedure
    .input(
      z.object({
        userId: z.number().optional(),
        departmentId: z.number().optional(),
        dateRange: z
          .object({
            start: z.date(),
            end: z.date(),
          })
          .optional(),
      })
    )
    .query(async ({ input }) => {
      const { taskManagementService } = await import(
        "../_core/taskManagement"
      );

      return await taskManagementService.getTaskAnalytics(input);
    }),

  generateTenderDeadlineReminders: protectedMutationProcedure
    .input(
      z.object({
        horizonDays: z.number().min(1).max(180).optional(),
        reminderWindows: z.array(z.number().min(1).max(120)).optional(),
        notify: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { taskManagementService } = await import(
        "../_core/taskManagement"
      );

      return taskManagementService.ensureTenderDeadlineTasks(input);
    }),
});
