import { describe, it, expect } from "vitest";
import * as dashboardAnalytics from "./dashboardAnalytics";

describe("Dashboard Analytics", () => {
  it("should get tender analytics", async () => {
    const result = await dashboardAnalytics.getTenderAnalytics();
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it("should get budget analytics", async () => {
    const result = await dashboardAnalytics.getBudgetAnalytics();
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it("should get invoice analytics", async () => {
    const result = await dashboardAnalytics.getInvoiceAnalytics();
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it("should get purchase order analytics", async () => {
    const result = await dashboardAnalytics.getPurchaseOrderAnalytics();
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it("should get inventory analytics", async () => {
    const result = await dashboardAnalytics.getInventoryAnalytics();
    expect(result).toBeDefined();
    expect(result).toHaveProperty('totalItems');
    expect(result).toHaveProperty('totalQuantity');
    expect(result).toHaveProperty('lowStockCount');
    expect(result).toHaveProperty('outOfStockCount');
  });

  it("should get delivery analytics", async () => {
    const result = await dashboardAnalytics.getDeliveryAnalytics();
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it("should get recent activity", async () => {
    const result = await dashboardAnalytics.getRecentActivity(10);
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeLessThanOrEqual(10);
  });

  it("should filter tender analytics by date range", async () => {
    const startDate = new Date('2025-01-01');
    const endDate = new Date('2025-12-31');
    const result = await dashboardAnalytics.getTenderAnalytics(startDate, endDate);
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it("should filter budget analytics by fiscal year", async () => {
    const result = await dashboardAnalytics.getBudgetAnalytics(2025);
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });
});
