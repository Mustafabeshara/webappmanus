/**
 * AI Service Exports
 */

export { complete, getAIStatus } from './service';
export type { AIRequest, AIResponse } from './service';

export { analyzeTender, analyzeSpecifications } from './tender-analysis';
export type { TenderAnalysis, TenderData } from './tender-analysis';

export { analyzeInventory } from './inventory-optimization';
export type { InventoryItem, OptimizationResult } from './inventory-optimization';

export { generateBudgetForecast } from './budget-forecasting';
export type { BudgetData, ExpenseData, ForecastResult, BudgetVariance } from './budget-forecasting';

export { analyzeExpenses } from './expense-analysis';
export type { ExpenseItem, ExpenseAnalysisResult, CategorySuggestion, AnomalyDetection } from './expense-analysis';

export { AI_CONFIG, isAIConfigured, getAvailableProviders } from './config';
