import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";

/**
 * Tokenize text for matching
 */
function tokenize(text: string | null | undefined): Set<string> {
  if (!text) return new Set();
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean)
  );
}

/**
 * Score supplier products against tender items
 */
function scoreSupplierAgainstTender(
  tenderItems: Array<{ description?: string | null; specifications?: string | null }>,
  supplierProducts: Array<{
    name?: string | null;
    description?: string | null;
    specifications?: string | null;
  }>
) {
  let total = 0;
  let max = tenderItems.length * 100;

  for (const item of tenderItems) {
    const itemTokens = new Set([
      ...tokenize(item.description),
      ...tokenize(item.specifications),
    ]);
    let best = 0;
    for (const product of supplierProducts) {
      const productTokens = new Set([
        ...tokenize(product.name),
        ...tokenize(product.description),
        ...tokenize((product as any).specifications),
      ]);
      const intersection = [...itemTokens].filter(t => productTokens.has(t));
      const score =
        itemTokens.size === 0
          ? 0
          : Math.round((intersection.length / itemTokens.size) * 100);
      if (score > best) best = score;
    }
    total += best;
  }

  return {
    total,
    max,
    percent: max === 0 ? 0 : Math.round((total / max) * 100),
  };
}

/**
 * Tender Match Router
 * Handles matching suppliers and products to tender requirements
 */
export const tenderMatchRouter = router({
  byTender: protectedProcedure
    .input(z.object({ tenderId: z.number() }))
    .query(async ({ input }) => {
      const tender = await db.getTenderById(input.tenderId);
      if (!tender)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Tender not found",
        });

      const items = await db.getTenderItems(input.tenderId);
      const suppliers = await db.getAllSuppliers();
      const products = await db.getAllProducts();

      const supplierProducts = suppliers
        .map(supplier => {
          const prods = products.filter(
            p => p.manufacturerId === supplier.id
          );
          const score = scoreSupplierAgainstTender(items, prods);
          return { supplier, products: prods, score };
        })
        .sort((a, b) => b.score.total - a.score.total);

      return supplierProducts;
    }),
});
