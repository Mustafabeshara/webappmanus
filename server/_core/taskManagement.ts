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

// =============================================================================
// DOCUMENT WORKFLOW TEMPLATES
// =============================================================================

export interface DocumentWorkflowConfig {
  documentType: string;
  workflowSteps: DocumentWorkflowStep[];
  autoCreateTasks: boolean;
  notifyOnCompletion: boolean;
}

export interface DocumentWorkflowStep {
  stepId: string;
  name: string;
  nameAr?: string;
  description: string;
  assigneeRole: string;
  dueInDays: number;
  requiredDocuments?: string[];
  approvalRequired: boolean;
  nextStepId?: string;
  conditionField?: string;
  conditionValue?: string;
}

/**
 * Pre-defined workflow templates for different document types
 */
export const DOCUMENT_WORKFLOW_TEMPLATES: Record<string, DocumentWorkflowConfig> = {
  // Tender Submission Workflow
  tender_submission: {
    documentType: "tender_submission",
    autoCreateTasks: true,
    notifyOnCompletion: true,
    workflowSteps: [
      {
        stepId: "gather_docs",
        name: "Gather Required Documents",
        nameAr: "جمع المستندات المطلوبة",
        description: "Collect all required documents for tender submission",
        assigneeRole: "procurement",
        dueInDays: 5,
        requiredDocuments: ["commercial_registration", "vat_certificate", "company_profile"],
        approvalRequired: false,
        nextStepId: "technical_proposal",
      },
      {
        stepId: "technical_proposal",
        name: "Prepare Technical Proposal",
        nameAr: "إعداد العرض الفني",
        description: "Draft and review technical specifications and proposal",
        assigneeRole: "technical",
        dueInDays: 7,
        requiredDocuments: ["technical_proposal", "product_specs"],
        approvalRequired: true,
        nextStepId: "financial_bid",
      },
      {
        stepId: "financial_bid",
        name: "Prepare Financial Bid",
        nameAr: "إعداد العرض المالي",
        description: "Calculate pricing and prepare financial offer",
        assigneeRole: "finance",
        dueInDays: 3,
        requiredDocuments: ["financial_bid", "price_breakdown"],
        approvalRequired: true,
        nextStepId: "bank_guarantee",
      },
      {
        stepId: "bank_guarantee",
        name: "Obtain Bank Guarantee",
        nameAr: "الحصول على خطاب ضمان بنكي",
        description: "Request and obtain bank guarantee if required",
        assigneeRole: "finance",
        dueInDays: 5,
        requiredDocuments: ["bank_guarantee"],
        approvalRequired: false,
        nextStepId: "final_review",
      },
      {
        stepId: "final_review",
        name: "Final Review & Approval",
        nameAr: "المراجعة النهائية والموافقة",
        description: "Management review and approval of complete tender package",
        assigneeRole: "management",
        dueInDays: 2,
        approvalRequired: true,
        nextStepId: "submission",
      },
      {
        stepId: "submission",
        name: "Submit Tender",
        nameAr: "تقديم المناقصة",
        description: "Submit complete tender package to customer/portal",
        assigneeRole: "procurement",
        dueInDays: 1,
        approvalRequired: false,
      },
    ],
  },

  // Supplier Registration Workflow
  supplier_registration: {
    documentType: "supplier_registration",
    autoCreateTasks: true,
    notifyOnCompletion: true,
    workflowSteps: [
      {
        stepId: "collect_docs",
        name: "Collect Registration Documents",
        nameAr: "جمع مستندات التسجيل",
        description: "Gather all documents required for supplier registration",
        assigneeRole: "procurement",
        dueInDays: 10,
        requiredDocuments: [
          "commercial_registration",
          "vat_certificate",
          "zakat_certificate",
          "gosi_certificate",
          "company_profile",
        ],
        approvalRequired: false,
        nextStepId: "verify_docs",
      },
      {
        stepId: "verify_docs",
        name: "Verify Documents",
        nameAr: "التحقق من المستندات",
        description: "Verify authenticity and validity of all documents",
        assigneeRole: "compliance",
        dueInDays: 3,
        approvalRequired: true,
        nextStepId: "quality_check",
      },
      {
        stepId: "quality_check",
        name: "Quality Assessment",
        nameAr: "تقييم الجودة",
        description: "Assess supplier quality standards and capabilities",
        assigneeRole: "quality",
        dueInDays: 5,
        requiredDocuments: ["iso_certificate", "quality_manual"],
        approvalRequired: true,
        nextStepId: "approval",
      },
      {
        stepId: "approval",
        name: "Management Approval",
        nameAr: "موافقة الإدارة",
        description: "Final management approval for supplier registration",
        assigneeRole: "management",
        dueInDays: 2,
        approvalRequired: true,
        nextStepId: "onboarding",
      },
      {
        stepId: "onboarding",
        name: "Supplier Onboarding",
        nameAr: "تسجيل المورد في النظام",
        description: "Complete supplier onboarding in system",
        assigneeRole: "procurement",
        dueInDays: 1,
        approvalRequired: false,
      },
    ],
  },

  // Compliance Document Renewal Workflow
  compliance_renewal: {
    documentType: "compliance_renewal",
    autoCreateTasks: true,
    notifyOnCompletion: true,
    workflowSteps: [
      {
        stepId: "identify_expiring",
        name: "Identify Expiring Documents",
        nameAr: "تحديد المستندات المنتهية",
        description: "Review and list all documents expiring within 60 days",
        assigneeRole: "compliance",
        dueInDays: 1,
        approvalRequired: false,
        nextStepId: "request_renewal",
      },
      {
        stepId: "request_renewal",
        name: "Request Renewal",
        nameAr: "طلب التجديد",
        description: "Submit renewal applications to respective authorities",
        assigneeRole: "admin",
        dueInDays: 5,
        approvalRequired: false,
        nextStepId: "follow_up",
      },
      {
        stepId: "follow_up",
        name: "Follow Up",
        nameAr: "المتابعة",
        description: "Track renewal status and follow up with authorities",
        assigneeRole: "admin",
        dueInDays: 14,
        approvalRequired: false,
        nextStepId: "upload_renewed",
      },
      {
        stepId: "upload_renewed",
        name: "Upload Renewed Documents",
        nameAr: "رفع المستندات المجددة",
        description: "Upload renewed documents to the system",
        assigneeRole: "admin",
        dueInDays: 1,
        approvalRequired: true,
        nextStepId: "notify_stakeholders",
      },
      {
        stepId: "notify_stakeholders",
        name: "Notify Stakeholders",
        nameAr: "إخطار أصحاب المصلحة",
        description: "Notify relevant parties about document renewal",
        assigneeRole: "compliance",
        dueInDays: 1,
        approvalRequired: false,
      },
    ],
  },

  // Invoice Processing Workflow
  invoice_processing: {
    documentType: "invoice_processing",
    autoCreateTasks: true,
    notifyOnCompletion: true,
    workflowSteps: [
      {
        stepId: "receive_invoice",
        name: "Receive & Validate Invoice",
        nameAr: "استلام والتحقق من الفاتورة",
        description: "Receive invoice and validate against PO",
        assigneeRole: "accounts_payable",
        dueInDays: 1,
        requiredDocuments: ["invoice", "purchase_order", "delivery_note"],
        approvalRequired: false,
        nextStepId: "verify_delivery",
      },
      {
        stepId: "verify_delivery",
        name: "Verify Delivery",
        nameAr: "التحقق من التسليم",
        description: "Confirm goods/services received match invoice",
        assigneeRole: "warehouse",
        dueInDays: 2,
        approvalRequired: true,
        nextStepId: "manager_approval",
      },
      {
        stepId: "manager_approval",
        name: "Manager Approval",
        nameAr: "موافقة المدير",
        description: "Department manager approval for payment",
        assigneeRole: "department_head",
        dueInDays: 2,
        approvalRequired: true,
        conditionField: "amount",
        conditionValue: "> 10000",
        nextStepId: "schedule_payment",
      },
      {
        stepId: "schedule_payment",
        name: "Schedule Payment",
        nameAr: "جدولة الدفع",
        description: "Schedule invoice for payment batch",
        assigneeRole: "accounts_payable",
        dueInDays: 1,
        approvalRequired: false,
        nextStepId: "process_payment",
      },
      {
        stepId: "process_payment",
        name: "Process Payment",
        nameAr: "معالجة الدفع",
        description: "Execute payment and record transaction",
        assigneeRole: "treasury",
        dueInDays: 3,
        approvalRequired: true,
      },
    ],
  },
};

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
   * Start a document workflow - creates all tasks for the workflow
   */
  async startDocumentWorkflow(
    workflowType: keyof typeof DOCUMENT_WORKFLOW_TEMPLATES,
    context: {
      entityId: number;
      entityType: string;
      createdBy: number;
      deadline?: Date;
      assignees?: Record<string, number>; // role -> userId mapping
    }
  ) {
    const template = DOCUMENT_WORKFLOW_TEMPLATES[workflowType];
    if (!template) {
      throw new Error(`Unknown workflow type: ${workflowType}`);
    }

    const workflowInstanceId = Date.now();
    const tasks: any[] = [];
    let cumulativeDays = 0;

    // Create tasks for each step
    for (const step of template.workflowSteps) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + cumulativeDays + step.dueInDays);

      // Get assignee from context or null
      const assignedTo = context.assignees?.[step.assigneeRole] || null;

      const task = await this.createTask({
        title: step.name,
        description: `${step.description}\n\n${step.requiredDocuments?.length ? `Required documents: ${step.requiredDocuments.join(", ")}` : ""}`,
        assignedTo,
        dueDate: dueDate.toISOString(),
        priority: cumulativeDays === 0 ? "high" : "medium",
        linkedModule: context.entityType,
        linkedEntityId: context.entityId,
        workflowInstanceId,
      });

      tasks.push({
        ...task,
        stepId: step.stepId,
        approvalRequired: step.approvalRequired,
        requiredDocuments: step.requiredDocuments,
      });

      cumulativeDays += step.dueInDays;
    }

    console.log(
      `[TaskManagement] Document workflow ${workflowType} started with ${tasks.length} tasks`
    );

    return {
      workflowInstanceId,
      workflowType,
      totalSteps: template.workflowSteps.length,
      tasks,
      estimatedCompletionDays: cumulativeDays,
    };
  }

  /**
   * Get document workflow status
   */
  async getDocumentWorkflowStatus(workflowInstanceId: number) {
    const tasks = await db.getAllTasks();
    const workflowTasks = tasks.filter((t: any) => t.workflowInstanceId === workflowInstanceId);

    const totalTasks = workflowTasks.length;
    const completedTasks = workflowTasks.filter((t: any) => t.status === "done").length;
    const currentTask = workflowTasks.find(
      (t: any) => t.status === "in_progress" || t.status === "todo"
    );

    return {
      workflowInstanceId,
      totalSteps: totalTasks,
      completedSteps: completedTasks,
      progressPercent: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      currentTask,
      isComplete: completedTasks === totalTasks,
      tasks: workflowTasks,
    };
  }

  /**
   * Get available document workflow templates
   */
  getAvailableWorkflowTemplates() {
    return Object.entries(DOCUMENT_WORKFLOW_TEMPLATES).map(([key, template]) => ({
      id: key,
      name: template.documentType.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      stepsCount: template.workflowSteps.length,
      steps: template.workflowSteps.map((s) => ({
        id: s.stepId,
        name: s.name,
        nameAr: s.nameAr,
        dueInDays: s.dueInDays,
        approvalRequired: s.approvalRequired,
      })),
    }));
  }

  /**
   * Check document expiration and create renewal tasks
   */
  async checkDocumentExpiration(daysThreshold: number = 60) {
    // In a full implementation, this would:
    // 1. Query all documents with expiration dates
    // 2. Find documents expiring within threshold
    // 3. Create renewal workflow tasks

    console.log(
      `[TaskManagement] Checking for documents expiring within ${daysThreshold} days`
    );

    // Return placeholder - would be replaced with actual document queries
    return {
      expiringDocuments: [],
      tasksCreated: 0,
    };
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
