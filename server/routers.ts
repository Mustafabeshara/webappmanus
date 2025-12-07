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
import * as dashboardAnalytics from "./dashboardAnalytics";
import { notifyOwner } from "./_core/notification";
import { createPermissionMiddleware, checkResourceAccess, logAudit, validateApproval } from "./_core/permissions";
import * as notificationHelpers from "./_core/notificationHelpers";

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
  
  // ============================================
  // DASHBOARD ANALYTICS
  // ============================================
  dashboard: router({
    tenderAnalytics: protectedProcedure
      .input(z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }))
      .query(async ({ input }) => {
        return await dashboardAnalytics.getTenderAnalytics(input.startDate, input.endDate);
      }),
    
    budgetAnalytics: protectedProcedure
      .input(z.object({
        fiscalYear: z.number().optional(),
      }))
      .query(async ({ input }) => {
        return await dashboardAnalytics.getBudgetAnalytics(input.fiscalYear);
      }),
    
    invoiceAnalytics: protectedProcedure
      .input(z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }))
      .query(async ({ input }) => {
        return await dashboardAnalytics.getInvoiceAnalytics(input.startDate, input.endDate);
      }),
    
    purchaseOrderAnalytics: protectedProcedure
      .input(z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }))
      .query(async ({ input }) => {
        return await dashboardAnalytics.getPurchaseOrderAnalytics(input.startDate, input.endDate);
      }),
    
    inventoryAnalytics: protectedProcedure
      .query(async () => {
        return await dashboardAnalytics.getInventoryAnalytics();
      }),
    
    deliveryAnalytics: protectedProcedure
      .input(z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }))
      .query(async ({ input }) => {
        return await dashboardAnalytics.getDeliveryAnalytics(input.startDate, input.endDate);
      }),
    
    recentActivity: protectedProcedure
      .input(z.object({
        limit: z.number().default(10),
      }))
      .query(async ({ input }) => {
        return await dashboardAnalytics.getRecentActivity(input.limit);
      }),
  }),
  
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
        await db.updateUser(input.userId, { role: input.role });
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
        await db.setUserPermission(input as any);
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
        // Department update functionality not yet implemented
        throw new TRPCError({ code: 'NOT_IMPLEMENTED', message: 'Department updates not yet implemented' });
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
    list: protectedProcedure
      .use(createPermissionMiddleware('budgets', 'view'))
      .query(async () => {
        return await db.getAllBudgets();
      }),
    
    get: protectedProcedure
      .use(createPermissionMiddleware('budgets', 'view'))
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const budget = await db.getBudgetById(input.id);
        if (!budget) throw new TRPCError({ code: 'NOT_FOUND', message: 'Budget not found' });
        await checkResourceAccess(ctx, budget, 'budget');
        return budget;
      }),
    
    create: protectedProcedure
      .use(createPermissionMiddleware('budgets', 'create'))
      .input(z.object({
        name: z.string(),
        categoryId: z.number(),
        departmentId: z.number().optional(),
        fiscalYear: z.number(),
        allocatedAmount: z.number(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await db.createBudget({
          ...input,
          createdBy: ctx.user.id,
        } as any);
        
        await logAudit({
          userId: ctx.user.id,
          action: 'create',
          entityType: 'budget',
          entityId: Number(result.insertId),
          changes: { name: input.name, allocatedAmount: input.allocatedAmount },
        });
        
        return { success: true };
      }),
    
    update: protectedProcedure
      .use(createPermissionMiddleware('budgets', 'edit'))
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        allocatedAmount: z.number().optional(),
        status: z.enum(["draft", "active", "closed"]).optional(),
        approvalStatus: z.enum(["pending", "approved", "rejected"]).optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        
        const budget = await db.getBudgetById(id);
        if (!budget) throw new TRPCError({ code: 'NOT_FOUND', message: 'Budget not found' });
        await checkResourceAccess(ctx, budget, 'budget');
        
        if (data.allocatedAmount && data.allocatedAmount !== budget.allocatedAmount) {
          await logAudit({
            userId: ctx.user.id,
            action: 'update',
            entityType: 'budget',
            entityId: id,
            changes: { allocatedAmount: { from: budget.allocatedAmount, to: data.allocatedAmount } },
          });
        }
        
        await db.updateBudget(id, data);
        return { success: true };
      }),
    
    approve: protectedProcedure
      .use(createPermissionMiddleware('budgets', 'approve'))
      .input(z.object({
        id: z.number(),
        approved: z.boolean(),
        rejectionReason: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const budget = await db.getBudgetById(input.id);
        if (!budget) throw new TRPCError({ code: 'NOT_FOUND' });
        
        await validateApproval(ctx, budget, 'budgets');
        
        await db.updateBudget(input.id, {
          approvalStatus: input.approved ? "approved" : "rejected",
          status: input.approved ? "active" : "draft",
          approvedBy: ctx.user.id,
          approvedAt: new Date(),
        });
        
        await logAudit({
          userId: ctx.user.id,
          action: input.approved ? 'approve' : 'reject',
          entityType: 'budget',
          entityId: input.id,
          changes: { status: { from: budget.approvalStatus, to: input.approved ? 'approved' : 'rejected' } },
        });
        
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
    list: protectedProcedure
      .use(createPermissionMiddleware('suppliers', 'view'))
      .query(async () => {
        return await db.getAllSuppliers();
      }),
    
    get: protectedProcedure
      .use(createPermissionMiddleware('suppliers', 'view'))
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getSupplierById(input.id);
      }),
    
    create: protectedProcedure
      .use(createPermissionMiddleware('suppliers', 'create'))
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
      .use(createPermissionMiddleware('suppliers', 'edit'))
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
    list: protectedProcedure
      .use(createPermissionMiddleware('customers', 'view'))
      .query(async () => {
        return await db.getAllCustomers();
      }),
    
    get: protectedProcedure
      .use(createPermissionMiddleware('customers', 'view'))
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getCustomerById(input.id);
      }),
    
    create: protectedProcedure
      .use(createPermissionMiddleware('customers', 'create'))
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
      .use(createPermissionMiddleware('customers', 'edit'))
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
        const inventory = await db.getInventoryByProductId(input.id);
        
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
    list: protectedProcedure
      .use(createPermissionMiddleware('inventory', 'view'))
      .query(async () => {
      const inventory = await db.getAllInventory();
      const products = await db.getAllProducts();
      const suppliers = await db.getAllSuppliers();
      
      // Join inventory with product details
      return inventory.map(inv => {
        const product = products.find(p => p.id === inv.productId);
        const manufacturer = product?.manufacturerId ? suppliers.find(s => s.id === product.manufacturerId) : null;
        
        return {
          ...inv,
          name: product?.name || 'Unknown Product',
          sku: product?.sku || '',
          category: product?.category || null,
          unit: product?.unit || null,
          unitPrice: product?.unitPrice || null,
          manufacturerId: product?.manufacturerId || null,
          manufacturerName: manufacturer?.name || null,
          currentStock: inv.quantity,
          reorderLevel: inv.minStockLevel,
        };
      });
    }),
    
    lowStock: protectedProcedure
      .use(createPermissionMiddleware('inventory', 'view'))
      .query(async () => {
        return await db.getLowStockItems();
      }),
    
    byProduct: protectedProcedure
      .use(createPermissionMiddleware('inventory', 'view'))
      .input(z.object({ productId: z.number() }))
      .query(async ({ input }) => {
        return await db.getInventoryByProductId(input.productId);
      }),
    
    create: protectedProcedure
      .use(createPermissionMiddleware('inventory', 'create'))
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
      .use(createPermissionMiddleware('inventory', 'edit'))
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
        const inventory = await db.getInventoryById(id);
        if (!inventory) throw new TRPCError({ code: 'NOT_FOUND' });
        
        await db.updateInventory(id, data);
        
        // Notification: Check for low stock after update
        const updatedQty = data.quantity !== undefined ? data.quantity : inventory.quantity;
        const minLevel = data.minStockLevel !== undefined ? data.minStockLevel : inventory.minStockLevel;
        if (updatedQty <= minLevel) {
          await notificationHelpers.notifyLowStock(id);
        }
        
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
    list: protectedProcedure
      .use(createPermissionMiddleware('tenders', 'view'))
      .query(async () => {
        return await db.getAllTenders();
      }),
    
    get: protectedProcedure
      .use(createPermissionMiddleware('tenders', 'view'))
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const tender = await db.getTenderById(input.id);
        if (!tender) throw new TRPCError({ code: 'NOT_FOUND', message: 'Tender not found' });
        await checkResourceAccess(ctx, tender, 'tender');
        
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
      .use(createPermissionMiddleware('tenders', 'create'))
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
        
        await logAudit({
          userId: ctx.user.id,
          action: 'create',
          entityType: 'tender',
          entityId: tenderId,
          changes: { title: input.title, referenceNumber },
        });
        
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
      .use(createPermissionMiddleware('tenders', 'edit'))
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
        
        const tender = await db.getTenderById(id);
        if (!tender) throw new TRPCError({ code: 'NOT_FOUND', message: 'Tender not found' });
        await checkResourceAccess(ctx, tender, 'tender');
        
        if (data.status === 'awarded' && data.awardedSupplierId) {
          (data as any).awardedAt = new Date();
          
          await logAudit({
            userId: ctx.user.id,
            action: 'award',
            entityType: 'tender',
            entityId: id,
            changes: { awardedSupplierId: data.awardedSupplierId, awardedValue: data.awardedValue },
          });
          
          await notifyOwner({
            title: 'Tender Awarded',
            content: `Tender "${tender.title}" has been awarded by ${ctx.user.name}`,
          });
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
    list: protectedProcedure
      .use(createPermissionMiddleware('invoices', 'view'))
      .query(async () => {
        return await db.getAllInvoices();
      }),
    
    get: protectedProcedure
      .use(createPermissionMiddleware('invoices', 'view'))
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const invoice = await db.getInvoiceById(input.id);
        if (!invoice) throw new TRPCError({ code: 'NOT_FOUND', message: 'Invoice not found' });
        await checkResourceAccess(ctx, invoice, 'invoice');
        
        const items = await db.getInvoiceItems(input.id);
        return { invoice, items };
      }),
    
    create: protectedProcedure
      .use(createPermissionMiddleware('invoices', 'create'))
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
        
        await logAudit({
          userId: ctx.user.id,
          action: 'create',
          entityType: 'invoice',
          entityId: invoiceId,
          changes: { invoiceNumber, totalAmount: input.totalAmount },
        });
        
        return { success: true, invoiceId, invoiceNumber };
      }),
    
    update: protectedProcedure
      .use(createPermissionMiddleware('invoices', 'edit'))
      .input(z.object({
        id: z.number(),
        status: z.enum(["draft", "sent", "paid", "overdue", "cancelled"]).optional(),
        paidAmount: z.number().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        
        const invoice = await db.getInvoiceById(id);
        if (!invoice) throw new TRPCError({ code: 'NOT_FOUND', message: 'Invoice not found' });
        await checkResourceAccess(ctx, invoice, 'invoice');
        
        await db.updateInvoice(id, data);
        return { success: true };
      }),
  }),

  // ============================================
  // EXPENSES
  // ============================================
  expenses: router({
    list: protectedProcedure
      .use(createPermissionMiddleware('expenses', 'view'))
      .query(async () => {
        return await db.getAllExpenses();
      }),
    
    get: protectedProcedure
      .use(createPermissionMiddleware('expenses', 'view'))
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const expense = await db.getExpenseById(input.id);
        if (!expense) throw new TRPCError({ code: 'NOT_FOUND', message: 'Expense not found' });
        
        // IDOR Prevention: Check resource access
        await checkResourceAccess(ctx, expense, 'expense');
        
        return expense;
      }),
    
    create: protectedProcedure
      .use(createPermissionMiddleware('expenses', 'create'))
      .input(z.object({
        title: z.string(),
        description: z.string().optional(),
        categoryId: z.number(),
        budgetId: z.number().optional(),
        departmentId: z.number().optional(),
        tenderId: z.number().optional(),
        amount: z.number(),
        expenseDate: z.date().optional(),
        receiptUrl: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const expenseNumber = utils.generateExpenseNumber();
        
        const result = await db.createExpense({
          ...input,
          expenseNumber,
          createdBy: ctx.user.id,
        } as any);
        
        const expenseId = Number(result.insertId);
        
        // Audit Log: Expense creation
        await logAudit({
          userId: ctx.user.id,
          action: 'create',
          entityType: 'expense',
          entityId: expenseId,
          changes: { title: input.title, amount: input.amount },
        });
        
        return { success: true, expenseNumber, expenseId };
      }),
    
    update: protectedProcedure
      .use(createPermissionMiddleware('expenses', 'edit'))
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        amount: z.number().optional(),
        status: z.enum(["draft", "pending", "approved", "rejected", "paid"]).optional(),
        receiptUrl: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        
        // IDOR Prevention: Check resource access
        const expense = await db.getExpenseById(id);
        if (!expense) throw new TRPCError({ code: 'NOT_FOUND', message: 'Expense not found' });
        await checkResourceAccess(ctx, expense, 'expense');
        
        // Audit Log: Track amount changes
        if (data.amount && data.amount !== expense.amount) {
          await logAudit({
            userId: ctx.user.id,
            action: 'update',
            entityType: 'expense',
            entityId: id,
            changes: { amount: { from: expense.amount, to: data.amount } },
          });
        }
        
        await db.updateExpense(id, data);
        return { success: true };
      }),
    
    approve: protectedProcedure
      .use(createPermissionMiddleware('expenses', 'approve'))
      .input(z.object({
        id: z.number(),
        approved: z.boolean(),
        rejectionReason: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const expense = await db.getExpenseById(input.id);
        if (!expense) throw new TRPCError({ code: 'NOT_FOUND' });
        if (expense.status !== 'pending') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Expense must be in pending status to approve/reject' });
        }
        
        // Validate approval workflow (prevent self-approval)
        await validateApproval(ctx, expense, 'expenses');
        
        await db.updateExpense(input.id, {
          status: input.approved ? "approved" : "rejected",
          approvalStatus: input.approved ? "approved" : "rejected",
          approvedBy: ctx.user.id,
          approvedAt: new Date(),
          rejectionReason: input.rejectionReason,
        });
        
        // Audit Log: Expense approval/rejection
        await logAudit({
          userId: ctx.user.id,
          action: input.approved ? 'approve' : 'reject',
          entityType: 'expense',
          entityId: input.id,
          changes: {
            status: { from: expense.status, to: input.approved ? 'approved' : 'rejected' },
            reason: input.rejectionReason,
          },
        });
        
        // Notification: Notify submitter of approval/rejection
        if (input.approved) {
          await notificationHelpers.notifyExpenseApproved(input.id, expense.createdBy, ctx.user.name || 'Admin');
        } else {
          await notificationHelpers.notifyExpenseRejected(input.id, expense.createdBy, ctx.user.name || 'Admin', input.rejectionReason);
        }
        
        // Update budget spent amount if approved
        if (input.approved && expense.budgetId) {
          const budget = await db.getBudgetById(expense.budgetId);
          if (budget) {
            await db.updateBudget(expense.budgetId, { spentAmount: (budget.spentAmount || 0) + expense.amount });
          
            // Check for budget overrun
            if (utils.isBudgetOverThreshold(budget.allocatedAmount, budget.spentAmount + expense.amount, 90)) {
              await notifyOwner({
                title: 'Budget Alert: 90% Threshold Reached',
                content: `Budget "${budget.name}" has reached 90% of allocated amount`,
              });
            }
          }
        }
        
        return { success: true };
      }),
    
    uploadReceipt: protectedProcedure
      .input(z.object({
        file: z.string(), // base64 encoded image
        filename: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Decode base64 image
        const base64Data = input.file.split(',')[1] || input.file;
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Upload to S3
        const fileKey = `receipts/${ctx.user.id}/${Date.now()}-${input.filename}`;
        const { url } = await storagePut(fileKey, buffer, 'image/jpeg');
        
        // Perform OCR on the receipt using RapidOCR
        const { performRapidOCR } = await import('./rapidocr');
        const ocrResult = await performRapidOCR(base64Data);
        
        if (!ocrResult.success) {
          throw new Error(ocrResult.error || 'OCR failed');
        }
        
        // Extract expense data from OCR text
        const extractedData = await extractExpenseData(ocrResult.text);
        
        return {
          success: true,
          receiptUrl: url,
          extractedData,
        };
      }),
    
    extractRegion: protectedProcedure
      .input(z.object({
        receiptUrl: z.string(),
        boundingBox: z.object({
          x: z.number(),
          y: z.number(),
          width: z.number(),
          height: z.number(),
        }),
        fieldType: z.enum(['title', 'amount', 'date', 'vendor', 'description']),
      }))
      .mutation(async ({ input }) => {
        // Download image from S3
        const response = await fetch(input.receiptUrl);
        const buffer = await response.arrayBuffer();
        const base64Data = Buffer.from(buffer).toString('base64');
        
        // Perform OCR on the specific region using RapidOCR
        const { extractRegionText } = await import('./rapidocr');
        const extractedText = await extractRegionText(base64Data, input.boundingBox);
        
        // Parse the extracted text based on field type
        const extractedData = await extractExpenseData(extractedText);
        
        let value = null;
        if (extractedData.success && extractedData.data) {
          switch (input.fieldType) {
            case 'title':
              value = extractedData.data.title;
              break;
            case 'amount':
              value = extractedData.data.amount;
              break;
            case 'date':
              value = extractedData.data.expenseDate;
              break;
            case 'vendor':
              value = extractedData.data.vendor;
              break;
            case 'description':
              value = extractedData.data.description;
              break;
          }
        }
        
        return {
          success: true,
          fieldType: input.fieldType,
          value,
          text: extractedText.substring(0, 200), // First 200 chars for preview
        };
      }),
    
    batchUploadReceipts: protectedProcedure
      .input(z.object({
        receipts: z.array(z.object({
          file: z.string(), // base64 encoded image
          filename: z.string(),
        })),
      }))
      .mutation(async ({ input, ctx }) => {
        const results = [];
        
        // Process each receipt
        for (const receipt of input.receipts) {
          try {
            // Decode base64 image
            const base64Data = receipt.file.split(',')[1] || receipt.file;
            const buffer = Buffer.from(base64Data, 'base64');
            
            // Upload to S3
            const fileKey = `receipts/${ctx.user.id}/${Date.now()}-${receipt.filename}`;
            const { url } = await storagePut(fileKey, buffer, 'image/jpeg');
            
            // Perform OCR using RapidOCR
            const { performRapidOCR } = await import('./rapidocr');
            const ocrResult = await performRapidOCR(base64Data);
            
            if (!ocrResult.success) {
              throw new Error(ocrResult.error || 'OCR failed');
            }
            
            // Extract expense data
            const extractedData = await extractExpenseData(ocrResult.text);
            
            // Auto-create draft expense if extraction successful
            let expenseId: number | undefined = undefined;
            let expenseNumber: string | undefined = undefined;
            
            if (extractedData.success && extractedData.data) {
              const data = extractedData.data;
              
              // Only create if we have at least title and amount
              if (data.title && data.amount) {
                expenseNumber = await utils.generateExpenseNumber();
                const createResult = await db.createExpense({
                  expenseNumber,
                  title: data.title,
                  description: data.description || (data.vendor ? `Vendor: ${data.vendor}` : ''),
                  amount: data.amount,
                  expenseDate: data.expenseDate || new Date(),
                  categoryId: data.categoryId,
                  budgetId: data.budgetId,
                  departmentId: data.departmentId,
                  receiptUrl: url,
                  status: 'draft',
                  createdBy: ctx.user.id,
                });
                expenseId = createResult.insertId;
              }
            }
            
            results.push({
              success: true,
              filename: receipt.filename,
              receiptUrl: url,
              extractedData,
              expenseId,
              expenseNumber,
            });
          } catch (error: any) {
            results.push({
              success: false,
              filename: receipt.filename,
              error: error.message || 'Failed to process receipt',
            });
          }
        }
        
        return {
          success: true,
          results,
          totalProcessed: results.length,
          successCount: results.filter(r => r.success).length,
          errorCount: results.filter(r => !r.success).length,
        };
      }),
    
    bulkImport: protectedProcedure
      .input(z.object({
        expenses: z.array(z.object({
          title: z.string(),
          description: z.string().optional(),
          categoryId: z.number(),
          budgetId: z.number().optional(),
          departmentId: z.number().optional(),
          amount: z.number(),
          expenseDate: z.string(), // ISO date string from CSV
          notes: z.string().optional(),
        })),
      }))
      .mutation(async ({ input, ctx }) => {
        const results = {
          success: [] as any[],
          errors: [] as any[],
          duplicates: [] as any[],
        };

        // Check for duplicates within the import batch
        const seen = new Set<string>();
        const allExpenses = await db.getAllExpenses();
        
        for (let i = 0; i < input.expenses.length; i++) {
          const expense = input.expenses[i];
          const key = `${expense.title}-${expense.amount}-${expense.expenseDate}`;
          
          try {
            // Check for duplicate in batch
            if (seen.has(key)) {
              results.duplicates.push({
                row: i + 1,
                expense,
                reason: 'Duplicate within import batch',
              });
              continue;
            }
            
            // Check for duplicate in database (same title, amount, and date)
            const isDuplicate = allExpenses.some(e => 
              e.title === expense.title && 
              e.amount === expense.amount && 
              e.expenseDate && new Date(e.expenseDate).toISOString().split('T')[0] === expense.expenseDate
            );
            
            if (isDuplicate) {
              results.duplicates.push({
                row: i + 1,
                expense,
                reason: 'Already exists in database',
              });
              continue;
            }
            
            seen.add(key);
            
            // Create expense
            const expenseNumber = utils.generateExpenseNumber();
            await db.createExpense({
              ...expense,
              expenseNumber,
              expenseDate: new Date(expense.expenseDate),
              createdBy: ctx.user.id,
            } as any);
            
            results.success.push({
              row: i + 1,
              expenseNumber,
              title: expense.title,
            });
          } catch (error: any) {
            results.errors.push({
              row: i + 1,
              expense,
              error: error.message || 'Unknown error',
            });
          }
        }
        
        return results;
      }),
    
    // Analytics endpoints
    analyticsByCategory: protectedProcedure
      .input(z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }))
      .query(async ({ input }) => {
        const expenses = await db.getAllExpenses();
        const categories = await db.getAllBudgetCategories();
        
        // Filter by date range if provided
        let filtered = expenses.filter(e => e.status === 'approved' || e.status === 'paid');
        if (input.startDate) {
          filtered = filtered.filter(e => e.expenseDate && new Date(e.expenseDate) >= input.startDate!);
        }
        if (input.endDate) {
          filtered = filtered.filter(e => e.expenseDate && new Date(e.expenseDate) <= input.endDate!);
        }
        
        // Group by category
        const byCategory = new Map<number, { name: string; total: number; count: number }>();
        for (const expense of filtered) {
          if (!expense.categoryId) continue;
          const existing = byCategory.get(expense.categoryId) || { name: '', total: 0, count: 0 };
          const category = categories.find(c => c.id === expense.categoryId);
          byCategory.set(expense.categoryId, {
            name: category?.name || 'Unknown',
            total: existing.total + expense.amount,
            count: existing.count + 1,
          });
        }
        
        return Array.from(byCategory.entries()).map(([id, data]) => ({
          categoryId: id,
          categoryName: data.name,
          totalAmount: data.total,
          expenseCount: data.count,
        }));
      }),
    
    analyticsByDepartment: protectedProcedure
      .input(z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }))
      .query(async ({ input }) => {
        const expenses = await db.getAllExpenses();
        const departments = await db.getAllDepartments();
        
        // Filter by date range and approved status
        let filtered = expenses.filter(e => e.status === 'approved' || e.status === 'paid');
        if (input.startDate) {
          filtered = filtered.filter(e => e.expenseDate && new Date(e.expenseDate) >= input.startDate!);
        }
        if (input.endDate) {
          filtered = filtered.filter(e => e.expenseDate && new Date(e.expenseDate) <= input.endDate!);
        }
        
        // Group by department
        const byDepartment = new Map<number, { name: string; total: number; count: number }>();
        for (const expense of filtered) {
          if (!expense.departmentId) continue;
          const existing = byDepartment.get(expense.departmentId) || { name: '', total: 0, count: 0 };
          const department = departments.find(d => d.id === expense.departmentId);
          byDepartment.set(expense.departmentId, {
            name: department?.name || 'Unknown',
            total: existing.total + expense.amount,
            count: existing.count + 1,
          });
        }
        
        return Array.from(byDepartment.entries()).map(([id, data]) => ({
          departmentId: id,
          departmentName: data.name,
          totalAmount: data.total,
          expenseCount: data.count,
        }));
      }),
    
    budgetVariance: protectedProcedure
      .input(z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }))
      .query(async ({ input }) => {
        const expenses = await db.getAllExpenses();
        const budgets = await db.getAllBudgets();
        
        // Filter approved expenses by date range
        let filtered = expenses.filter(e => e.status === 'approved' || e.status === 'paid');
        if (input.startDate) {
          filtered = filtered.filter(e => e.expenseDate && new Date(e.expenseDate) >= input.startDate!);
        }
        if (input.endDate) {
          filtered = filtered.filter(e => e.expenseDate && new Date(e.expenseDate) <= input.endDate!);
        }
        
        // Calculate variance by budget
        const spendingByBudget = new Map<number, number>();
        for (const expense of filtered) {
          if (!expense.budgetId) continue;
          const current = spendingByBudget.get(expense.budgetId) || 0;
          spendingByBudget.set(expense.budgetId, current + expense.amount);
        }
        
        // Compare with budget allocations
        return budgets.map(budget => {
          const spent = spendingByBudget.get(budget.id) || 0;
          const allocated = budget.allocatedAmount;
          const variance = allocated - spent;
          const utilizationPercent = allocated > 0 ? (spent / allocated) * 100 : 0;
          
          return {
            budgetId: budget.id,
            budgetName: budget.name,
            allocated,
            spent,
            remaining: variance,
            utilizationPercent,
            status: utilizationPercent > 100 ? 'over' : utilizationPercent > 90 ? 'warning' : 'ok',
          };
        });
      }),
    
    trendOverTime: protectedProcedure
      .input(z.object({
        startDate: z.date(),
        endDate: z.date(),
        groupBy: z.enum(['day', 'week', 'month']).default('month'),
      }))
      .query(async ({ input }) => {
        const expenses = await db.getAllExpenses();
        
        // Filter approved expenses by date range
        const filtered = expenses.filter(e => {
          if (!e.expenseDate) return false;
          const date = new Date(e.expenseDate);
          return (e.status === 'approved' || e.status === 'paid') &&
                 date >= input.startDate &&
                 date <= input.endDate;
        });
        
        // Group by time period
        const byPeriod = new Map<string, { total: number; count: number }>();
        for (const expense of filtered) {
          if (!expense.expenseDate) continue;
          const date = new Date(expense.expenseDate);
          let periodKey: string;
          
          if (input.groupBy === 'day') {
            periodKey = date.toISOString().split('T')[0];
          } else if (input.groupBy === 'week') {
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            periodKey = weekStart.toISOString().split('T')[0];
          } else { // month
            periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          }
          
          const existing = byPeriod.get(periodKey) || { total: 0, count: 0 };
          byPeriod.set(periodKey, {
            total: existing.total + expense.amount,
            count: existing.count + 1,
          });
        }
        
        return Array.from(byPeriod.entries())
          .map(([period, data]) => ({
            period,
            totalAmount: data.total,
            expenseCount: data.count,
            averageAmount: data.count > 0 ? data.total / data.count : 0,
          }))
          .sort((a, b) => a.period.localeCompare(b.period));
      }),
  }),

  // ============================================
  // PURCHASE ORDERS
  // ============================================
  purchaseOrders: router({
    list: protectedProcedure
      .use(createPermissionMiddleware('purchaseOrders', 'view'))
      .query(async () => {
        return await db.getAllPurchaseOrders();
      }),
    
    get: protectedProcedure
      .use(createPermissionMiddleware('purchaseOrders', 'view'))
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const po = await db.getPurchaseOrderById(input.id);
        if (!po) throw new TRPCError({ code: 'NOT_FOUND', message: 'Purchase order not found' });
        await checkResourceAccess(ctx, po, 'purchaseOrder');
        
        const items = await db.getPurchaseOrderItems(input.id);
        const receipts = await db.getGoodsReceiptsByPO(input.id);
        return { po, items, receipts };
      }),
    
    create: protectedProcedure
      .use(createPermissionMiddleware('purchaseOrders', 'create'))
      .input(z.object({
        supplierId: z.number(),
        tenderId: z.number().optional(),
        budgetId: z.number().optional(),
        deliveryDate: z.date().optional(),
        subtotal: z.number(),
        taxAmount: z.number().optional(),
        totalAmount: z.number(),
        paymentTerms: z.string().optional(),
        deliveryAddress: z.string().optional(),
        notes: z.string().optional(),
        items: z.array(z.object({
          productId: z.number().optional(),
          description: z.string(),
          quantity: z.number(),
          unitPrice: z.number(),
          totalPrice: z.number(),
          notes: z.string().optional(),
        })),
      }))
      .mutation(async ({ input, ctx }) => {
        const { items, ...poData } = input;
        const poNumber = utils.generatePONumber();
        
        const result = await db.createPurchaseOrder({
          ...poData,
          poNumber,
          taxAmount: poData.taxAmount || 0,
          createdBy: ctx.user.id,
        } as any);
        
        const poId = Number(result.insertId);
        
        for (const item of items) {
          await db.createPurchaseOrderItem({
            poId,
            ...item,
          } as any);
        }
        
        await logAudit({
          userId: ctx.user.id,
          action: 'create',
          entityType: 'purchaseOrder',
          entityId: poId,
          changes: { poNumber, totalAmount: input.totalAmount },
        });
        
        return { success: true, poId, poNumber };
      }),
    
    update: protectedProcedure
      .use(createPermissionMiddleware('purchaseOrders', 'edit'))
      .input(z.object({
        id: z.number(),
        status: z.enum(["draft", "submitted", "approved", "rejected", "completed", "cancelled"]).optional(),
        deliveryDate: z.date().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        
        const po = await db.getPurchaseOrderById(id);
        if (!po) throw new TRPCError({ code: 'NOT_FOUND', message: 'Purchase order not found' });
        await checkResourceAccess(ctx, po, 'purchaseOrder');
        
        await db.updatePurchaseOrder(id, data);
        return { success: true };
      }),
    
    approve: protectedProcedure
      .use(createPermissionMiddleware('purchaseOrders', 'approve'))
      .input(z.object({
        id: z.number(),
        approved: z.boolean(),
        rejectionReason: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const po = await db.getPurchaseOrderById(input.id);
        if (!po) throw new TRPCError({ code: 'NOT_FOUND' });
        
        await validateApproval(ctx, po, 'purchaseOrders');
        
        await db.updatePurchaseOrder(input.id, {
          status: input.approved ? "approved" : "rejected",
          approvedBy: ctx.user.id,
          approvedAt: new Date(),
          rejectionReason: input.rejectionReason,
        });
        
        await logAudit({
          userId: ctx.user.id,
          action: input.approved ? 'approve' : 'reject',
          entityType: 'purchaseOrder',
          entityId: input.id,
          changes: { status: { from: po.status, to: input.approved ? 'approved' : 'rejected' } },
        });
        
        // Notification: Send notification about approval status
        // (Note: Approval notification would go to PO creator - not yet implemented in helpers)
        
        // Update budget spent amount if approved and linked to budget
        if (input.approved && po.budgetId) {
          const budget = await db.getBudgetById(po.budgetId);
          if (budget) {
            await db.updateBudget(po.budgetId, { spentAmount: (budget.spentAmount || 0) + po.totalAmount });
          
            // Check for budget overrun
            if (utils.isBudgetOverThreshold(budget.allocatedAmount, budget.spentAmount + po.totalAmount, 90)) {
              await notifyOwner({
                title: 'Budget Alert: 90% Threshold Reached',
                content: `Budget "${budget.name}" has reached 90% of allocated amount`,
              });
            }
          }
        }
        
        return { success: true };
      }),
    
    receiveGoods: protectedProcedure
      .input(z.object({
        poId: z.number(),
        items: z.array(z.object({
          poItemId: z.number(),
          quantityReceived: z.number(),
          batchNumber: z.string().optional(),
          expiryDate: z.date().optional(),
          condition: z.enum(["good", "damaged", "defective"]).optional(),
          notes: z.string().optional(),
        })),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { poId, items, notes } = input;
        const receiptNumber = utils.generateGoodsReceiptNumber();
        
        // Create goods receipt
        const receiptResult = await db.createGoodsReceipt({
          poId,
          receiptNumber,
          receivedBy: ctx.user.id,
          notes,
        } as any);
        
        const receiptId = Number(receiptResult.insertId);
        
        // Create receipt items and update PO item received quantities
        for (const item of items) {
          await db.createGoodsReceiptItem({
            receiptId,
            ...item,
            condition: item.condition || "good",
          } as any);
          
          // Update PO item received quantity
          const poItem = await db.getPurchaseOrderItems(poId);
          const currentItem = poItem.find(i => i.id === item.poItemId);
          if (currentItem) {
            const newReceivedQty = currentItem.receivedQuantity + item.quantityReceived;
            await db.updatePurchaseOrderItem(item.poItemId, {
              receivedQuantity: newReceivedQty,
            });
            
            // Update inventory if product is linked
            if (currentItem.productId) {
              const inventoryRecord = await db.getInventoryByProductId(currentItem.productId);
              if (inventoryRecord) {
                await db.updateInventory(currentItem.productId, {
                  quantity: (inventoryRecord.quantity || 0) + item.quantityReceived,
                  lastRestocked: new Date(),
                });
              }
            }
          }
        }
        
        // Check if PO is fully received and update status
        const allItems = await db.getPurchaseOrderItems(poId);
        const fullyReceived = allItems.every(item => item.receivedQuantity >= item.quantity);
        const partiallyReceived = allItems.some(item => item.receivedQuantity > 0);
        
        await db.updatePurchaseOrder(poId, {
          receivedStatus: fullyReceived ? "fully_received" : (partiallyReceived ? "partially_received" : "not_received"),
          receivedDate: fullyReceived ? new Date() : undefined,
          status: fullyReceived ? "completed" : undefined,
        });
        
        return { success: true, receiptId, receiptNumber };
      }),
  }),

  // ============================================
  // DELIVERIES
  // ============================================
  deliveries: router({
    list: protectedProcedure
      .use(createPermissionMiddleware('deliveries', 'view'))
      .query(async () => {
        return await db.getAllDeliveries();
      }),
    
    get: protectedProcedure
      .use(createPermissionMiddleware('deliveries', 'view'))
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const delivery = await db.getDeliveryById(input.id);
        if (!delivery) throw new TRPCError({ code: 'NOT_FOUND', message: 'Delivery not found' });
        await checkResourceAccess(ctx, delivery, 'delivery');
        
        const items = await db.getDeliveryItems(input.id);
        return { delivery, items };
      }),
    
    create: protectedProcedure
      .use(createPermissionMiddleware('deliveries', 'create'))
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
        
        await logAudit({
          userId: ctx.user.id,
          action: 'create',
          entityType: 'delivery',
          entityId: deliveryId,
          changes: { deliveryNumber },
        });
        
        return { success: true, deliveryId, deliveryNumber };
      }),
    
    update: protectedProcedure
      .use(createPermissionMiddleware('deliveries', 'edit'))
      .input(z.object({
        id: z.number(),
        status: z.enum(["planned", "in_transit", "delivered", "cancelled"]).optional(),
        deliveredDate: z.date().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        
        const delivery = await db.getDeliveryById(id);
        if (!delivery) throw new TRPCError({ code: 'NOT_FOUND', message: 'Delivery not found' });
        await checkResourceAccess(ctx, delivery, 'delivery');
        
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
  // ANALYTICS & FORECASTING
  // ============================================
  analytics: router({
    dashboard: protectedProcedure.query(async () => {
      const budgets = await db.getAllBudgets();
      const tenders = await db.getAllTenders();
      const invoices = await db.getAllInvoices();
      const expenses = await db.getAllExpenses();
      const lowStockItems = await db.getLowStockItems();
      
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
          lowStock: lowStockItems.length,
        },

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
      return await db.getUserNotifications(ctx.user.id, true);
    }),
    
    unreadCount: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUnreadNotificationCount(ctx.user.id);
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
  // TASKS
  // ============================================
  tasks: router({
    list: protectedProcedure
      .use(createPermissionMiddleware('tasks', 'view'))
      .input(z.object({
        assigneeId: z.number().optional(),
        creatorId: z.number().optional(),
        status: z.enum(["todo", "in_progress", "review", "done", "cancelled"]).optional(),
        priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
        relatedModule: z.string().optional(),
        relatedId: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        return await db.getAllTasks();
      }),
    
    get: protectedProcedure
      .use(createPermissionMiddleware('tasks', 'view'))
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const task = await db.getTaskById(input.id);
        if (!task) throw new TRPCError({ code: 'NOT_FOUND', message: 'Task not found' });
        await checkResourceAccess(ctx, task, 'task');
        return task;
      }),
    
    create: protectedProcedure
      .use(createPermissionMiddleware('tasks', 'create'))
      .input(z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        assigneeId: z.number().optional(),
        priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
        status: z.enum(["todo", "in_progress", "review", "done", "cancelled"]).default("todo"),
        dueDate: z.date().optional(),
        relatedModule: z.string().optional(),
        relatedId: z.number().optional(),
        tags: z.string().optional(), // JSON array
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await db.createTask({
          ...input,
          creatorId: ctx.user.id,
        } as any);
        
        const taskId = Number(result.insertId);
        await logAudit({
          userId: ctx.user.id,
          action: 'create',
          entityType: 'task',
          entityId: taskId,
          changes: { title: input.title, assigneeId: input.assigneeId },
        });
        
        // Notification: Notify assignee of new task
        if (input.assigneeId && input.assigneeId !== ctx.user.id) {
          await notificationHelpers.notifyTaskAssigned(taskId, input.assigneeId, ctx.user.name || 'Admin');
        }
        
        return { taskId };
      }),
    
    update: protectedProcedure
      .use(createPermissionMiddleware('tasks', 'edit'))
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        assigneeId: z.number().optional(),
        priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
        status: z.enum(["todo", "in_progress", "review", "done", "cancelled"]).optional(),
        dueDate: z.date().optional(),
        completedAt: z.date().optional(),
        relatedModule: z.string().optional(),
        relatedId: z.number().optional(),
        tags: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...updates } = input;
        
        const task = await db.getTaskById(id);
        if (!task) throw new TRPCError({ code: 'NOT_FOUND', message: 'Task not found' });
        await checkResourceAccess(ctx, task, 'task');
        
        // Auto-set completedAt when status changes to done
        if (updates.status === "done" && !updates.completedAt) {
          updates.completedAt = new Date();
        }
        
        await db.updateTask(id, updates as any);
        
        // Notification: Notify on status change
        if (updates.status && task.assigneeId && task.assigneeId !== ctx.user.id) {
          await notificationHelpers.notifyTaskStatusChanged(id, task.assigneeId, updates.status, ctx.user.name || 'Admin');
        }
        
        // Notification: Notify on reassignment
        if (updates.assigneeId && updates.assigneeId !== task.assigneeId) {
          await notificationHelpers.notifyTaskAssigned(id, updates.assigneeId, ctx.user.name || 'Admin');
        }
        
        return { success: true };
      }),
    
    delete: protectedProcedure
      .use(createPermissionMiddleware('tasks', 'delete'))
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const task = await db.getTaskById(input.id);
        if (!task) throw new TRPCError({ code: 'NOT_FOUND', message: 'Task not found' });
        await checkResourceAccess(ctx, task, 'task');
        
        await logAudit({
          userId: ctx.user.id,
          action: 'delete',
          entityType: 'task',
          entityId: input.id,
          changes: { title: task.title },
        });
        
        await db.deleteTask(input.id);
        return { success: true };
      }),
    
    // Task comments
    comments: router({
      list: protectedProcedure
        .input(z.object({ taskId: z.number() }))
        .query(async ({ input }) => {
          return await db.getTaskComments(input.taskId);
        }),
      
      create: protectedProcedure
        .input(z.object({
          taskId: z.number(),
          comment: z.string().min(1),
        }))
        .mutation(async ({ input, ctx }) => {
          const result = await db.createTaskComment({
            ...input,
            userId: ctx.user.id,
          } as any);
          return { commentId: result.insertId };
        }),
      
      delete: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
          await db.deleteTaskComment(input.id);
          return { success: true };
        }),
    }),
  }),

  // ============================================
  // WIDGET PREFERENCES
  // ============================================
  widgets: router({    list: protectedProcedure
      .query(async ({ ctx }) => {
        return await db.getUserWidgetPreferences(ctx.user.id);
      }),
    
    create: protectedProcedure
      .input(z.object({
        widgetType: z.string(),
        position: z.string(), // JSON string
        settings: z.string().optional(),
        isVisible: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await db.createWidgetPreference({
          ...input,
          userId: ctx.user.id,
        });
        return { widgetId: result.insertId };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        position: z.string().optional(),
        settings: z.string().optional(),
        isVisible: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        await db.updateWidgetPreference(id, updates);
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteWidgetPreference(input.id);
        return { success: true };
      }),
    
    reset: protectedProcedure
      .mutation(async ({ ctx }) => {
        await db.resetUserWidgets(ctx.user.id);
        return { success: true };
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
        return await db.getSettingByKey(input.key);
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
