/**
 * Customers Router
 *
 * Handles customer CRUD operations with pagination support.
 * Includes customer communications tracking.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, protectedMutationProcedure } from "../_core/trpc";
import * as db from "../db";
import { customerSchemas } from "../_core/validationSchemas";
import * as utils from "../_core/utils";
import {
  paginationInput,
  createPaginatedResponse,
  getPaginationOffsets,
} from "../_core/pagination";

// ============================================
// ROUTER
// ============================================

export const customersRouter = router({
  /**
   * List all customers with optional pagination
   */
  list: protectedProcedure
    .input(paginationInput.optional())
    .query(async ({ input }) => {
      const allCustomers = await db.getAllCustomers();

      // If no pagination requested, return all (backwards compatible)
      if (!input) {
        return allCustomers;
      }

      const { offset, limit } = getPaginationOffsets(input);
      const paginatedItems = allCustomers.slice(offset, offset + limit);

      return createPaginatedResponse(
        paginatedItems,
        input.page,
        limit,
        allCustomers.length
      );
    }),

  /**
   * Get single customer by ID
   */
  get: protectedProcedure
    .input(customerSchemas.get)
    .query(async ({ input }) => {
      const customer = await db.getCustomerById(input.id);

      if (!customer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Customer not found",
        });
      }

      return customer;
    }),

  /**
   * Create new customer
   */
  create: protectedMutationProcedure
    .input(customerSchemas.create)
    .mutation(async ({ input, ctx }) => {
      // Generate unique customer code
      const code = utils.generateCustomerCode();

      const result = await db.createCustomer({
        ...input,
        code,
        createdBy: ctx.user.id,
      } as any);

      const customerId = Number(result.insertId);

      return {
        success: true,
        code,
        customerId,
      };
    }),

  /**
   * Update existing customer
   */
  update: protectedMutationProcedure
    .input(customerSchemas.update)
    .mutation(async ({ input }) => {
      const { id, ...data } = input;

      // Verify customer exists
      const customer = await db.getCustomerById(id);
      if (!customer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Customer not found",
        });
      }

      await db.updateCustomer(id, data);

      return { success: true };
    }),

  /**
   * Get customer communications history
   */
  getCommunications: protectedProcedure
    .input(customerSchemas.getCommunications)
    .query(async ({ input }) => {
      return await db.getCustomerCommunications(input.customerId);
    }),

  /**
   * Add communication record to customer
   */
  addCommunication: protectedMutationProcedure
    .input(customerSchemas.addCommunication)
    .mutation(async ({ input, ctx }) => {
      await db.createCustomerCommunication({
        ...input,
        contactedBy: ctx.user.id,
      } as any);

      return { success: true };
    }),
});
