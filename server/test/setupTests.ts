import { vi, beforeEach } from "vitest";

// Set up test environment variables BEFORE any imports
process.env.JWT_SECRET = "test-jwt-secret-must-be-at-least-32-characters-long";
process.env.ADMIN_PASSWORD = "test-admin-password";
process.env.ALLOW_INSECURE_DEV = "true";

// In-memory storage for mocked data
let mockTenders: any[] = [];
let mockTenderTemplates: any[] = [];
let mockTenderItems: any[] = [];
let mockSuppliers: any[] = [];
let mockTenderParticipants: any[] = [];
let mockBudgets: any[] = [];
let mockInvoices: any[] = [];
let mockExpenses: any[] = [];
let mockInventory: any[] = [];
let mockAnomalies: any[] = [];
let mockUserPermissions: any[] = [];

let nextTenderId = 1;
let nextTemplateId = 1;
let nextSupplierId = 1;
let nextParticipantId = 1;

// Reset all mock data before each test
function resetMockData() {
  mockTenders = [];
  mockTenderTemplates = [];
  mockTenderItems = [];
  mockSuppliers = [];
  mockTenderParticipants = [];
  mockBudgets = [];
  mockInvoices = [];
  mockExpenses = [];
  mockInventory = [];
  mockAnomalies = [];
  mockUserPermissions = [];
  nextTenderId = 1;
  nextTemplateId = 1;
  nextSupplierId = 1;
  nextParticipantId = 1;
}

// Mock the database module
vi.mock("../db", () => ({
  // Tender functions
  getAllTenders: vi.fn(() => Promise.resolve(mockTenders)),
  getTenderById: vi.fn((id: number) => {
    const tender = mockTenders.find(t => t.id === id);
    return Promise.resolve(tender || null);
  }),
  createTender: vi.fn((tender: any) => {
    const id = nextTenderId++;
    const newTender = { id, ...tender, status: tender.status || "draft", createdAt: new Date(), updatedAt: new Date() };
    mockTenders.push(newTender);
    return Promise.resolve({ insertId: id });
  }),
  updateTender: vi.fn((id: number, data: any) => {
    const index = mockTenders.findIndex(t => t.id === id);
    if (index >= 0) {
      mockTenders[index] = { ...mockTenders[index], ...data, updatedAt: new Date() };
    }
    return Promise.resolve();
  }),
  deleteTender: vi.fn((id: number) => {
    mockTenders = mockTenders.filter(t => t.id !== id);
    return Promise.resolve();
  }),

  // Tender items
  getTenderItems: vi.fn((tenderId: number) =>
    Promise.resolve(mockTenderItems.filter(i => i.tenderId === tenderId))
  ),
  createTenderItem: vi.fn((item: any) => {
    mockTenderItems.push(item);
    return Promise.resolve();
  }),
  createTenderItems: vi.fn((items: any[]) => {
    mockTenderItems.push(...items);
    return Promise.resolve();
  }),

  // Tender templates
  getAllTenderTemplates: vi.fn(() => Promise.resolve(mockTenderTemplates)),
  getTenderTemplateById: vi.fn((id: number) =>
    Promise.resolve(mockTenderTemplates.find(t => t.id === id) || null)
  ),
  createTenderTemplate: vi.fn((template: any) => {
    const id = nextTemplateId++;
    const newTemplate = { id, ...template, createdAt: new Date(), updatedAt: new Date() };
    mockTenderTemplates.push(newTemplate);
    return Promise.resolve({ insertId: id });
  }),
  deleteTenderTemplate: vi.fn((id: number) => {
    mockTenderTemplates = mockTenderTemplates.filter(t => t.id !== id);
    return Promise.resolve();
  }),

  // Template items
  getTemplateItems: vi.fn(() => Promise.resolve([])),

  // Suppliers
  getAllSuppliers: vi.fn(() => Promise.resolve(mockSuppliers)),
  getSupplierById: vi.fn((id: number) => Promise.resolve(mockSuppliers.find(s => s.id === id) || null)),
  createSupplier: vi.fn((supplier: any) => {
    const id = nextSupplierId++;
    const newSupplier = { id, ...supplier, createdAt: new Date(), updatedAt: new Date() };
    mockSuppliers.push(newSupplier);
    return Promise.resolve({ insertId: id });
  }),

  // Tender participants
  getTenderParticipants: vi.fn((tenderId: number) =>
    Promise.resolve(mockTenderParticipants.filter(p => p.tenderId === tenderId))
  ),
  createTenderParticipant: vi.fn((participant: any) => {
    const id = nextParticipantId++;
    const newParticipant = { id, ...participant, createdAt: new Date() };
    mockTenderParticipants.push(newParticipant);
    return Promise.resolve({ insertId: id });
  }),

  // Participant bid items
  getParticipantBidItems: vi.fn(() => Promise.resolve([])),

  // Analytics data
  getAllBudgets: vi.fn(() => Promise.resolve(mockBudgets)),
  getAllInvoices: vi.fn(() => Promise.resolve(mockInvoices)),
  getAllExpenses: vi.fn(() => Promise.resolve(mockExpenses)),
  getAllInventory: vi.fn(() => Promise.resolve(mockInventory)),
  getAllAnomalies: vi.fn(() => Promise.resolve(mockAnomalies)),
  getActiveAnomalies: vi.fn(() => Promise.resolve(mockAnomalies)),
  getLowStockItems: vi.fn(() => Promise.resolve([])),

  // User permissions
  getUserPermissions: vi.fn(() => Promise.resolve(mockUserPermissions)),

  // Database connection check
  getDb: vi.fn(() => Promise.resolve({})),
}));

// Reset mock data before each test
beforeEach(() => {
  resetMockData();
  vi.clearAllMocks();
});
