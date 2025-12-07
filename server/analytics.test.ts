import { describe, it, expect, beforeAll } from 'vitest';
import { appRouter } from './routers';
import { db } from './db';
import type { TrpcContext } from './_core/context';

describe('Expense Analytics', () => {
  const userId = 1;
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeAll(async () => {
    const timestamp = Date.now();
    
    const ctx: TrpcContext = {
      user: {
        id: userId,
        openId: `test-analytics-${timestamp}`,
        email: `analytics-${timestamp}@test.com`,
        name: 'Analytics Test User',
        loginMethod: 'manus',
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      req: {} as any,
      res: {} as any,
    };
    
    caller = appRouter.createCaller(ctx);
  });

  it('should return analytics by category', async () => {
    const result = await caller.expenses.analyticsByCategory({
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
    });

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return analytics by department', async () => {
    const result = await caller.expenses.analyticsByDepartment({
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
    });

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return budget variance analysis', async () => {
    const result = await caller.expenses.budgetVariance({
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
    });

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    // Each budget should have required fields
    if (result.length > 0) {
      expect(result[0]).toHaveProperty('budgetId');
      expect(result[0]).toHaveProperty('allocated');
      expect(result[0]).toHaveProperty('spent');
      expect(result[0]).toHaveProperty('remaining');
      expect(result[0]).toHaveProperty('utilizationPercent');
      expect(result[0]).toHaveProperty('status');
    }
  });

  it('should return expense trends over time', async () => {
    const result = await caller.expenses.trendOverTime({
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      groupBy: 'month',
    });

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    // Each trend should have required fields
    if (result.length > 0) {
      expect(result[0]).toHaveProperty('period');
      expect(result[0]).toHaveProperty('totalAmount');
      expect(result[0]).toHaveProperty('expenseCount');
      expect(result[0]).toHaveProperty('averageAmount');
    }
  });

  it('should support different groupBy options for trends', async () => {
    const resultDay = await caller.expenses.trendOverTime({
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      groupBy: 'day',
    });
    expect(resultDay).toBeDefined();
    expect(Array.isArray(resultDay)).toBe(true);

    const resultWeek = await caller.expenses.trendOverTime({
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      groupBy: 'week',
    });
    expect(resultWeek).toBeDefined();
    expect(Array.isArray(resultWeek)).toBe(true);
  });
});
