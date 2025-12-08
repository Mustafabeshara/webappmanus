/**
 * AI Budget Forecasting Service
 * Provides budget forecasting, variance analysis, and spending predictions
 */

import { complete } from './service';
import { isAIConfigured } from './config';

export interface BudgetData {
  id: number;
  name: string;
  fiscalYear: number;
  allocatedAmount: number;
  spentAmount: number;
  departmentId?: number | null;
  status: string;
}

export interface ExpenseData {
  id: number;
  amount: number;
  date: Date;
  category?: string | null;
  vendorName?: string | null;
}

export interface ForecastMetric {
  current: number;
  predicted: number;
  confidence: number;
  trend: 'up' | 'down' | 'stable';
  percentChange: number;
}

export interface BudgetVariance {
  budgetId: number;
  budgetName: string;
  allocated: number;
  spent: number;
  variance: number;
  variancePercent: number;
  status: 'under' | 'over' | 'on-track';
  prediction: 'will-exceed' | 'will-underspend' | 'on-target';
  riskLevel: 'low' | 'medium' | 'high';
}

export interface ForecastResult {
  metrics: {
    totalBudget: ForecastMetric;
    totalSpending: ForecastMetric;
    remainingBudget: ForecastMetric;
    burnRate: ForecastMetric;
  };
  monthlyProjections: Array<{
    month: string;
    projectedSpending: number;
    projectedRemaining: number;
    cumulative: number;
  }>;
  budgetVariances: BudgetVariance[];
  insights: Array<{
    type: 'trend' | 'risk' | 'opportunity' | 'forecast';
    title: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
    actionable: boolean;
    suggestedAction?: string;
  }>;
  summary: {
    healthScore: number;
    overallTrend: 'positive' | 'negative' | 'neutral';
    primaryRisk: string;
    primaryOpportunity: string;
    timeframeDays: number;
  };
}

export async function generateBudgetForecast(
  budgets: BudgetData[],
  expenses: ExpenseData[],
  timeframeDays: number = 90
): Promise<ForecastResult> {
  // Calculate current metrics
  const totalAllocated = budgets.reduce((sum, b) => sum + b.allocatedAmount, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spentAmount, 0);
  const totalRemaining = totalAllocated - totalSpent;
  const consumptionRate = totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;

  // Calculate spending trends from recent expenses
  const recentExpenses = expenses.slice(0, 50);
  const avgDailySpend = recentExpenses.length > 0
    ? recentExpenses.reduce((sum, e) => sum + e.amount, 0) / Math.max(30, recentExpenses.length)
    : totalSpent / 365;

  // Monthly breakdown of spending
  const monthlySpending = new Map<string, number>();
  for (const expense of expenses) {
    const monthKey = `${expense.date.getFullYear()}-${String(expense.date.getMonth() + 1).padStart(2, '0')}`;
    monthlySpending.set(monthKey, (monthlySpending.get(monthKey) || 0) + expense.amount);
  }

  // Try AI-powered forecasting
  if (isAIConfigured() && budgets.length > 0) {
    try {
      const prompt = `You are a financial forecasting AI. Analyze this budget data and provide forecasts.

**Current Budget State:**
- Total Allocated: $${(totalAllocated / 100).toFixed(2)}
- Total Spent: $${(totalSpent / 100).toFixed(2)} (${consumptionRate.toFixed(1)}%)
- Remaining: $${(totalRemaining / 100).toFixed(2)}
- Average Daily Spend: $${(avgDailySpend / 100).toFixed(2)}

**Budget Breakdown:**
${JSON.stringify(budgets.slice(0, 10).map(b => ({
  name: b.name,
  allocated: b.allocatedAmount / 100,
  spent: b.spentAmount / 100,
  utilization: b.allocatedAmount > 0 ? ((b.spentAmount / b.allocatedAmount) * 100).toFixed(1) + '%' : '0%',
  status: b.status
})), null, 2)}

**Recent Monthly Spending:**
${JSON.stringify(Array.from(monthlySpending.entries()).slice(0, 6).map(([month, amount]) => ({
  month,
  spent: amount / 100
})), null, 2)}

**Forecast Requirements:**
- Timeframe: Next ${timeframeDays} days
- Include confidence scores (0-100)

Return ONLY valid JSON with this structure:
{
  "metrics": {
    "totalBudget": {"predicted": <number>, "confidence": <0-100>, "trend": "<up|down|stable>", "percentChange": <number>},
    "totalSpending": {"predicted": <number>, "confidence": <0-100>, "trend": "<up|down|stable>", "percentChange": <number>},
    "remainingBudget": {"predicted": <number>, "confidence": <0-100>, "trend": "<up|down|stable>", "percentChange": <number>},
    "burnRate": {"predicted": <number>, "confidence": <0-100>, "trend": "<up|down|stable>", "percentChange": <number>}
  },
  "budgetVariances": [
    {"budgetId": <number>, "budgetName": "<name>", "allocated": <number>, "spent": <number>, "variance": <number>, "variancePercent": <number>, "status": "<under|over|on-track>", "prediction": "<will-exceed|will-underspend|on-target>", "riskLevel": "<low|medium|high>"}
  ],
  "insights": [
    {"type": "<trend|risk|opportunity|forecast>", "title": "<title>", "description": "<description>", "impact": "<high|medium|low>", "actionable": <true|false>, "suggestedAction": "<optional>"}
  ],
  "summary": {
    "healthScore": <0-100>,
    "overallTrend": "<positive|negative|neutral>",
    "primaryRisk": "<description>",
    "primaryOpportunity": "<description>"
  }
}`;

      const aiResponse = await complete({
        prompt,
        systemPrompt: 'You are a financial forecasting AI. Return only valid JSON.',
      });

      if (!aiResponse.success) {
        throw new Error(aiResponse.error || 'AI request failed');
      }

      let forecastData;
      try {
        const cleanContent = aiResponse.content
          .replaceAll(/```json\n?/g, '')
          .replaceAll(/```\n?/g, '')
          .trim();
        forecastData = JSON.parse(cleanContent);
      } catch {
        throw new Error('AI returned invalid JSON');
      }

      // Merge AI predictions with current data
      return {
        metrics: {
          totalBudget: {
            current: totalAllocated,
            predicted: forecastData.metrics?.totalBudget?.predicted || totalAllocated,
            confidence: forecastData.metrics?.totalBudget?.confidence || 70,
            trend: forecastData.metrics?.totalBudget?.trend || 'stable',
            percentChange: forecastData.metrics?.totalBudget?.percentChange || 0,
          },
          totalSpending: {
            current: totalSpent,
            predicted: forecastData.metrics?.totalSpending?.predicted || totalSpent + (avgDailySpend * timeframeDays),
            confidence: forecastData.metrics?.totalSpending?.confidence || 70,
            trend: forecastData.metrics?.totalSpending?.trend || 'up',
            percentChange: forecastData.metrics?.totalSpending?.percentChange || ((avgDailySpend * timeframeDays) / totalSpent) * 100,
          },
          remainingBudget: {
            current: totalRemaining,
            predicted: forecastData.metrics?.remainingBudget?.predicted || totalRemaining - (avgDailySpend * timeframeDays),
            confidence: forecastData.metrics?.remainingBudget?.confidence || 65,
            trend: forecastData.metrics?.remainingBudget?.trend || 'down',
            percentChange: forecastData.metrics?.remainingBudget?.percentChange || -((avgDailySpend * timeframeDays) / totalRemaining) * 100,
          },
          burnRate: {
            current: avgDailySpend,
            predicted: forecastData.metrics?.burnRate?.predicted || avgDailySpend * 1.05,
            confidence: forecastData.metrics?.burnRate?.confidence || 60,
            trend: forecastData.metrics?.burnRate?.trend || 'stable',
            percentChange: forecastData.metrics?.burnRate?.percentChange || 5,
          },
        },
        monthlyProjections: generateMonthlyProjections(totalRemaining, avgDailySpend, timeframeDays),
        budgetVariances: forecastData.budgetVariances || generateFallbackVariances(budgets),
        insights: forecastData.insights || [],
        summary: {
          healthScore: forecastData.summary?.healthScore || calculateHealthScore(consumptionRate, budgets),
          overallTrend: forecastData.summary?.overallTrend || (consumptionRate > 80 ? 'negative' : consumptionRate > 50 ? 'neutral' : 'positive'),
          primaryRisk: forecastData.summary?.primaryRisk || 'Budget consumption approaching limit',
          primaryOpportunity: forecastData.summary?.primaryOpportunity || 'Optimize spending across underutilized budgets',
          timeframeDays,
        },
      };
    } catch (error) {
      console.error('AI forecasting failed, using fallback:', error);
    }
  }

  // Fallback statistical analysis
  return generateFallbackForecast(budgets, expenses, totalAllocated, totalSpent, totalRemaining, avgDailySpend, timeframeDays);
}

function generateMonthlyProjections(
  remaining: number,
  avgDailySpend: number,
  timeframeDays: number
): ForecastResult['monthlyProjections'] {
  const projections: ForecastResult['monthlyProjections'] = [];
  const monthsToProject = Math.ceil(timeframeDays / 30);
  let currentRemaining = remaining;
  let cumulative = 0;

  const now = new Date();
  for (let i = 0; i < monthsToProject; i++) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const monthName = monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    const monthlySpend = avgDailySpend * 30;

    cumulative += monthlySpend;
    currentRemaining -= monthlySpend;

    projections.push({
      month: monthName,
      projectedSpending: Math.round(monthlySpend),
      projectedRemaining: Math.max(0, Math.round(currentRemaining)),
      cumulative: Math.round(cumulative),
    });
  }

  return projections;
}

function generateFallbackVariances(budgets: BudgetData[]): BudgetVariance[] {
  return budgets.map(b => {
    const variance = b.allocatedAmount - b.spentAmount;
    const variancePercent = b.allocatedAmount > 0 ? (variance / b.allocatedAmount) * 100 : 0;
    const utilization = b.allocatedAmount > 0 ? (b.spentAmount / b.allocatedAmount) * 100 : 0;

    let status: 'under' | 'over' | 'on-track';
    let prediction: 'will-exceed' | 'will-underspend' | 'on-target';
    let riskLevel: 'low' | 'medium' | 'high';

    if (utilization > 100) {
      status = 'over';
      prediction = 'will-exceed';
      riskLevel = 'high';
    } else if (utilization > 80) {
      status = 'on-track';
      prediction = 'will-exceed';
      riskLevel = 'medium';
    } else if (utilization > 50) {
      status = 'on-track';
      prediction = 'on-target';
      riskLevel = 'low';
    } else {
      status = 'under';
      prediction = 'will-underspend';
      riskLevel = 'low';
    }

    return {
      budgetId: b.id,
      budgetName: b.name,
      allocated: b.allocatedAmount,
      spent: b.spentAmount,
      variance,
      variancePercent,
      status,
      prediction,
      riskLevel,
    };
  });
}

function calculateHealthScore(consumptionRate: number, budgets: BudgetData[]): number {
  let score = 100;

  // Penalize high consumption
  if (consumptionRate > 90) score -= 30;
  else if (consumptionRate > 80) score -= 20;
  else if (consumptionRate > 70) score -= 10;

  // Penalize overbudget items
  const overbudgetCount = budgets.filter(b => b.spentAmount > b.allocatedAmount).length;
  score -= overbudgetCount * 5;

  // Reward balanced spending
  const balancedCount = budgets.filter(b => {
    const util = b.allocatedAmount > 0 ? (b.spentAmount / b.allocatedAmount) * 100 : 0;
    return util >= 40 && util <= 80;
  }).length;
  score += balancedCount * 2;

  return Math.max(0, Math.min(100, score));
}

function generateFallbackForecast(
  budgets: BudgetData[],
  expenses: ExpenseData[],
  totalAllocated: number,
  totalSpent: number,
  totalRemaining: number,
  avgDailySpend: number,
  timeframeDays: number
): ForecastResult {
  const projectedSpending = avgDailySpend * timeframeDays;
  const consumptionRate = totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;

  return {
    metrics: {
      totalBudget: {
        current: totalAllocated,
        predicted: totalAllocated,
        confidence: 90,
        trend: 'stable',
        percentChange: 0,
      },
      totalSpending: {
        current: totalSpent,
        predicted: totalSpent + projectedSpending,
        confidence: 65,
        trend: 'up',
        percentChange: totalSpent > 0 ? (projectedSpending / totalSpent) * 100 : 0,
      },
      remainingBudget: {
        current: totalRemaining,
        predicted: Math.max(0, totalRemaining - projectedSpending),
        confidence: 60,
        trend: 'down',
        percentChange: totalRemaining > 0 ? -(projectedSpending / totalRemaining) * 100 : 0,
      },
      burnRate: {
        current: avgDailySpend,
        predicted: avgDailySpend * 1.03,
        confidence: 55,
        trend: 'stable',
        percentChange: 3,
      },
    },
    monthlyProjections: generateMonthlyProjections(totalRemaining, avgDailySpend, timeframeDays),
    budgetVariances: generateFallbackVariances(budgets),
    insights: [
      {
        type: 'forecast',
        title: 'Budget Projection',
        description: `Based on current spending rate of $${(avgDailySpend / 100).toFixed(2)}/day, projected to spend $${(projectedSpending / 100).toFixed(2)} in the next ${timeframeDays} days.`,
        impact: projectedSpending > totalRemaining ? 'high' : 'medium',
        actionable: true,
        suggestedAction: projectedSpending > totalRemaining
          ? 'Review spending to avoid exceeding budget allocation'
          : 'Monitor spending to maintain budget health',
      },
      ...(consumptionRate > 80 ? [{
        type: 'risk' as const,
        title: 'High Budget Utilization',
        description: `Current budget utilization is at ${consumptionRate.toFixed(1)}%. Risk of exceeding allocated amounts.`,
        impact: 'high' as const,
        actionable: true,
        suggestedAction: 'Consider requesting budget revision or implementing spending controls',
      }] : []),
      ...(budgets.filter(b => b.spentAmount > b.allocatedAmount).length > 0 ? [{
        type: 'risk' as const,
        title: 'Over-Budget Items',
        description: `${budgets.filter(b => b.spentAmount > b.allocatedAmount).length} budget(s) have exceeded their allocated amounts.`,
        impact: 'high' as const,
        actionable: true,
        suggestedAction: 'Review and reallocate funds from underutilized budgets',
      }] : []),
    ],
    summary: {
      healthScore: calculateHealthScore(consumptionRate, budgets),
      overallTrend: consumptionRate > 80 ? 'negative' : consumptionRate > 50 ? 'neutral' : 'positive',
      primaryRisk: projectedSpending > totalRemaining
        ? 'Projected spending may exceed remaining budget'
        : 'Monitor spending to avoid budget overruns',
      primaryOpportunity: 'Optimize budget allocation based on actual spending patterns',
      timeframeDays,
    },
  };
}
