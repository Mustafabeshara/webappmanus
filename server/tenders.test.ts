import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createTestContext(isAdmin = false): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: isAdmin ? "admin" : "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("Tender Management", () => {
  it("should create a new tender with auto-generated reference number", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.tenders.create({
      title: "Medical Equipment Tender",
      description: "Procurement of medical equipment for hospital",
      estimatedValue: 100000, // $1000.00 in cents
      items: [
        {
          description: "X-Ray Machine",
          quantity: 2,
          unit: "piece",
          estimatedPrice: 50000,
        },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.referenceNumber).toMatch(/^TND-\d{6}-[A-Z0-9]{6}$/);
    expect(result.tenderId).toBeGreaterThan(0);
  });

  it("should list all tenders", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    // Create a tender first
    await caller.tenders.create({
      title: "Test Tender",
      description: "Test description",
    });

    const tenders = await caller.tenders.list();
    expect(Array.isArray(tenders)).toBe(true);
    expect(tenders.length).toBeGreaterThan(0);
  });

  it("should update tender status", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const created = await caller.tenders.create({
      title: "Status Test Tender",
      description: "Testing status updates",
    });

    const updateResult = await caller.tenders.update({
      id: created.tenderId,
      status: "open",
    });

    expect(updateResult.success).toBe(true);

    const tender = await caller.tenders.get({ id: created.tenderId });
    expect(tender.tender?.status).toBe("open");
  });
});

describe("Tender Templates", () => {
  it("should create a tender template", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.tenderTemplates.create({
      name: "Standard Medical Equipment Template",
      description: "Template for medical equipment procurement",
      defaultRequirements: "ISO certification required",
      defaultTerms: "Payment within 30 days",
    });

    expect(result.success).toBe(true);
    expect(result.templateId).toBeGreaterThan(0);
  });

  it("should list all templates", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const templates = await caller.tenderTemplates.list();
    expect(Array.isArray(templates)).toBe(true);
  });

  it("should create tender from template", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    // Create template first
    const template = await caller.tenderTemplates.create({
      name: "Test Template",
      description: "For testing",
      defaultRequirements: "Test requirements",
      defaultTerms: "Test terms",
    });

    // Create tender from template
    const result = await caller.tenders.createFromTemplate({
      templateId: template.templateId,
      title: "Tender from Template",
    });

    expect(result.success).toBe(true);
    expect(result.referenceNumber).toMatch(/^TND-\d{6}-[A-Z0-9]{6}$/);

    // Verify tender has template data
    const tender = await caller.tenders.get({ id: result.tenderId });
    expect(tender.tender?.requirements).toBe("Test requirements");
    expect(tender.tender?.terms).toBe("Test terms");
  });

  it("should delete a template", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const template = await caller.tenderTemplates.create({
      name: "Template to Delete",
      description: "Will be deleted",
    });

    const deleteResult = await caller.tenderTemplates.delete({
      id: template.templateId,
    });

    expect(deleteResult.success).toBe(true);
  });
});

describe("Tender Participants", () => {
  it("should add participant to tender", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    // Create tender
    const tender = await caller.tenders.create({
      title: "Participant Test Tender",
      description: "Testing participants",
    });

    // Create supplier
    const supplier = await caller.suppliers.create({
      name: "Test Supplier",
      email: "supplier@example.com",
    });

    // Add participant
    const result = await caller.tenders.addParticipant({
      tenderId: tender.tenderId,
      supplierId: 1, // Assuming supplier ID
      totalBidAmount: 95000,
    });

    expect(result.success).toBe(true);
    expect(result.participantId).toBeGreaterThan(0);
  });
});

describe("Analytics Dashboard", () => {
  it("should return dashboard analytics", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const analytics = await caller.analytics.dashboard();

    expect(analytics).toHaveProperty("tenders");
    expect(analytics).toHaveProperty("budgets");
    expect(analytics).toHaveProperty("invoices");
    expect(analytics).toHaveProperty("expenses");
    expect(analytics).toHaveProperty("inventory");
    expect(analytics).toHaveProperty("anomalies");

    expect(typeof analytics.tenders.total).toBe("number");
    expect(typeof analytics.tenders.open).toBe("number");
    expect(typeof analytics.tenders.awarded).toBe("number");
  });
});
