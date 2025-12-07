import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";

describe("Deliveries Module", () => {
  it("should list all deliveries", async () => {
    const ctx = {
      user: {
        id: 1,
        openId: "test-user",
        name: "Test User",
        email: "test@example.com",
        role: "admin" as const,
      },
    };

    const caller = appRouter.createCaller(ctx);
    const deliveries = await caller.deliveries.list();

    expect(Array.isArray(deliveries)).toBe(true);
  });

  it("should verify deliveries router exists", async () => {
    const ctx = {
      user: {
        id: 1,
        openId: "test-user",
        name: "Test User",
        email: "test@example.com",
        role: "admin" as const,
      },
    };

    const caller = appRouter.createCaller(ctx);
    
    // Verify all procedures exist
    expect(caller.deliveries.list).toBeDefined();
    expect(caller.deliveries.get).toBeDefined();
    expect(caller.deliveries.create).toBeDefined();
    expect(caller.deliveries.update).toBeDefined();
  });

  it("should verify delivery database helpers exist", async () => {
    expect(db.getAllDeliveries).toBeDefined();
    expect(db.getDeliveryById).toBeDefined();
    expect(db.getDeliveryItems).toBeDefined();
    expect(db.createDelivery).toBeDefined();
    expect(db.createDeliveryItem).toBeDefined();
    expect(db.updateDelivery).toBeDefined();
  });
});
