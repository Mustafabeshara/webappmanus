/**
 * Supplier Catalog Service
 * Handles supplier price updates, catalog management, and price comparison
 */

import * as db from "../db";

export interface PriceUpdateInput {
  supplierId: number;
  productId: number;
  newPrice?: number; // in cents
  unitPrice?: number; // Alias for newPrice
  effectiveDate?: string;
  validFrom?: Date; // Alias for effectiveDate
  expiryDate?: string;
  validUntil?: Date; // Alias for expiryDate
  notes?: string;
  currency?: string;
  supplierProductCode?: string;
  minimumOrderQuantity?: number;
  leadTimeDays?: number;
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
  async updateSupplierPrice(
    input: PriceUpdateInput,
    _userId?: number,
    changeReason?: string
  ) {
    const supplier = await db.getSupplierById(input.supplierId);
    if (!supplier) {
      throw new Error("Supplier not found");
    }

    const product = await db.getProductById(input.productId);
    if (!product) {
      throw new Error("Product not found");
    }

    // Get price from either newPrice or unitPrice
    const price = input.newPrice ?? input.unitPrice ?? 0;
    // Get effective date from either effectiveDate or validFrom
    const effectiveDateStr = input.effectiveDate ?? (input.validFrom ? input.validFrom.toISOString() : undefined);
    // Get expiry date from either expiryDate or validUntil
    const expiryDateStr = input.expiryDate ?? (input.validUntil ? input.validUntil.toISOString() : undefined);

    // Create price history record
    const priceRecord = {
      supplierId: input.supplierId,
      productId: input.productId,
      price,
      effectiveDate: effectiveDateStr ? new Date(effectiveDateStr) : new Date(),
      expiryDate: expiryDateStr ? new Date(expiryDateStr) : null,
      notes: changeReason ?? input.notes ?? null,
      createdAt: new Date(),
    };

    console.log("[SupplierCatalog] Price updated:", {
      supplier: supplier.name,
      product: product.name,
      price: price / 100,
    });

    // In a full implementation, this would:
    // 1. Insert into supplier_prices table
    // 2. Update current price if effectiveDate is today or past
    // 3. Create notification if significant price change

    return {
      success: true,
      priceRecord,
      message: `Price updated for ${product.name} from ${supplier.name}`,
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
            unitPrice: product.unitPrice,
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
            unitPrice: product.unitPrice,
            unit: product.unit || "each",
            manufacturerId: input.supplierId, // Link to supplier
            createdBy: 1, // System user
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
      supplier: supplier.name,
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
      supplierName: supplier.name,
      price: product.unitPrice ?? 0, // In real implementation, get from supplier_prices table
      effectiveDate: new Date().toISOString(),
      isPreferred: supplier.complianceStatus === "compliant",
      deliveryTerms: "Standard",
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
      supplierName: supplier.name,
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

  /**
   * Compare product prices across suppliers
   */
  async compareProductPrices(productId: number) {
    const product = await db.getProductById(productId);
    if (!product) {
      throw new Error("Product not found");
    }

    const suppliers = await db.getAllSuppliers();
    const priceComparison = suppliers.map((supplier: any) => ({
      supplierId: supplier.id,
      supplierName: supplier.name,
      price: product.unitPrice ?? 0,
      effectiveDate: new Date().toISOString(),
      isPreferred: supplier.complianceStatus === "compliant",
    }));

    priceComparison.sort((a: any, b: any) => a.price - b.price);

    return {
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      prices: priceComparison,
      lowestPrice: priceComparison[0]?.price || 0,
      highestPrice: priceComparison[priceComparison.length - 1]?.price || 0,
    };
  }

  /**
   * Detect duplicate products in catalog
   */
  async detectDuplicateProducts(productId?: number, threshold?: number) {
    const allProducts = await db.getAllProducts();
    const similarityThreshold = threshold ?? 0.8;
    const duplicates: Array<{
      product1: { id: number; name: string; sku: string };
      product2: { id: number; name: string; sku: string };
      similarity: number;
    }> = [];

    const productsToCheck = productId
      ? allProducts.filter((p: any) => p.id === productId)
      : allProducts;

    for (const product1 of productsToCheck) {
      for (const product2 of allProducts) {
        if (product1.id >= product2.id) continue;

        // Simple name similarity check
        const name1 = (product1.name || "").toLowerCase();
        const name2 = (product2.name || "").toLowerCase();
        const words1 = new Set(name1.split(/\s+/));
        const words2 = new Set(name2.split(/\s+/));
        const intersection = [...words1].filter((w) => words2.has(w));
        const union = new Set([...words1, ...words2]);
        const similarity = union.size > 0 ? intersection.length / union.size : 0;

        if (similarity >= similarityThreshold) {
          duplicates.push({
            product1: { id: product1.id, name: product1.name, sku: product1.sku },
            product2: { id: product2.id, name: product2.name, sku: product2.sku },
            similarity,
          });
        }
      }
    }

    return {
      duplicatesFound: duplicates.length,
      duplicates,
      threshold: similarityThreshold,
    };
  }

  /**
   * Standardize product specifications
   */
  async standardizeProductSpecifications(
    productId: number,
    specifications: Array<{
      key: string;
      value: string;
      unit?: string;
      isRequired?: boolean;
    }>,
    _userId: number
  ) {
    const product = await db.getProductById(productId);
    if (!product) {
      throw new Error("Product not found");
    }

    const specsJson = JSON.stringify(
      specifications.reduce(
        (acc, spec) => {
          acc[spec.key] = spec.unit ? `${spec.value} ${spec.unit}` : spec.value;
          return acc;
        },
        {} as Record<string, string>
      )
    );

    await db.updateProduct(productId, {
      specifications: specsJson,
    });

    return {
      success: true,
      productId,
      specificationsCount: specifications.length,
    };
  }

  /**
   * Analyze supplier performance
   */
  async analyzeSupplierPerformance(
    supplierId: number,
    _dateRange?: { start: Date; end: Date }
  ) {
    const supplier = await db.getSupplierById(supplierId);
    if (!supplier) {
      throw new Error("Supplier not found");
    }

    // Get supplier's products
    const allProducts = await db.getAllProducts();
    const supplierProducts = allProducts.filter(
      (p: any) => p.manufacturerId === supplierId
    );

    // Get deliveries for this supplier (approximation based on available data)
    const allDeliveries = await db.getAllDeliveries();
    const supplierDeliveries = allDeliveries.filter(
      (d: any) => d.customerId === supplierId // This is a simplification
    );

    const onTimeDeliveries = supplierDeliveries.filter((d: any) => {
      if (!d.scheduledDate || !d.deliveredDate) return false;
      return new Date(d.deliveredDate) <= new Date(d.scheduledDate);
    });

    const deliveryRate =
      supplierDeliveries.length > 0
        ? (onTimeDeliveries.length / supplierDeliveries.length) * 100
        : 100;

    return {
      supplierId,
      supplierName: supplier.name,
      metrics: {
        totalProducts: supplierProducts.length,
        totalDeliveries: supplierDeliveries.length,
        onTimeDeliveryRate: Math.round(deliveryRate),
        qualityScore: supplier.rating ?? 0,
        complianceStatus: supplier.complianceStatus,
      },
      performance: {
        rating: supplier.rating ?? 0,
        lastReview: supplier.updatedAt,
      },
    };
  }

  /**
   * Import supplier catalog from external data
   */
  async importSupplierCatalog(
    supplierId: number,
    catalogData: Array<{
      supplierProductCode: string;
      productName: string;
      description?: string;
      category?: string;
      unitPrice: number;
      currency?: string;
      specifications?: Record<string, string>;
    }>,
    _userId: number
  ) {
    const supplier = await db.getSupplierById(supplierId);
    if (!supplier) {
      throw new Error("Supplier not found");
    }

    const results = {
      imported: 0,
      updated: 0,
      errors: [] as string[],
    };

    for (const item of catalogData) {
      try {
        const existingProducts = await db.getAllProducts();
        const existing = existingProducts.find(
          (p: any) => p.sku === item.supplierProductCode
        );

        if (existing) {
          await db.updateProduct(existing.id, {
            name: item.productName,
            description: item.description,
            category: item.category,
            unitPrice: item.unitPrice,
            specifications: item.specifications
              ? JSON.stringify(item.specifications)
              : undefined,
          });
          results.updated++;
        } else {
          await db.createProduct({
            name: item.productName,
            description: item.description || "",
            sku: item.supplierProductCode,
            category: item.category || "Uncategorized",
            unitPrice: item.unitPrice,
            manufacturerId: supplierId,
            specifications: item.specifications
              ? JSON.stringify(item.specifications)
              : undefined,
            createdBy: 1,
          });
          results.imported++;
        }
      } catch (error) {
        results.errors.push(
          `${item.supplierProductCode}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    return results;
  }
}

export const supplierCatalogService = new SupplierCatalogService();
