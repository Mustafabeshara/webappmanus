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

// Product Forecasting
export {
  generateProductForecast,
  generateBulkForecast,
} from './product-forecasting';
export type {
  ProductSalesData,
  SalesRecord,
  DemandForecast,
  ProductForecastResult,
  ProductInsight,
  BulkForecastResult,
} from './product-forecasting';

export { AI_CONFIG, isAIConfigured, getAvailableProviders } from './config';

// Phase 4: Vector Database Integration
export {
  vectorStore,
  indexProduct,
  indexTender,
  indexSupplier,
  indexDocument,
  semanticSearch,
  findSimilarProducts,
  matchProductsToTender,
} from './vector-database';
export type { VectorEmbedding, SimilarityResult } from './vector-database';

// Phase 4: Learning System
export {
  learningStore,
  recordProductMatchCorrection,
  recordCategoryCorrection,
  recordSearchRelevanceCorrection,
  getLearnedPredictions,
  applyLearningToScore,
} from './learning-system';
export type { CorrectionType, CorrectionRecord, LearningPattern } from './learning-system';

// Phase 4: NLP Query Interface
export {
  parseNaturalLanguageQuery,
  getQuerySuggestions,
} from './nlp-query';
export type {
  QueryIntent,
  ParsedQuery,
  QueryEntity,
  QueryFilter,
  QuerySort,
  QueryAggregation,
  NLPQueryResponse,
} from './nlp-query';
