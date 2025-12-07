import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { Router } from 'wouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create comprehensive tRPC mock (must be before vi.mock)
const createMockQuery = (data: any = []) => ({
  useQuery: vi.fn(() => ({
    data,
    isLoading: false,
    isError: false,
    error: null,
  })),
  useMutation: vi.fn(() => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isLoading: false,
  })),
});

const mockTrpc = {
  tenders: {
    list: createMockQuery([]),
    get: createMockQuery(null),
    create: createMockQuery(),
    update: createMockQuery(),
    delete: createMockQuery(),
  },
  budgets: {
    list: createMockQuery([]),
    get: createMockQuery(null),
    create: createMockQuery(),
    update: createMockQuery(),
    delete: createMockQuery(),
  },
  inventory: {
    list: createMockQuery([]),
    get: createMockQuery(null),
    create: createMockQuery(),
    update: createMockQuery(),
    delete: createMockQuery(),
  },
  suppliers: {
    list: createMockQuery([]),
    get: createMockQuery(null),
    create: createMockQuery(),
    update: createMockQuery(),
    delete: createMockQuery(),
  },
  customers: {
    list: createMockQuery([]),
    get: createMockQuery(null),
    create: createMockQuery(),
    update: createMockQuery(),
    delete: createMockQuery(),
  },
  invoices: {
    list: createMockQuery([]),
    get: createMockQuery(null),
    create: createMockQuery(),
    update: createMockQuery(),
    delete: createMockQuery(),
  },
  purchaseOrders: {
    list: createMockQuery([]),
    get: createMockQuery(null),
    create: createMockQuery(),
    update: createMockQuery(),
    delete: createMockQuery(),
  },
  expenses: {
    list: createMockQuery([]),
    get: createMockQuery(null),
    create: createMockQuery(),
    update: createMockQuery(),
    delete: createMockQuery(),
    approve: createMockQuery(),
    stats: createMockQuery({ total: 0, pending: 0, approved: 0, rejected: 0 }),
    byCategory: createMockQuery([]),
    byDepartment: createMockQuery([]),
  },
  deliveries: {
    list: createMockQuery([]),
    get: createMockQuery(null),
    create: createMockQuery(),
    update: createMockQuery(),
    delete: createMockQuery(),
  },
  tasks: {
    list: createMockQuery([]),
    get: createMockQuery(null),
    create: createMockQuery(),
    update: createMockQuery(),
    delete: createMockQuery(),
  },
  users: {
    list: createMockQuery([]),
    get: createMockQuery(null),
    updateRole: createMockQuery(),
    updatePermissions: createMockQuery(),
  },
  auditLogs: {
    list: createMockQuery([]),
  },
  analytics: {
    dashboard: createMockQuery({
      tenders: { total: 0, active: 0, closed: 0, draft: 0 },
      budgets: { total: 0, allocated: 0, spent: 0, remaining: 0 },
      invoices: { total: 0, paid: 0, pending: 0, overdue: 0 },
      inventory: { total: 0, lowStock: 0 },
      purchaseOrders: { total: 0, pending: 0, approved: 0 },
      deliveries: { total: 0, pending: 0, delivered: 0 },
    }),
    expensesByCategory: createMockQuery([]),
    expensesByDepartment: createMockQuery([]),
    budgetVariance: createMockQuery([]),
    trendOverTime: createMockQuery([]),
  },
  auth: {
    me: createMockQuery({ id: 1, name: 'Test User', email: 'test@example.com', role: 'admin' }),
    logout: createMockQuery(),
  },
  useUtils: vi.fn(() => ({
    invalidate: vi.fn(),
  })),
};

// Mock the tRPC module (use factory function)
vi.mock('./lib/trpc', () => {
  const createMockQuery = (data: any = []) => ({
    useQuery: vi.fn(() => ({
      data,
      isLoading: false,
      isError: false,
      error: null,
    })),
    useMutation: vi.fn(() => ({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isLoading: false,
    })),
  });

  return {
    trpc: {
      tenders: {
        list: createMockQuery([]),
        get: createMockQuery(null),
        create: createMockQuery(),
        update: createMockQuery(),
        delete: createMockQuery(),
      },
      budgets: {
        list: createMockQuery([]),
        get: createMockQuery(null),
        create: createMockQuery(),
        update: createMockQuery(),
        delete: createMockQuery(),
      },
      inventory: {
        list: createMockQuery([]),
        get: createMockQuery(null),
        create: createMockQuery(),
        update: createMockQuery(),
        delete: createMockQuery(),
      },
      suppliers: {
        list: createMockQuery([]),
        get: createMockQuery(null),
        create: createMockQuery(),
        update: createMockQuery(),
        delete: createMockQuery(),
      },
      customers: {
        list: createMockQuery([]),
        get: createMockQuery(null),
        create: createMockQuery(),
        update: createMockQuery(),
        delete: createMockQuery(),
      },
      invoices: {
        list: createMockQuery([]),
        get: createMockQuery(null),
        create: createMockQuery(),
        update: createMockQuery(),
        delete: createMockQuery(),
      },
      purchaseOrders: {
        list: createMockQuery([]),
        get: createMockQuery(null),
        create: createMockQuery(),
        update: createMockQuery(),
        delete: createMockQuery(),
      },
      expenses: {
        list: createMockQuery([]),
        get: createMockQuery(null),
        create: createMockQuery(),
        update: createMockQuery(),
        delete: createMockQuery(),
        approve: createMockQuery(),
        stats: createMockQuery({ total: 0, pending: 0, approved: 0, rejected: 0 }),
        byCategory: createMockQuery([]),
        byDepartment: createMockQuery([]),
      },
      deliveries: {
        list: createMockQuery([]),
        get: createMockQuery(null),
        create: createMockQuery(),
        update: createMockQuery(),
        delete: createMockQuery(),
      },
      tasks: {
        list: createMockQuery([]),
        get: createMockQuery(null),
        create: createMockQuery(),
        update: createMockQuery(),
        delete: createMockQuery(),
      },
      users: {
        list: createMockQuery([]),
        get: createMockQuery(null),
        updateRole: createMockQuery(),
        updatePermissions: createMockQuery(),
      },
      auditLogs: {
        list: createMockQuery([]),
      },
      analytics: {
        dashboard: createMockQuery({
          tenders: { total: 0, active: 0, closed: 0, draft: 0 },
          budgets: { total: 0, allocated: 0, spent: 0, remaining: 0 },
          invoices: { total: 0, paid: 0, pending: 0, overdue: 0 },
          inventory: { total: 0, lowStock: 0 },
          purchaseOrders: { total: 0, pending: 0, approved: 0 },
          deliveries: { total: 0, pending: 0, delivered: 0 },
        }),
        expensesByCategory: createMockQuery([]),
        expensesByDepartment: createMockQuery([]),
        budgetVariance: createMockQuery([]),
        trendOverTime: createMockQuery([]),
      },
      auth: {
        me: createMockQuery({ id: 1, name: 'Test User', email: 'test@example.com', role: 'admin' }),
        logout: createMockQuery(),
      },
      useUtils: vi.fn(() => ({
        invalidate: vi.fn(),
      })),
    },
  };
});

// Mock useAuth hook
vi.mock('./hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 1, name: 'Test User', email: 'test@example.com', role: 'admin' },
    isLoading: false,
  }),
  getLoginUrl: () => '/api/oauth/login',
}));

// Import all page components (after mocks)
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Tenders from './pages/Tenders';
import Budgets from './pages/Budgets';
import Inventory from './pages/Inventory';
import Suppliers from './pages/Suppliers';
import Customers from './pages/Customers';
import Invoices from './pages/Invoices';
import PurchaseOrders from './pages/PurchaseOrders';
import Expenses from './pages/Expenses';
import Deliveries from './pages/Deliveries';
import Tasks from './pages/Tasks';
import Users from './pages/Users';
import AuditLogs from './pages/AuditLogs';
import ExpenseAnalytics from './pages/ExpenseAnalytics';

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        {children}
      </Router>
    </QueryClientProvider>
  );
};

describe('Frontend Comprehensive Testing', () => {
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. HOME PAGE', () => {
    it('should render home page without crashing', () => {
      const { container } = render(
        <TestWrapper>
          <Home />
        </TestWrapper>
      );
      expect(container).toBeTruthy();
    });
  });

  describe('2. DASHBOARD PAGE', () => {
    it('should render dashboard page without crashing', () => {
      const { container } = render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );
      expect(container).toBeTruthy();
    });

    it('should call analytics dashboard query', () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );
      expect(mockTrpc.analytics.dashboard.useQuery).toHaveBeenCalled();
    });
  });

  describe('3. TENDERS MODULE', () => {
    it('should render tenders list page', () => {
      const { container } = render(
        <TestWrapper>
          <Tenders />
        </TestWrapper>
      );
      expect(container).toBeTruthy();
    });

    it('should call tenders list query', () => {
      render(
        <TestWrapper>
          <Tenders />
        </TestWrapper>
      );
      expect(mockTrpc.tenders.list.useQuery).toHaveBeenCalled();
    });
  });

  describe('4. BUDGETS MODULE', () => {
    it('should render budgets list page', () => {
      const { container } = render(
        <TestWrapper>
          <Budgets />
        </TestWrapper>
      );
      expect(container).toBeTruthy();
    });

    it('should call budgets list query', () => {
      render(
        <TestWrapper>
          <Budgets />
        </TestWrapper>
      );
      expect(mockTrpc.budgets.list.useQuery).toHaveBeenCalled();
    });
  });

  describe('5. INVENTORY MODULE', () => {
    it('should render inventory list page', () => {
      const { container } = render(
        <TestWrapper>
          <Inventory />
        </TestWrapper>
      );
      expect(container).toBeTruthy();
    });

    it('should call inventory list query', () => {
      render(
        <TestWrapper>
          <Inventory />
        </TestWrapper>
      );
      expect(mockTrpc.inventory.list.useQuery).toHaveBeenCalled();
    });
  });

  describe('6. SUPPLIERS MODULE', () => {
    it('should render suppliers list page', () => {
      const { container } = render(
        <TestWrapper>
          <Suppliers />
        </TestWrapper>
      );
      expect(container).toBeTruthy();
    });

    it('should call suppliers list query', () => {
      render(
        <TestWrapper>
          <Suppliers />
        </TestWrapper>
      );
      expect(mockTrpc.suppliers.list.useQuery).toHaveBeenCalled();
    });
  });

  describe('7. CUSTOMERS MODULE', () => {
    it('should render customers list page', () => {
      const { container } = render(
        <TestWrapper>
          <Customers />
        </TestWrapper>
      );
      expect(container).toBeTruthy();
    });

    it('should call customers list query', () => {
      render(
        <TestWrapper>
          <Customers />
        </TestWrapper>
      );
      expect(mockTrpc.customers.list.useQuery).toHaveBeenCalled();
    });
  });

  describe('8. INVOICES MODULE', () => {
    it('should render invoices list page', () => {
      const { container } = render(
        <TestWrapper>
          <Invoices />
        </TestWrapper>
      );
      expect(container).toBeTruthy();
    });

    it('should call invoices list query', () => {
      render(
        <TestWrapper>
          <Invoices />
        </TestWrapper>
      );
      expect(mockTrpc.invoices.list.useQuery).toHaveBeenCalled();
    });
  });

  describe('9. PURCHASE ORDERS MODULE', () => {
    it('should render purchase orders list page', () => {
      const { container } = render(
        <TestWrapper>
          <PurchaseOrders />
        </TestWrapper>
      );
      expect(container).toBeTruthy();
    });

    it('should call purchase orders list query', () => {
      render(
        <TestWrapper>
          <PurchaseOrders />
        </TestWrapper>
      );
      expect(mockTrpc.purchaseOrders.list.useQuery).toHaveBeenCalled();
    });
  });

  describe('10. EXPENSES MODULE', () => {
    it('should render expenses list page', () => {
      const { container } = render(
        <TestWrapper>
          <Expenses />
        </TestWrapper>
      );
      expect(container).toBeTruthy();
    });

    it('should call expenses list and stats queries', () => {
      render(
        <TestWrapper>
          <Expenses />
        </TestWrapper>
      );
      expect(mockTrpc.expenses.list.useQuery).toHaveBeenCalled();
      expect(mockTrpc.expenses.stats.useQuery).toHaveBeenCalled();
    });
  });

  describe('11. DELIVERIES MODULE', () => {
    it('should render deliveries list page', () => {
      const { container } = render(
        <TestWrapper>
          <Deliveries />
        </TestWrapper>
      );
      expect(container).toBeTruthy();
    });

    it('should call deliveries list query', () => {
      render(
        <TestWrapper>
          <Deliveries />
        </TestWrapper>
      );
      expect(mockTrpc.deliveries.list.useQuery).toHaveBeenCalled();
    });
  });

  describe('12. TASKS MODULE', () => {
    it('should render tasks list page', () => {
      const { container } = render(
        <TestWrapper>
          <Tasks />
        </TestWrapper>
      );
      expect(container).toBeTruthy();
    });

    it('should call tasks list query', () => {
      render(
        <TestWrapper>
          <Tasks />
        </TestWrapper>
      );
      expect(mockTrpc.tasks.list.useQuery).toHaveBeenCalled();
    });
  });

  describe('13. USERS MODULE', () => {
    it('should render users list page', () => {
      const { container } = render(
        <TestWrapper>
          <Users />
        </TestWrapper>
      );
      expect(container).toBeTruthy();
    });

    it('should call users list query', () => {
      render(
        <TestWrapper>
          <Users />
        </TestWrapper>
      );
      expect(mockTrpc.users.list.useQuery).toHaveBeenCalled();
    });
  });

  describe('14. AUDIT LOGS MODULE', () => {
    it('should render audit logs page', () => {
      const { container } = render(
        <TestWrapper>
          <AuditLogs />
        </TestWrapper>
      );
      expect(container).toBeTruthy();
    });

    it('should call audit logs list query', () => {
      render(
        <TestWrapper>
          <AuditLogs />
        </TestWrapper>
      );
      expect(mockTrpc.auditLogs.list.useQuery).toHaveBeenCalled();
    });
  });

  describe('15. EXPENSE ANALYTICS MODULE', () => {
    it('should render expense analytics page', () => {
      const { container } = render(
        <TestWrapper>
          <ExpenseAnalytics />
        </TestWrapper>
      );
      expect(container).toBeTruthy();
    });

    it('should call expense analytics queries', () => {
      render(
        <TestWrapper>
          <ExpenseAnalytics />
        </TestWrapper>
      );
      expect(mockTrpc.expenses.byCategory.useQuery).toHaveBeenCalled();
      expect(mockTrpc.expenses.byDepartment.useQuery).toHaveBeenCalled();
    });
  });

  describe('MODULE RELATIONSHIPS', () => {
    it('should have all page components defined', () => {
      expect(Home).toBeDefined();
      expect(Dashboard).toBeDefined();
      expect(Tenders).toBeDefined();
      expect(Budgets).toBeDefined();
      expect(Inventory).toBeDefined();
      expect(Suppliers).toBeDefined();
      expect(Customers).toBeDefined();
      expect(Invoices).toBeDefined();
      expect(PurchaseOrders).toBeDefined();
      expect(Expenses).toBeDefined();
      expect(Deliveries).toBeDefined();
      expect(Tasks).toBeDefined();
      expect(Users).toBeDefined();
      expect(AuditLogs).toBeDefined();
      expect(ExpenseAnalytics).toBeDefined();
    });

    it('should have tRPC client properly mocked', () => {
      expect(mockTrpc.tenders).toBeDefined();
      expect(mockTrpc.budgets).toBeDefined();
      expect(mockTrpc.expenses).toBeDefined();
      expect(mockTrpc.analytics).toBeDefined();
      expect(mockTrpc.auth).toBeDefined();
    });
  });
});
