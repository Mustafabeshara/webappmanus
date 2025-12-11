/**
 * Task Management Service
 * Handles workflow templates, task creation, status updates, and analytics
 */

import * as db from "../db";

export interface TaskInput {
  title: string;
  description?: string;
  assignedTo?: number;
  dueDate?: string;
  priority: "low" | "medium" | "high" | "urgent";
  linkedModule?: string;
  linkedEntityId?: number;
  workflowInstanceId?: number;
}

export interface WorkflowTemplate {
  id?: number;
  name: string;
  description: string;
  steps: WorkflowStep[];
  triggers: WorkflowTrigger[];
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: "task" | "approval" | "notification" | "condition";
  assigneeRole?: string;
  assigneeUserId?: number;
  dueInDays?: number;
  nextSteps?: string[];
  conditionField?: string;
  conditionValue?: any;
}

export interface WorkflowTrigger {
  event: string;
  module: string;
  conditions?: Record<string, any>;
}

export interface TaskAnalyticsInput {
  dateFrom?: string;
  dateTo?: string;
  userId?: number;
  module?: string;
}

class TaskManagementService {
  /**
   * Create a new task
   */
  async createTask(input: TaskInput) {
    const task = await db.createTask({
      title: input.title,
      description: input.description || null,
      assignedTo: input.assignedTo || null,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      priority: input.priority,
      status: "todo",
      linkedModule: input.linkedModule || null,
      linkedEntityId: input.linkedEntityId || null,
    });

    // If this task is part of a workflow instance, update the instance
    if (input.workflowInstanceId) {
      await this.updateWorkflowProgress(input.workflowInstanceId, task.id);
    }

    return task;
  }

  /**
   * Update task status with workflow progression
   */
  async updateTaskStatus(taskId: number, status: string, userId: number) {
    const task = await db.getTaskById(taskId);
    if (!task) {
      throw new Error("Task not found");
    }

    const updatedTask = await db.updateTask(taskId, { status });

    // Add activity log
    await db.createTaskComment({
      taskId,
      userId,
      content: `Status changed from ${task.status} to ${status}`,
      isSystemComment: true,
    });

    // Check if task completion triggers workflow progression
    if (status === "done" && task.linkedModule) {
      await this.checkWorkflowProgression(task);
    }

    return updatedTask;
  }

  /**
   * Create a workflow template
   */
  async createWorkflowTemplate(input: WorkflowTemplate) {
    // Store workflow template - in a real implementation, this would be a database table
    // For now, we'll use a simple JSON storage approach
    const template = {
      id: Date.now(),
      ...input,
      createdAt: new Date().toISOString(),
    };

    console.log("[TaskManagement] Workflow template created:", template.name);
    return template;
  }

  /**
   * Start a workflow instance from a template
   */
  async startWorkflowInstance(templateId: number, context: Record<string, any>) {
    // In a full implementation, this would:
    // 1. Load the template
    // 2. Create an instance record
    // 3. Create initial tasks based on the first steps
    // 4. Set up event listeners for progression

    const instance = {
      id: Date.now(),
      templateId,
      context,
      status: "active",
      currentStep: 0,
      startedAt: new Date().toISOString(),
    };

    console.log("[TaskManagement] Workflow instance started:", instance.id);

    // Create initial tasks from template
    // This would be expanded in a full implementation

    return instance;
  }

  /**
   * Get task analytics
   */
  async getTaskAnalytics(input: TaskAnalyticsInput) {
    const tasks = await db.getAllTasks();

    // Filter by date range
    let filteredTasks = tasks;
    if (input.dateFrom) {
      const fromDate = new Date(input.dateFrom);
      filteredTasks = filteredTasks.filter(
        (t: any) => new Date(t.createdAt) >= fromDate
      );
    }
    if (input.dateTo) {
      const toDate = new Date(input.dateTo);
      filteredTasks = filteredTasks.filter(
        (t: any) => new Date(t.createdAt) <= toDate
      );
    }

    // Filter by user
    if (input.userId) {
      filteredTasks = filteredTasks.filter(
        (t: any) => t.assignedTo === input.userId
      );
    }

    // Filter by module
    if (input.module) {
      filteredTasks = filteredTasks.filter(
        (t: any) => t.linkedModule === input.module
      );
    }

    // Calculate analytics
    const totalTasks = filteredTasks.length;
    const completedTasks = filteredTasks.filter(
      (t: any) => t.status === "done"
    ).length;
    const overdueTasks = filteredTasks.filter((t: any) => {
      if (!t.dueDate) return false;
      return new Date(t.dueDate) < new Date() && t.status !== "done";
    }).length;

    const byPriority = {
      low: filteredTasks.filter((t: any) => t.priority === "low").length,
      medium: filteredTasks.filter((t: any) => t.priority === "medium").length,
      high: filteredTasks.filter((t: any) => t.priority === "high").length,
      urgent: filteredTasks.filter((t: any) => t.priority === "urgent").length,
    };

    const byStatus = {
      todo: filteredTasks.filter((t: any) => t.status === "todo").length,
      in_progress: filteredTasks.filter((t: any) => t.status === "in_progress")
        .length,
      review: filteredTasks.filter((t: any) => t.status === "review").length,
      done: completedTasks,
      cancelled: filteredTasks.filter((t: any) => t.status === "cancelled")
        .length,
    };

    // Calculate average completion time for done tasks
    const completedTasksWithDates = filteredTasks.filter(
      (t: any) => t.status === "done" && t.updatedAt
    );
    let avgCompletionTime = 0;
    if (completedTasksWithDates.length > 0) {
      const totalTime = completedTasksWithDates.reduce((sum: number, t: any) => {
        const created = new Date(t.createdAt).getTime();
        const completed = new Date(t.updatedAt).getTime();
        return sum + (completed - created);
      }, 0);
      avgCompletionTime = Math.round(
        totalTime / completedTasksWithDates.length / (1000 * 60 * 60 * 24)
      ); // Days
    }

    return {
      totalTasks,
      completedTasks,
      completionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
      overdueTasks,
      byPriority,
      byStatus,
      avgCompletionTimeDays: avgCompletionTime,
    };
  }

  /**
   * Helper: Update workflow progress when a task completes
   */
  private async updateWorkflowProgress(workflowInstanceId: number, taskId: number) {
    // In a full implementation, this would update the workflow instance's progress
    console.log(
      `[TaskManagement] Task ${taskId} added to workflow instance ${workflowInstanceId}`
    );
  }

  /**
   * Helper: Check if task completion triggers workflow progression
   */
  private async checkWorkflowProgression(task: any) {
    // In a full implementation, this would check workflow rules and create follow-up tasks
    console.log(
      `[TaskManagement] Checking workflow progression for task ${task.id}`
    );
  }
}

export const taskManagementService = new TaskManagementService();
