/**
 * AI Expense Analysis Service
 * Provides auto-categorization and anomaly detection for expenses
 */

import { complete } from './service';
import { isAIConfigured } from './config';

export interface ExpenseItem {
  id: number;
  title: string;
  description?: string | null;
  amount: number;
  category?: string | null;
  categoryId?: number | null;
  departmentId?: number | null;
  vendorName?: string | null;
  expenseDate: Date | string;
  status: string;
}

export interface CategorySuggestion {
  expenseId: number;
  suggestedCategory: string;
  confidence: number;
  reasoning: string;
  alternativeCategories: Array<{
    category: string;
    confidence: number;
  }>;
}

export interface AnomalyDetection {
  expenseId: number;
  expenseTitle: string;
  amount: number;
  anomalyType: 'unusual_amount' | 'duplicate' | 'unusual_timing' | 'unusual_category' | 'potential_fraud';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  suggestedAction: string;
  relatedExpenseIds?: number[];
}

export interface ExpenseAnalysisResult {
  categorySuggestions: CategorySuggestion[];
  anomalies: AnomalyDetection[];
  insights: Array<{
    type: 'trend' | 'savings' | 'policy' | 'optimization';
    title: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
    suggestedAction?: string;
  }>;
  summary: {
    totalExpenses: number;
    totalAmount: number;
    uncategorizedCount: number;
    anomalyCount: number;
    riskScore: number;
    categoryBreakdown: Array<{
      category: string;
      count: number;
      totalAmount: number;
      percentOfTotal: number;
    }>;
  };
}

export async function analyzeExpenses(
  expenses: ExpenseItem[],
  availableCategories: string[]
): Promise<ExpenseAnalysisResult> {
  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
  const uncategorized = expenses.filter(e => !e.category && !e.categoryId);

  // Calculate basic statistics
  const amounts = expenses.map(e => e.amount);
  const avgAmount = amounts.length > 0 ? amounts.reduce((a, b) => a + b, 0) / amounts.length : 0;
  const stdDev = calculateStdDev(amounts, avgAmount);

  // Group by category
  const categoryGroups = new Map<string, { count: number; total: number }>();
  for (const expense of expenses) {
    const cat = expense.category || 'Uncategorized';
    const existing = categoryGroups.get(cat) || { count: 0, total: 0 };
    categoryGroups.set(cat, {
      count: existing.count + 1,
      total: existing.total + expense.amount,
    });
  }

  // Try AI-powered analysis
  if (isAIConfigured() && expenses.length > 0) {
    try {
      const prompt = buildAnalysisPrompt(expenses, availableCategories, {
        totalAmount,
        avgAmount,
        stdDev,
        uncategorizedCount: uncategorized.length,
      });

      const aiResponse = await complete({
        prompt,
        systemPrompt: 'You are an expense analysis AI. Return only valid JSON.',
      });

      if (!aiResponse.success) {
        throw new Error(aiResponse.error || 'AI request failed');
      }

      const cleanContent = aiResponse.content
        .replaceAll(/```json\n?/g, '')
        .replaceAll(/```\n?/g, '')
        .trim();

      const aiResult = JSON.parse(cleanContent);

      return buildResult(expenses, totalAmount, categoryGroups, aiResult);
    } catch (error) {
      console.error('AI expense analysis failed, using fallback:', error);
    }
  }

  // Fallback statistical analysis
  return buildFallbackResult(expenses, totalAmount, avgAmount, stdDev, categoryGroups, availableCategories);
}

function buildAnalysisPrompt(
  expenses: ExpenseItem[],
  categories: string[],
  stats: { totalAmount: number; avgAmount: number; stdDev: number; uncategorizedCount: number }
): string {
  const sampleExpenses = expenses.slice(0, 20).map(e => ({
    id: e.id,
    title: e.title,
    description: e.description,
    amount: e.amount / 100,
    category: e.category,
    date: e.expenseDate,
    status: e.status,
  }));

  return `Analyze these expenses for categorization suggestions and anomaly detection.

**Available Categories:** ${categories.join(', ')}

**Expense Statistics:**
- Total Expenses: ${expenses.length}
- Total Amount: $${(stats.totalAmount / 100).toFixed(2)}
- Average Amount: $${(stats.avgAmount / 100).toFixed(2)}
- Std Deviation: $${(stats.stdDev / 100).toFixed(2)}
- Uncategorized: ${stats.uncategorizedCount}

**Sample Expenses:**
${JSON.stringify(sampleExpenses, null, 2)}

Return ONLY valid JSON:
{
  "categorySuggestions": [
    {
      "expenseId": <number>,
      "suggestedCategory": "<category>",
      "confidence": <0-100>,
      "reasoning": "<why this category>",
      "alternativeCategories": [{"category": "<name>", "confidence": <0-100>}]
    }
  ],
  "anomalies": [
    {
      "expenseId": <number>,
      "expenseTitle": "<title>",
      "amount": <number>,
      "anomalyType": "<unusual_amount|duplicate|unusual_timing|unusual_category|potential_fraud>",
      "severity": "<low|medium|high|critical>",
      "description": "<what's unusual>",
      "suggestedAction": "<recommended action>"
    }
  ],
  "insights": [
    {
      "type": "<trend|savings|policy|optimization>",
      "title": "<insight title>",
      "description": "<description>",
      "impact": "<high|medium|low>",
      "suggestedAction": "<optional action>"
    }
  ]
}`;
}

function buildResult(
  expenses: ExpenseItem[],
  totalAmount: number,
  categoryGroups: Map<string, { count: number; total: number }>,
  aiResult: any
): ExpenseAnalysisResult {
  const categoryBreakdown = Array.from(categoryGroups.entries()).map(([category, data]) => ({
    category,
    count: data.count,
    totalAmount: data.total,
    percentOfTotal: totalAmount > 0 ? (data.total / totalAmount) * 100 : 0,
  })).sort((a, b) => b.totalAmount - a.totalAmount);

  const anomalyCount = aiResult.anomalies?.length || 0;
  const criticalAnomalies = aiResult.anomalies?.filter((a: any) => a.severity === 'critical').length || 0;
  const highAnomalies = aiResult.anomalies?.filter((a: any) => a.severity === 'high').length || 0;

  // Calculate risk score
  let riskScore = 100;
  riskScore -= criticalAnomalies * 20;
  riskScore -= highAnomalies * 10;
  riskScore -= anomalyCount * 2;
  riskScore = Math.max(0, Math.min(100, riskScore));

  return {
    categorySuggestions: aiResult.categorySuggestions || [],
    anomalies: aiResult.anomalies || [],
    insights: aiResult.insights || [],
    summary: {
      totalExpenses: expenses.length,
      totalAmount,
      uncategorizedCount: expenses.filter(e => !e.category && !e.categoryId).length,
      anomalyCount,
      riskScore,
      categoryBreakdown,
    },
  };
}

function buildFallbackResult(
  expenses: ExpenseItem[],
  totalAmount: number,
  avgAmount: number,
  stdDev: number,
  categoryGroups: Map<string, { count: number; total: number }>,
  availableCategories: string[]
): ExpenseAnalysisResult {
  const categorySuggestions: CategorySuggestion[] = [];
  const anomalies: AnomalyDetection[] = [];

  // Suggest categories for uncategorized expenses
  const uncategorized = expenses.filter(e => !e.category && !e.categoryId);
  for (const expense of uncategorized.slice(0, 10)) {
    const suggestedCategory = suggestCategory(expense.title, expense.description, availableCategories);
    categorySuggestions.push({
      expenseId: expense.id,
      suggestedCategory,
      confidence: 60,
      reasoning: `Based on title "${expense.title}"`,
      alternativeCategories: [],
    });
  }

  // Detect anomalies using statistical methods
  for (const expense of expenses) {
    // Unusual amount detection (more than 2 standard deviations)
    if (expense.amount > avgAmount + 2 * stdDev) {
      const severity = expense.amount > avgAmount + 3 * stdDev ? 'high' : 'medium';
      anomalies.push({
        expenseId: expense.id,
        expenseTitle: expense.title,
        amount: expense.amount,
        anomalyType: 'unusual_amount',
        severity,
        description: `Amount $${(expense.amount / 100).toFixed(2)} is significantly higher than average $${(avgAmount / 100).toFixed(2)}`,
        suggestedAction: 'Review expense and verify legitimacy',
      });
    }
  }

  // Detect potential duplicates
  const titleGroups = new Map<string, ExpenseItem[]>();
  for (const expense of expenses) {
    const key = expense.title.toLowerCase().trim();
    const existing = titleGroups.get(key) || [];
    titleGroups.set(key, [...existing, expense]);
  }

  for (const [title, group] of titleGroups.entries()) {
    if (group.length > 1) {
      // Check if amounts are similar
      const amounts = group.map(e => e.amount);
      const maxDiff = Math.max(...amounts) - Math.min(...amounts);
      if (maxDiff < avgAmount * 0.1) {
        for (const expense of group.slice(1)) {
          anomalies.push({
            expenseId: expense.id,
            expenseTitle: expense.title,
            amount: expense.amount,
            anomalyType: 'duplicate',
            severity: 'medium',
            description: `Potential duplicate of "${title}" with similar amount`,
            suggestedAction: 'Verify this is not a duplicate submission',
            relatedExpenseIds: group.map(e => e.id).filter(id => id !== expense.id),
          });
        }
      }
    }
  }

  const categoryBreakdown = Array.from(categoryGroups.entries()).map(([category, data]) => ({
    category,
    count: data.count,
    totalAmount: data.total,
    percentOfTotal: totalAmount > 0 ? (data.total / totalAmount) * 100 : 0,
  })).sort((a, b) => b.totalAmount - a.totalAmount);

  const insights = [];

  // Add insights based on analysis
  if (uncategorized.length > expenses.length * 0.2) {
    insights.push({
      type: 'policy' as const,
      title: 'High Uncategorized Rate',
      description: `${uncategorized.length} expenses (${((uncategorized.length / expenses.length) * 100).toFixed(1)}%) are uncategorized. This may indicate a need for clearer categorization guidelines.`,
      impact: 'medium' as const,
      suggestedAction: 'Review and categorize uncategorized expenses, consider mandatory category selection',
    });
  }

  if (categoryBreakdown.length > 0 && categoryBreakdown[0].percentOfTotal > 50) {
    insights.push({
      type: 'trend' as const,
      title: 'Category Concentration',
      description: `${categoryBreakdown[0].category} accounts for ${categoryBreakdown[0].percentOfTotal.toFixed(1)}% of total expenses.`,
      impact: 'low' as const,
    });
  }

  if (anomalies.length > 0) {
    insights.push({
      type: 'optimization' as const,
      title: 'Anomalies Detected',
      description: `${anomalies.length} expense anomalies detected that require review.`,
      impact: anomalies.some(a => a.severity === 'high' || a.severity === 'critical') ? 'high' as const : 'medium' as const,
      suggestedAction: 'Review flagged expenses in the anomaly report',
    });
  }

  // Calculate risk score
  const criticalCount = anomalies.filter(a => a.severity === 'critical').length;
  const highCount = anomalies.filter(a => a.severity === 'high').length;
  let riskScore = 100;
  riskScore -= criticalCount * 20;
  riskScore -= highCount * 10;
  riskScore -= anomalies.length * 2;
  riskScore = Math.max(0, Math.min(100, riskScore));

  return {
    categorySuggestions,
    anomalies,
    insights,
    summary: {
      totalExpenses: expenses.length,
      totalAmount,
      uncategorizedCount: uncategorized.length,
      anomalyCount: anomalies.length,
      riskScore,
      categoryBreakdown,
    },
  };
}

function suggestCategory(title: string, description: string | null | undefined, categories: string[]): string {
  const text = `${title} ${description || ''}`.toLowerCase();

  // Simple keyword matching
  const categoryKeywords: Record<string, string[]> = {
    'Travel': ['travel', 'flight', 'hotel', 'transportation', 'taxi', 'uber', 'airline'],
    'Office Supplies': ['office', 'supplies', 'paper', 'printer', 'stationery'],
    'Software': ['software', 'subscription', 'license', 'app', 'saas'],
    'Equipment': ['equipment', 'hardware', 'computer', 'laptop', 'phone'],
    'Marketing': ['marketing', 'advertising', 'campaign', 'promotion'],
    'Professional Services': ['consulting', 'legal', 'accounting', 'professional'],
    'Utilities': ['utility', 'electric', 'water', 'internet', 'phone bill'],
    'Maintenance': ['maintenance', 'repair', 'cleaning', 'service'],
    'Training': ['training', 'course', 'education', 'conference', 'seminar'],
    'Medical': ['medical', 'healthcare', 'pharmacy', 'hospital'],
  };

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(keyword => text.includes(keyword))) {
      // Check if this category exists in available categories
      const matchedCategory = categories.find(c => c.toLowerCase().includes(category.toLowerCase()));
      if (matchedCategory) return matchedCategory;
    }
  }

  return categories[0] || 'General';
}

function calculateStdDev(values: number[], mean: number): number {
  if (values.length === 0) return 0;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(avgSquaredDiff);
}
