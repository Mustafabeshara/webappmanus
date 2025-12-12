import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";

export const purchaseOrdersRouter = router({
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
});
