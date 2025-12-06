import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";
import * as utils from "./utils";
import { storagePut } from "./storage";
import { performOCR, extractTenderData, extractInvoiceData, extractExpenseData, generateForecast, detectAnomalies, analyzeTenderWinRate } from "./aiService";
import { notifyOwner } from "./_core/notification";

// Admin-only procedure
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }
  return next({ ctx });
});

// Helper to check user permissions
async function checkPermission(userId: number, module: string, action: 'view' | 'create' | 'edit' | 'delete' | 'approve') {
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
    
    updateRole: adminProcedure
      .input(z.object({
        userId: z.number(),
        role: z.enum(["admin", "user"]),
      }))
      .mutation(async ({ input }) => {
        await db.updateUserRole(input.userId, input.role);
        return { success: true };
      }),
    
    getPermissions: adminProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        return await db.getUserPermissions(input.userId);
      }),
    
    updatePermission: adminProcedure
      .input(z.object({
        userId: z.number(),
        module: z.string(),
        canView: z.boolean().optional(),
        canCreate: z.boolean().optional(),
        canEdit: z.boolean().optional(),
        canDelete: z.boolean().optional(),
        canApprove: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.upsertUserPermission(input as any);
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
    
    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        description: z.string().optional(),
        managerId: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const code = utils.generateDepartmentCode(input.name);
        await db.createDepartment({
          ...input,
          code,
          createdBy: ctx.user.id,
        } as any);
        return { success: true };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        managerId: z.number().optional(),
        isActive: z.boolean().optional(),
      }))
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
      return await db.getAllBudgetCategories();
    }),
    
    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        parentId: z.number().optional(),
        description: z.string().optional(),
      }))
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
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getBudgetById(input.id);
      }),
    
    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        categoryId: z.number(),
        departmentId: z.number().optional(),
        fiscalYear: z.number(),
        allocatedAmount: z.number(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.createBudget({
          ...input,
          createdBy: ctx.user.id,
        } as any);
        return { success: true };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        allocatedAmount: z.number().optional(),
        status: z.enum(["draft", "active", "closed"]).optional(),
        approvalStatus: z.enum(["pending", "approved", "rejected"]).optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateBudget(id, data);
        return { success: true };
      }),
    
    approve: protectedProcedure
      .input(z.object({
        id: z.number(),
        approved: z.boolean(),
        rejectionReason: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const budget = await db.getBudgetById(input.id);
        if (!budget) throw new TRPCError({ code: 'NOT_FOUND' });
        
        await db.updateBudget(input.id, {
          approvalStatus: input.approved ? "approved" : "rejected",
          approvedBy: ctx.user.id,
          approvedAt: new Date(),
        });
        
        // Notify owner of budget approval/rejection
        await notifyOwner({
          title: `Budget ${input.approved ? 'Approved' : 'Rejected'}`,
          content: `Budget "${budget.name}" has been ${input.approved ? 'approved' : 'rejected'} by ${ctx.user.name}`,
        });
        
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
    
    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        contactPerson: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        taxId: z.string().optional(),
        notes: z.string().optional(),
      }))
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
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        contactPerson: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        taxId: z.string().optional(),
        complianceStatus: z.enum(["compliant", "pending", "non_compliant"]).optional(),
        rating: z.number().optional(),
        notes: z.string().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateSupplier(id, data);
        return { success: true };
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
      .input(z.object({
        name: z.string(),
        type: z.enum(["hospital", "clinic", "pharmacy", "other"]),
        contactPerson: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        taxId: z.string().optional(),
        creditLimit: z.number().optional(),
        notes: z.string().optional(),
      }))
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
      .input(z.object({
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
      }))
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
      .input(z.object({
        customerId: z.number(),
        type: z.enum(["email", "phone", "meeting", "note"]),
        subject: z.string().optional(),
        content: z.string(),
      }))
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
        const inventory = inventoryList && inventoryList.length > 0 ? inventoryList[0] : null;
        
        return {
          ...product,
          currentStock: inventory?.quantity || 0,
          minStockLevel: inventory?.minStockLevel || 0,
          location: inventory?.location || null,
        };
      }),
    
    create: protectedProcedure
      .input(z.object({
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
      }))
      .mutation(async ({ input, ctx }) => {
        const sku = utils.generateProductSKU();
        const { minStockLevel, maxStockLevel, initialQuantity, location, ...productData } = input;
        
        // Create product
        const productId = await db.createProduct({
          ...productData,
          sku,
          createdBy: ctx.user.id,
        } as any);
        
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
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        category: z.string().optional(),
        manufacturerId: z.number().optional(),
        unitPrice: z.number().optional(),
        unit: z.string().optional(),
        specifications: z.string().optional(),
        isActive: z.boolean().optional(),
      }))
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
      .input(z.object({
        productId: z.number(),
        quantity: z.number(),
        batchNumber: z.string().optional(),
        expiryDate: z.date().optional(),
        location: z.string().optional(),
        minStockLevel: z.number().optional(),
        maxStockLevel: z.number().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.createInventory(input as any);
        return { success: true };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        quantity: z.number().optional(),
        batchNumber: z.string().optional(),
        expiryDate: z.date().optional(),
        location: z.string().optional(),
        minStockLevel: z.number().optional(),
        maxStockLevel: z.number().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateInventory(id, data);
        return { success: true };
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
      .input(z.object({
        name: z.string(),
        description: z.string().optional(),
        categoryId: z.number().optional(),
        departmentId: z.number().optional(),
        defaultRequirements: z.string().optional(),
        defaultTerms: z.string().optional(),
        items: z.array(z.object({
          productId: z.number().optional(),
          description: z.string(),
          quantity: z.number().optional(),
          unit: z.string().optional(),
          estimatedPrice: z.number().optional(),
          specifications: z.string().optional(),
        })).optional(),
      }))
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
    
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const tender = await db.getTenderById(input.id);
        const items = await db.getTenderItems(input.id);
        const participants = await db.getTenderParticipants(input.id);
        
        // Get bid items for each participant
        const participantsWithBids = await Promise.all(
          participants.map(async (p) => ({
            ...p,
            bidItems: await db.getParticipantBidItems(p.id),
          }))
        );
        
        return { tender, items, participants: participantsWithBids };
      }),
    
    create: protectedProcedure
      .input(z.object({
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
        items: z.array(z.object({
          productId: z.number().optional(),
          description: z.string(),
          quantity: z.number(),
          unit: z.string().optional(),
          specifications: z.string().optional(),
          estimatedPrice: z.number().optional(),
        })).optional(),
      }))
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
    
    createFromTemplate: protectedProcedure
      .input(z.object({
        templateId: z.number(),
        title: z.string(),
        customerId: z.number().optional(),
        submissionDeadline: z.date().optional(),
        evaluationDeadline: z.date().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const template = await db.getTenderTemplateById(input.templateId);
        if (!template) throw new TRPCError({ code: 'NOT_FOUND' });
        
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
            description: item.description || '',
            quantity: item.quantity || 0,
            unit: item.unit,
            specifications: item.specifications,
            estimatedPrice: item.estimatedPrice,
          } as any);
        }
        
        return { success: true, tenderId, referenceNumber };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        status: z.enum(["draft", "open", "awarded", "closed", "archived"]).optional(),
        submissionDeadline: z.date().optional(),
        evaluationDeadline: z.date().optional(),
        requirements: z.string().optional(),
        terms: z.string().optional(),
        estimatedValue: z.number().optional(),
        awardedSupplierId: z.number().optional(),
        awardedValue: z.number().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        
        if (data.status === 'awarded' && data.awardedSupplierId) {
          (data as any).awardedAt = new Date();
          
          // Notify owner of tender award
          const tender = await db.getTenderById(id);
          if (tender) {
            await notifyOwner({
              title: 'Tender Awarded',
              content: `Tender "${tender.title}" has been awarded by ${ctx.user.name}`,
            });
          }
        }
        
        await db.updateTender(id, data);
        return { success: true };
      }),
    
    addParticipant: protectedProcedure
      .input(z.object({
        tenderId: z.number(),
        supplierId: z.number(),
        totalBidAmount: z.number().optional(),
        notes: z.string().optional(),
        bidItems: z.array(z.object({
          tenderItemId: z.number(),
          unitPrice: z.number(),
          totalPrice: z.number(),
          deliveryTime: z.string().optional(),
          notes: z.string().optional(),
        })).optional(),
      }))
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
      .input(z.object({
        customerId: z.number(),
        tenderId: z.number().optional(),
        dueDate: z.date(),
        subtotal: z.number(),
        taxAmount: z.number().optional(),
        totalAmount: z.number(),
        paymentTerms: z.string().optional(),
        notes: z.string().optional(),
        items: z.array(z.object({
          productId: z.number().optional(),
          description: z.string(),
          quantity: z.number(),
          unitPrice: z.number(),
          totalPrice: z.number(),
        })),
      }))
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
      .input(z.object({
        id: z.number(),
        status: z.enum(["draft", "sent", "paid", "overdue", "cancelled"]).optional(),
        paidAmount: z.number().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateInvoice(id, data);
        return { success: true };
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
      .input(z.object({
        title: z.string(),
        description: z.string().optional(),
        categoryId: z.number(),
        budgetId: z.number().optional(),
        departmentId: z.number().optional(),
        tenderId: z.number().optional(),
        amount: z.number(),
        expenseDate: z.date().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const expenseNumber = utils.generateExpenseNumber();
        
        await db.createExpense({
          ...input,
          expenseNumber,
          createdBy: ctx.user.id,
        } as any);
        
        return { success: true, expenseNumber };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        amount: z.number().optional(),
        status: z.enum(["draft", "pending", "approved", "rejected", "paid"]).optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateExpense(id, data);
        return { success: true };
      }),
    
    approve: protectedProcedure
      .input(z.object({
        id: z.number(),
        approved: z.boolean(),
        rejectionReason: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const expense = await db.getExpenseById(input.id);
        if (!expense) throw new TRPCError({ code: 'NOT_FOUND' });
        
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
          if (budget && utils.isBudgetOverThreshold(budget.allocatedAmount, budget.spentAmount + expense.amount, 90)) {
            await notifyOwner({
              title: 'Budget Alert: 90% Threshold Reached',
              content: `Budget "${budget.name}" has reached 90% of allocated amount`,
            });
          }
        }
        
        return { success: true };
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
      .input(z.object({
        customerId: z.number(),
        tenderId: z.number().optional(),
        invoiceId: z.number().optional(),
        scheduledDate: z.date(),
        deliveryAddress: z.string(),
        driverName: z.string().optional(),
        vehicleNumber: z.string().optional(),
        notes: z.string().optional(),
        items: z.array(z.object({
          productId: z.number(),
          quantity: z.number(),
          batchNumber: z.string().optional(),
          notes: z.string().optional(),
        })),
      }))
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
      .input(z.object({
        id: z.number(),
        status: z.enum(["planned", "in_transit", "delivered", "cancelled"]).optional(),
        deliveredDate: z.date().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateDelivery(id, data);
        
        // Update inventory when delivered
        if (data.status === 'delivered') {
          const items = await db.getDeliveryItems(id);
          for (const item of items) {
            await db.updateInventoryQuantity(item.productId, item.quantity);
          }
        }
        
        return { success: true };
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
        .input(z.object({
          name: z.string(),
          category: z.string(),
          parentId: z.number().optional(),
          requiredDocuments: z.string().optional(),
          reminderEnabled: z.boolean().optional(),
        }))
        .mutation(async ({ input, ctx }) => {
          await db.createDocumentFolder({
            ...input,
            createdBy: ctx.user.id,
          } as any);
          return { success: true };
        }),
    }),
    
    byEntity: protectedProcedure
      .input(z.object({
        entityType: z.string(),
        entityId: z.number(),
      }))
      .query(async ({ input }) => {
        return await db.getDocumentsByEntity(input.entityType, input.entityId);
      }),
    
    upload: protectedProcedure
      .input(z.object({
        entityType: z.string(),
        entityId: z.number(),
        folderId: z.number().optional(),
        fileName: z.string(),
        fileData: z.string(), // base64
        mimeType: z.string(),
        documentType: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Upload to S3
        const buffer = Buffer.from(input.fileData, 'base64');
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
      .input(z.object({
        documentId: z.number(),
        extractionType: z.enum(["tender", "invoice", "expense"]),
      }))
      .mutation(async ({ input }) => {
        const documents = await db.getDocumentsByEntity('', 0);
        const document = documents.find(d => d.id === input.documentId);
        
        if (!document) throw new TRPCError({ code: 'NOT_FOUND' });
        
        // Update document status
        await db.updateDocument(input.documentId, {
          extractionStatus: 'processing',
        });
        
        try {
          // Perform OCR if needed
          let documentText = '';
          if (document.mimeType?.startsWith('image/') || document.mimeType === 'application/pdf') {
            const ocrResult = await performOCR(document.fileUrl);
            if (!ocrResult.success) {
              throw new Error('OCR failed');
            }
            documentText = ocrResult.text;
          }
          
          // Extract data based on type
          let extractionResult;
          switch (input.extractionType) {
            case 'tender':
              extractionResult = await extractTenderData(documentText, document.fileUrl);
              break;
            case 'invoice':
              extractionResult = await extractInvoiceData(documentText);
              break;
            case 'expense':
              extractionResult = await extractExpenseData(documentText);
              break;
          }
          
          if (!extractionResult.success) {
            throw new Error('Extraction failed');
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
            extractionStatus: 'completed',
          });
          
          return { 
            success: true, 
            data: extractionResult.data,
            confidence: extractionResult.confidence,
          };
        } catch (error) {
          await db.updateDocument(input.documentId, {
            extractionStatus: 'failed',
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
          active: budgets.filter(b => b.status === 'active').length,
          overBudget: budgets.filter(b => b.spentAmount > b.allocatedAmount).length,
        },
        tenders: {
          total: tenders.length,
          open: tenders.filter(t => t.status === 'open').length,
          awarded: tenders.filter(t => t.status === 'awarded').length,
        },
        invoices: {
          total: invoices.length,
          unpaid: invoices.filter(i => i.status !== 'paid').length,
          overdue: invoices.filter(i => i.status === 'overdue').length,
        },
        expenses: {
          total: expenses.length,
          pending: expenses.filter(e => e.status === 'pending').length,
        },
        inventory: {
          lowStock: lowStock.length,
        },
        anomalies: {
          active: anomalies.length,
          critical: anomalies.filter(a => a.severity === 'critical').length,
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
      .input(z.object({
        id: z.number(),
        status: z.enum(["new", "acknowledged", "investigating", "resolved", "false_positive"]),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        
        if (data.status === 'resolved') {
          (data as any).resolvedBy = ctx.user.id;
          (data as any).resolvedAt = new Date();
        }
        
        await db.updateAnomaly(id, data);
        return { success: true };
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
  }),

  // ============================================
  // AUDIT LOGS
  // ============================================
  auditLogs: router({
    list: adminProcedure
      .input(z.object({
        entityType: z.string().optional(),
        entityId: z.number().optional(),
      }))
      .query(async ({ input }) => {
        return await db.getAuditLogs(input.entityType, input.entityId);
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
      .input(z.object({
        key: z.string(),
        value: z.string(),
        category: z.string(),
        description: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.upsertSetting({
          ...input,
          updatedBy: ctx.user.id,
        } as any);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
