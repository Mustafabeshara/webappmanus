/**
 * Supplier Catalog Service
 * Handles supplier price updates, catalog management, and price comparison
 */

import * as db from "../db";

export interface PriceUpdateInput {
  supplierId: number;
  productId: number;
  newPrice: number; // in cents
  effectiveDate?: string;
  expiryDate?: string;
  notes?: string;
}

export interface CatalogImportInput {
  supplierId: number;
  products: CatalogProduct[];
  effectiveDate?: string;
  replaceExisting?: boolean;
}

export interface CatalogProduct {
  sku: string;
  name: string;
  description?: string;
  category?: string;
  unitPrice: number; // in cents
  unit?: string;
  specifications?: Record<string, any>;
  minOrderQuantity?: number;
  leadTimeDays?: number;
}

export interface PriceComparisonInput {
  productId: number;
  supplierIds?: number[];
}

class SupplierCatalogService {
  /**
   * Update supplier price for a product
   */
  async updateSupplierPrice(input: PriceUpdateInput) {
    const supplier = await db.getSupplierById(input.supplierId);
    if (!supplier) {
      throw new Error("Supplier not found");
    }

    const product = await db.getProductById(input.productId);
    if (!product) {
      throw new Error("Product not found");
    }

    // Create price history record
    const priceRecord = {
      supplierId: input.supplierId,
      productId: input.productId,
      price: input.newPrice,
      effectiveDate: input.effectiveDate ? new Date(input.effectiveDate) : new Date(),
      expiryDate: input.expiryDate ? new Date(input.expiryDate) : null,
      notes: input.notes || null,
      createdAt: new Date(),
    };

    console.log("[SupplierCatalog] Price updated:", {
      supplier: supplier.companyName,
      product: product.name,
      price: input.newPrice / 100,
    });

    // In a full implementation, this would:
    // 1. Insert into supplier_prices table
    // 2. Update current price if effectiveDate is today or past
    // 3. Create notification if significant price change

    return {
      success: true,
      priceRecord,
      message: `Price updated for ${product.name} from ${supplier.companyName}`,
    };
  }

  /**
   * Import product catalog from supplier
   */
  async importCatalog(input: CatalogImportInput) {
    const supplier = await db.getSupplierById(input.supplierId);
    if (!supplier) {
      throw new Error("Supplier not found");
    }

    const results = {
      imported: 0,
      updated: 0,
      errors: [] as string[],
    };

    for (const product of input.products) {
      try {
        // Check if product with same SKU exists
        const existingProducts = await db.getAllProducts();
        const existing = existingProducts.find(
          (p: any) => p.sku === product.sku
        );

        if (existing) {
          // Update existing product
          await db.updateProduct(existing.id, {
            name: product.name,
            description: product.description || existing.description,
            category: product.category || existing.category,
            price: product.unitPrice,
            unit: product.unit || existing.unit,
          });
          results.updated++;
        } else {
          // Create new product
          await db.createProduct({
            name: product.name,
            description: product.description || "",
            sku: product.sku,
            category: product.category || "Uncategorized",
            price: product.unitPrice,
            unit: product.unit || "each",
            quantity: 0, // Initial stock is 0
            minimumStock: product.minOrderQuantity || 1,
            supplierId: input.supplierId,
          });
          results.imported++;
        }

        // Also update supplier price
        if (existing) {
          await this.updateSupplierPrice({
            supplierId: input.supplierId,
            productId: existing.id,
            newPrice: product.unitPrice,
            effectiveDate: input.effectiveDate,
          });
        }
      } catch (error) {
        results.errors.push(
          `Failed to import ${product.sku}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    console.log("[SupplierCatalog] Catalog imported:", {
      supplier: supplier.companyName,
      imported: results.imported,
      updated: results.updated,
      errors: results.errors.length,
    });

    return results;
  }

  /**
   * Compare prices across suppliers for a product
   */
  async comparePrices(input: PriceComparisonInput) {
    const product = await db.getProductById(input.productId);
    if (!product) {
      throw new Error("Product not found");
    }

    // In a full implementation, this would query the supplier_prices table
    // For now, we'll return a mock comparison based on existing data

    const suppliers = await db.getAllSuppliers();
    const filteredSuppliers = input.supplierIds
      ? suppliers.filter((s: any) => input.supplierIds!.includes(s.id))
      : suppliers;

    const priceComparison = filteredSuppliers.map((supplier: any) => ({
      supplierId: supplier.id,
      supplierName: supplier.companyName,
      price: product.price, // In real implementation, get from supplier_prices table
      effectiveDate: new Date().toISOString(),
      isPreferred: supplier.status === "active",
      deliveryTerms: supplier.paymentTerms || "Standard",
      minimumOrder: 1,
    }));

    // Sort by price
    priceComparison.sort((a: any, b: any) => a.price - b.price);

    return {
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      prices: priceComparison,
      lowestPrice: priceComparison[0]?.price || 0,
      highestPrice: priceComparison[priceComparison.length - 1]?.price || 0,
      priceRange:
        (priceComparison[priceComparison.length - 1]?.price || 0) -
        (priceComparison[0]?.price || 0),
    };
  }

  /**
   * Get catalog summary for a supplier
   */
  async getSupplierCatalogSummary(supplierId: number) {
    const supplier = await db.getSupplierById(supplierId);
    if (!supplier) {
      throw new Error("Supplier not found");
    }

    const allProducts = await db.getAllProducts();
    const supplierProducts = allProducts.filter(
      (p: any) => p.supplierId === supplierId
    );

    // Group by category
    const byCategory: Record<string, number> = {};
    supplierProducts.forEach((p: any) => {
      const category = p.category || "Uncategorized";
      byCategory[category] = (byCategory[category] || 0) + 1;
    });

    // Calculate price statistics
    const prices = supplierProducts.map((p: any) => p.price);
    const avgPrice =
      prices.length > 0
        ? prices.reduce((a: number, b: number) => a + b, 0) / prices.length
        : 0;

    return {
      supplierId,
      supplierName: supplier.companyName,
      totalProducts: supplierProducts.length,
      byCategory,
      averagePrice: Math.round(avgPrice),
      lastUpdated: supplier.updatedAt || supplier.createdAt,
    };
  }

  /**
   * Bulk update prices from price list
   */
  async bulkUpdatePrices(
    supplierId: number,
    priceUpdates: Array<{ sku: string; newPrice: number }>
  ) {
    const results = {
      updated: 0,
      notFound: [] as string[],
      errors: [] as string[],
    };

    const allProducts = await db.getAllProducts();

    for (const update of priceUpdates) {
      const product = allProducts.find((p: any) => p.sku === update.sku);
      if (!product) {
        results.notFound.push(update.sku);
        continue;
      }

      try {
        await this.updateSupplierPrice({
          supplierId,
          productId: product.id,
          newPrice: update.newPrice,
        });
        results.updated++;
      } catch (error) {
        results.errors.push(
          `${update.sku}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    return results;
  }
}

export const supplierCatalogService = new SupplierCatalogService();
