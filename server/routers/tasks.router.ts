import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";

/**
 * Tasks Router
 * Handles task management including creation, assignment, and tracking
 */
export const tasksRouter = router({
  /**
   * Get all tasks in the system
   * Returns all tasks visible to the current user
   */
  getAll: protectedProcedure.query(async () => {
    return await db.getAllTasks();
  }),

  /**
   * Get tasks assigned to the current user
   * Convenient endpoint for viewing user's own task list
   */
  getMyTasks: protectedProcedure.query(async ({ ctx }) => {
    return await db.getTasksByAssignee(ctx.user.id);
  }),

  /**
   * Get a specific task by ID
   * @param id - Task ID to retrieve
   * @throws NOT_FOUND if task doesn't exist
   */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const task = await db.getTaskById(input.id);
      if (!task) throw new TRPCError({ code: "NOT_FOUND" });
      return task;
    }),

  /**
   * Create a new task
   * @param title - Task title (required)
   * @param description - Detailed task description
   * @param priority - Task priority level
   * @param assignedTo - User ID to assign the task to
   * @param departmentId - Related department
   * @param relatedEntityType - Type of related entity (e.g., "tender", "invoice")
   * @param relatedEntityId - ID of related entity
   * @param dueDate - Task due date
   */
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

  /**
   * Update an existing task
   * @param id - Task ID to update
   * @param title - Updated task title
   * @param description - Updated description
   * @param status - Task status (todo, in_progress, review, completed, cancelled)
   * @param priority - Updated priority level
   * @param assignedTo - Reassign to different user
   * @param dueDate - Updated due date
   * @param completedAt - Completion timestamp
   */
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

  /**
   * Delete a task
   * Only the task creator or an admin can delete tasks
   * @param id - Task ID to delete
   * @throws NOT_FOUND if task doesn't exist
   * @throws FORBIDDEN if user is not authorized to delete
   */
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
});
