/**
 * AI Product Forecasting Service
 * Provides demand forecasting, sales predictions, and inventory optimization for individual products
 */

import { complete } from './service';
import { isAIConfigured } from './config';

// =============================================================================
// INTERFACES
// =============================================================================

export interface ProductSalesData {
  productId: number;
  productName: string;
  sku: string;
  category?: string;
  unitPrice: number; // in cents
  salesHistory: SalesRecord[];
  currentInventory: number;
  minStockLevel: number;
  maxStockLevel?: number;
  leadTimeDays?: number; // supplier lead time
}

export interface SalesRecord {
  date: Date;
  quantity: number;
  revenue: number; // in cents
  tenderId?: number;
  customerId?: number;
  channel?: 'tender' | 'direct' | 'contract' | 'other';
}

export interface DemandForecast {
  period: string; // "2024-01", "2024-Q1", etc.
  predictedQuantity: number;
  predictedRevenue: number; // in cents
  confidence: number; // 0-100
  trend: 'increasing' | 'decreasing' | 'stable' | 'seasonal';
  factors: string[]; // factors affecting the forecast
}

export interface ProductForecastResult {
  productId: number;
  productName: string;
  sku: string;

  // Current metrics
  currentMetrics: {
    avgMonthlySales: number;
    avgMonthlyRevenue: number;
    salesVelocity: number; // units per day
    stockCoverDays: number; // how many days current inventory will last
    turnoverRate: number; // inventory turns per year
  };

  // Forecasts
  demandForecast: DemandForecast[];

  // Inventory recommendations
  inventoryRecommendations: {
    reorderPoint: number;
    economicOrderQuantity: number;
    safetyStock: number;
    recommendedMaxStock: number;
    nextReorderDate?: string;
    stockoutRisk: 'low' | 'medium' | 'high' | 'critical';
  };

  // Pricing insights
  pricingInsights: {
    currentMargin?: number;
    priceElasticity?: 'high' | 'medium' | 'low';
    recommendedPriceAdjustment?: number; // percentage
    competitivePosition?: 'premium' | 'competitive' | 'budget';
  };

  // AI insights
  insights: ProductInsight[];

  // Summary
  summary: {
    healthScore: number; // 0-100
    overallTrend: 'positive' | 'negative' | 'neutral';
    primaryOpportunity: string;
    primaryRisk: string;
    actionItems: string[];
  };
}

export interface ProductInsight {
  type: 'trend' | 'risk' | 'opportunity' | 'anomaly' | 'recommendation';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  actionable: boolean;
  suggestedAction?: string;
  relatedMetric?: string;
}

export interface BulkForecastResult {
  products: ProductForecastResult[];
  portfolioSummary: {
    totalPredictedRevenue: number;
    topGrowthProducts: { productId: number; name: string; growthRate: number }[];
    atRiskProducts: { productId: number; name: string; risk: string }[];
    inventoryHealth: {
      overstocked: number;
      optimal: number;
      understocked: number;
      critical: number;
    };
  };
  categoryForecasts: {
    category: string;
    predictedRevenue: number;
    productCount: number;
    trend: 'up' | 'down' | 'stable';
  }[];
}

// =============================================================================
// MAIN FORECASTING FUNCTIONS
// =============================================================================

/**
 * Generate comprehensive forecast for a single product
 */
export async function generateProductForecast(
  productData: ProductSalesData,
  forecastMonths: number = 6
): Promise<ProductForecastResult> {
  const { salesHistory, currentInventory, minStockLevel, maxStockLevel, leadTimeDays = 14 } = productData;

  // Calculate current metrics
  const currentMetrics = calculateCurrentMetrics(productData);

  // Generate statistical forecast
  const statisticalForecast = generateStatisticalForecast(salesHistory, forecastMonths);

  // Try AI-enhanced forecasting
  let aiForecast: DemandForecast[] | null = null;
  let aiInsights: ProductInsight[] = [];

  if (isAIConfigured() && salesHistory.length >= 3) {
    try {
      const aiResult = await generateAIForecast(productData, forecastMonths);
      aiForecast = aiResult.forecast;
      aiInsights = aiResult.insights;
    } catch (error) {
      console.error('[ProductForecast] AI forecasting failed:', error);
    }
  }

  // Use AI forecast if available, otherwise use statistical
  const demandForecast = aiForecast || statisticalForecast;

  // Calculate inventory recommendations
  const inventoryRecommendations = calculateInventoryRecommendations(
    currentMetrics,
    demandForecast,
    currentInventory,
    minStockLevel,
    maxStockLevel,
    leadTimeDays
  );

  // Generate insights
  const insights = [
    ...aiInsights,
    ...generateStatisticalInsights(currentMetrics, demandForecast, inventoryRecommendations),
  ];

  // Generate summary
  const summary = generateSummary(currentMetrics, demandForecast, inventoryRecommendations, insights);

  return {
    productId: productData.productId,
    productName: productData.productName,
    sku: productData.sku,
    currentMetrics,
    demandForecast,
    inventoryRecommendations,
    pricingInsights: {}, // Can be enhanced with competitor data
    insights,
    summary,
  };
}

/**
 * Generate forecasts for multiple products (bulk operation)
 */
export async function generateBulkForecast(
  productsData: ProductSalesData[],
  forecastMonths: number = 6
): Promise<BulkForecastResult> {
  const products: ProductForecastResult[] = [];

  // Process products in parallel (batches of 5)
  const batchSize = 5;
  for (let i = 0; i < productsData.length; i += batchSize) {
    const batch = productsData.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(p => generateProductForecast(p, forecastMonths))
    );
    products.push(...batchResults);
  }

  // Calculate portfolio summary
  const portfolioSummary = calculatePortfolioSummary(products);

  // Calculate category forecasts
  const categoryForecasts = calculateCategoryForecasts(products, productsData);

  return {
    products,
    portfolioSummary,
    categoryForecasts,
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function calculateCurrentMetrics(productData: ProductSalesData): ProductForecastResult['currentMetrics'] {
  const { salesHistory, currentInventory } = productData;

  if (salesHistory.length === 0) {
    return {
      avgMonthlySales: 0,
      avgMonthlyRevenue: 0,
      salesVelocity: 0,
      stockCoverDays: currentInventory > 0 ? 999 : 0,
      turnoverRate: 0,
    };
  }

  // Group sales by month
  const monthlySales = new Map<string, { quantity: number; revenue: number }>();
  for (const sale of salesHistory) {
    const monthKey = `${sale.date.getFullYear()}-${String(sale.date.getMonth() + 1).padStart(2, '0')}`;
    const existing = monthlySales.get(monthKey) || { quantity: 0, revenue: 0 };
    monthlySales.set(monthKey, {
      quantity: existing.quantity + sale.quantity,
      revenue: existing.revenue + sale.revenue,
    });
  }

  const monthlyValues = Array.from(monthlySales.values());
  const avgMonthlySales = monthlyValues.reduce((sum, m) => sum + m.quantity, 0) / Math.max(monthlyValues.length, 1);
  const avgMonthlyRevenue = monthlyValues.reduce((sum, m) => sum + m.revenue, 0) / Math.max(monthlyValues.length, 1);

  // Calculate sales velocity (units per day based on recent 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentSales = salesHistory.filter(s => s.date >= thirtyDaysAgo);
  const recentQuantity = recentSales.reduce((sum, s) => sum + s.quantity, 0);
  const salesVelocity = recentQuantity / 30;

  // Stock cover days
  const stockCoverDays = salesVelocity > 0 ? Math.round(currentInventory / salesVelocity) : (currentInventory > 0 ? 999 : 0);

  // Inventory turnover rate (annual)
  const totalSales = salesHistory.reduce((sum, s) => sum + s.quantity, 0);
  const avgInventory = currentInventory; // Simplified - ideally track historical inventory
  const turnoverRate = avgInventory > 0 ? (totalSales * 12 / monthlyValues.length) / avgInventory : 0;

  return {
    avgMonthlySales: Math.round(avgMonthlySales),
    avgMonthlyRevenue: Math.round(avgMonthlyRevenue),
    salesVelocity: Math.round(salesVelocity * 100) / 100,
    stockCoverDays,
    turnoverRate: Math.round(turnoverRate * 10) / 10,
  };
}

function generateStatisticalForecast(
  salesHistory: SalesRecord[],
  forecastMonths: number
): DemandForecast[] {
  if (salesHistory.length === 0) {
    return generateEmptyForecast(forecastMonths);
  }

  // Group by month
  const monthlySales = new Map<string, { quantity: number; revenue: number }>();
  for (const sale of salesHistory) {
    const monthKey = `${sale.date.getFullYear()}-${String(sale.date.getMonth() + 1).padStart(2, '0')}`;
    const existing = monthlySales.get(monthKey) || { quantity: 0, revenue: 0 };
    monthlySales.set(monthKey, {
      quantity: existing.quantity + sale.quantity,
      revenue: existing.revenue + sale.revenue,
    });
  }

  const monthlyData = Array.from(monthlySales.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([_, data]) => data);

  // Calculate trend using simple linear regression
  const n = monthlyData.length;
  const avgQuantity = monthlyData.reduce((sum, m) => sum + m.quantity, 0) / n;
  const avgRevenue = monthlyData.reduce((sum, m) => sum + m.revenue, 0) / n;

  let trend: 'increasing' | 'decreasing' | 'stable' | 'seasonal' = 'stable';
  let trendSlope = 0;

  if (n >= 3) {
    // Calculate slope
    let sumXY = 0, sumX = 0, sumY = 0, sumX2 = 0;
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += monthlyData[i].quantity;
      sumXY += i * monthlyData[i].quantity;
      sumX2 += i * i;
    }
    trendSlope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    const changePercent = avgQuantity > 0 ? (trendSlope * n / avgQuantity) * 100 : 0;
    if (changePercent > 10) trend = 'increasing';
    else if (changePercent < -10) trend = 'decreasing';
    else trend = 'stable';
  }

  // Generate forecasts
  const forecasts: DemandForecast[] = [];
  const now = new Date();

  for (let i = 1; i <= forecastMonths; i++) {
    const forecastDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const period = `${forecastDate.getFullYear()}-${String(forecastDate.getMonth() + 1).padStart(2, '0')}`;

    // Apply trend to prediction
    const predictedQuantity = Math.max(0, Math.round(avgQuantity + (trendSlope * (n + i))));
    const avgPrice = avgQuantity > 0 ? avgRevenue / avgQuantity : 0;
    const predictedRevenue = Math.round(predictedQuantity * avgPrice);

    // Confidence decreases for further predictions
    const confidence = Math.max(30, 85 - (i * 8));

    forecasts.push({
      period,
      predictedQuantity,
      predictedRevenue,
      confidence,
      trend,
      factors: ['Historical sales trend', 'Moving average calculation'],
    });
  }

  return forecasts;
}

function generateEmptyForecast(forecastMonths: number): DemandForecast[] {
  const forecasts: DemandForecast[] = [];
  const now = new Date();

  for (let i = 1; i <= forecastMonths; i++) {
    const forecastDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const period = `${forecastDate.getFullYear()}-${String(forecastDate.getMonth() + 1).padStart(2, '0')}`;

    forecasts.push({
      period,
      predictedQuantity: 0,
      predictedRevenue: 0,
      confidence: 0,
      trend: 'stable',
      factors: ['No historical data available'],
    });
  }

  return forecasts;
}

async function generateAIForecast(
  productData: ProductSalesData,
  forecastMonths: number
): Promise<{ forecast: DemandForecast[]; insights: ProductInsight[] }> {
  const { productName, sku, category, unitPrice, salesHistory } = productData;

  // Prepare monthly summary for AI
  const monthlySummary = new Map<string, { quantity: number; revenue: number; transactions: number }>();
  for (const sale of salesHistory) {
    const monthKey = `${sale.date.getFullYear()}-${String(sale.date.getMonth() + 1).padStart(2, '0')}`;
    const existing = monthlySummary.get(monthKey) || { quantity: 0, revenue: 0, transactions: 0 };
    monthlySummary.set(monthKey, {
      quantity: existing.quantity + sale.quantity,
      revenue: existing.revenue + sale.revenue,
      transactions: existing.transactions + 1,
    });
  }

  const sortedMonths = Array.from(monthlySummary.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      quantity: data.quantity,
      revenue: (data.revenue / 100).toFixed(2),
      transactions: data.transactions,
    }));

  const prompt = `You are a demand forecasting AI for a healthcare products distribution company in Saudi Arabia.

**Product Information:**
- Name: ${productName}
- SKU: ${sku}
- Category: ${category || 'General'}
- Unit Price: $${(unitPrice / 100).toFixed(2)}

**Historical Monthly Sales (last ${sortedMonths.length} months):**
${JSON.stringify(sortedMonths, null, 2)}

**Task:**
1. Analyze the sales pattern and identify trends
2. Generate demand forecasts for the next ${forecastMonths} months
3. Provide actionable insights

**Return ONLY valid JSON with this structure:**
{
  "forecast": [
    {
      "period": "YYYY-MM",
      "predictedQuantity": <number>,
      "predictedRevenue": <number in cents>,
      "confidence": <0-100>,
      "trend": "<increasing|decreasing|stable|seasonal>",
      "factors": ["factor1", "factor2"]
    }
  ],
  "insights": [
    {
      "type": "<trend|risk|opportunity|anomaly|recommendation>",
      "title": "<short title>",
      "description": "<detailed description>",
      "impact": "<high|medium|low>",
      "actionable": <true|false>,
      "suggestedAction": "<optional action>"
    }
  ]
}`;

  const response = await complete({
    prompt,
    systemPrompt: 'You are a demand forecasting AI. Return only valid JSON.',
  });

  if (!response.success) {
    throw new Error(response.error || 'AI forecast failed');
  }

  const cleanContent = response.content
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();

  return JSON.parse(cleanContent);
}

function calculateInventoryRecommendations(
  metrics: ProductForecastResult['currentMetrics'],
  forecast: DemandForecast[],
  currentInventory: number,
  minStockLevel: number,
  maxStockLevel: number | undefined,
  leadTimeDays: number
): ProductForecastResult['inventoryRecommendations'] {
  const { salesVelocity, avgMonthlySales } = metrics;

  // Average demand during lead time
  const leadTimeDemand = salesVelocity * leadTimeDays;

  // Standard deviation approximation (using coefficient of variation)
  const stdDev = avgMonthlySales * 0.25; // Assume 25% coefficient of variation

  // Safety stock (assuming 95% service level, z = 1.65)
  const safetyStock = Math.ceil(1.65 * stdDev * Math.sqrt(leadTimeDays / 30));

  // Reorder point
  const reorderPoint = Math.ceil(leadTimeDemand + safetyStock);

  // Economic Order Quantity (simplified)
  const annualDemand = avgMonthlySales * 12;
  const orderCost = 5000; // $50 per order (simplified assumption)
  const holdingCostPercent = 0.25; // 25% of item value per year
  const avgItemValue = forecast.length > 0 && forecast[0].predictedQuantity > 0
    ? forecast[0].predictedRevenue / forecast[0].predictedQuantity
    : 10000; // $100 default
  const holdingCost = avgItemValue * holdingCostPercent;

  const eoq = Math.ceil(Math.sqrt((2 * annualDemand * orderCost) / holdingCost));

  // Recommended max stock
  const recommendedMaxStock = maxStockLevel || (reorderPoint + eoq);

  // Calculate stockout risk
  let stockoutRisk: 'low' | 'medium' | 'high' | 'critical';
  const daysOfStock = salesVelocity > 0 ? currentInventory / salesVelocity : 999;

  if (currentInventory <= 0) stockoutRisk = 'critical';
  else if (daysOfStock < leadTimeDays) stockoutRisk = 'high';
  else if (currentInventory < reorderPoint) stockoutRisk = 'medium';
  else stockoutRisk = 'low';

  // Next reorder date
  let nextReorderDate: string | undefined;
  if (salesVelocity > 0 && currentInventory > reorderPoint) {
    const daysUntilReorder = (currentInventory - reorderPoint) / salesVelocity;
    const reorderDate = new Date();
    reorderDate.setDate(reorderDate.getDate() + Math.floor(daysUntilReorder));
    nextReorderDate = reorderDate.toISOString().split('T')[0];
  }

  return {
    reorderPoint: Math.max(reorderPoint, minStockLevel),
    economicOrderQuantity: eoq,
    safetyStock,
    recommendedMaxStock,
    nextReorderDate,
    stockoutRisk,
  };
}

function generateStatisticalInsights(
  metrics: ProductForecastResult['currentMetrics'],
  forecast: DemandForecast[],
  inventory: ProductForecastResult['inventoryRecommendations']
): ProductInsight[] {
  const insights: ProductInsight[] = [];

  // Stock level insight
  if (inventory.stockoutRisk === 'critical') {
    insights.push({
      type: 'risk',
      title: 'Critical Stock Level',
      description: 'Product is out of stock or has zero inventory. Immediate action required.',
      impact: 'high',
      actionable: true,
      suggestedAction: `Order at least ${inventory.economicOrderQuantity} units immediately`,
      relatedMetric: 'currentInventory',
    });
  } else if (inventory.stockoutRisk === 'high') {
    insights.push({
      type: 'risk',
      title: 'Low Stock Warning',
      description: `Current stock will deplete before reorder arrives. ${metrics.stockCoverDays} days of stock remaining.`,
      impact: 'high',
      actionable: true,
      suggestedAction: 'Place expedited order to prevent stockout',
      relatedMetric: 'stockCoverDays',
    });
  }

  // Turnover rate insight
  if (metrics.turnoverRate < 2) {
    insights.push({
      type: 'opportunity',
      title: 'Low Inventory Turnover',
      description: `Turnover rate of ${metrics.turnoverRate}x per year indicates slow-moving inventory.`,
      impact: 'medium',
      actionable: true,
      suggestedAction: 'Consider promotional pricing or reducing reorder quantities',
      relatedMetric: 'turnoverRate',
    });
  } else if (metrics.turnoverRate > 12) {
    insights.push({
      type: 'trend',
      title: 'High Inventory Turnover',
      description: `Excellent turnover rate of ${metrics.turnoverRate}x per year. Product is a strong performer.`,
      impact: 'low',
      actionable: false,
      relatedMetric: 'turnoverRate',
    });
  }

  // Forecast trend insight
  if (forecast.length > 0) {
    const firstMonth = forecast[0];
    const lastMonth = forecast[forecast.length - 1];

    if (firstMonth.predictedQuantity > 0) {
      const growthRate = ((lastMonth.predictedQuantity - firstMonth.predictedQuantity) / firstMonth.predictedQuantity) * 100;

      if (growthRate > 20) {
        insights.push({
          type: 'opportunity',
          title: 'Strong Growth Forecast',
          description: `Demand expected to grow ${growthRate.toFixed(1)}% over the forecast period.`,
          impact: 'high',
          actionable: true,
          suggestedAction: 'Increase safety stock and consider volume discounts with suppliers',
          relatedMetric: 'demandForecast',
        });
      } else if (growthRate < -20) {
        insights.push({
          type: 'risk',
          title: 'Declining Demand Forecast',
          description: `Demand expected to decline ${Math.abs(growthRate).toFixed(1)}% over the forecast period.`,
          impact: 'medium',
          actionable: true,
          suggestedAction: 'Reduce order quantities and review product relevance',
          relatedMetric: 'demandForecast',
        });
      }
    }
  }

  return insights;
}

function generateSummary(
  metrics: ProductForecastResult['currentMetrics'],
  forecast: DemandForecast[],
  inventory: ProductForecastResult['inventoryRecommendations'],
  insights: ProductInsight[]
): ProductForecastResult['summary'] {
  // Calculate health score
  let healthScore = 100;

  // Penalize stockout risk
  if (inventory.stockoutRisk === 'critical') healthScore -= 40;
  else if (inventory.stockoutRisk === 'high') healthScore -= 25;
  else if (inventory.stockoutRisk === 'medium') healthScore -= 10;

  // Penalize poor turnover
  if (metrics.turnoverRate < 1) healthScore -= 15;
  else if (metrics.turnoverRate < 2) healthScore -= 8;

  // Penalize low sales velocity
  if (metrics.salesVelocity === 0) healthScore -= 20;

  // Boost for good metrics
  if (metrics.turnoverRate >= 6 && metrics.turnoverRate <= 12) healthScore += 5;
  if (inventory.stockoutRisk === 'low' && metrics.stockCoverDays >= 30) healthScore += 5;

  healthScore = Math.max(0, Math.min(100, healthScore));

  // Determine overall trend
  let overallTrend: 'positive' | 'negative' | 'neutral' = 'neutral';
  if (forecast.length >= 2) {
    const firstQuantity = forecast[0].predictedQuantity;
    const lastQuantity = forecast[forecast.length - 1].predictedQuantity;
    if (lastQuantity > firstQuantity * 1.1) overallTrend = 'positive';
    else if (lastQuantity < firstQuantity * 0.9) overallTrend = 'negative';
  }

  // Extract primary risk and opportunity
  const risks = insights.filter(i => i.type === 'risk').sort((a, b) =>
    (b.impact === 'high' ? 3 : b.impact === 'medium' ? 2 : 1) -
    (a.impact === 'high' ? 3 : a.impact === 'medium' ? 2 : 1)
  );
  const opportunities = insights.filter(i => i.type === 'opportunity').sort((a, b) =>
    (b.impact === 'high' ? 3 : b.impact === 'medium' ? 2 : 1) -
    (a.impact === 'high' ? 3 : a.impact === 'medium' ? 2 : 1)
  );

  const primaryRisk = risks[0]?.description || 'No significant risks identified';
  const primaryOpportunity = opportunities[0]?.description || 'Maintain current inventory strategy';

  // Generate action items
  const actionItems = insights
    .filter(i => i.actionable && i.suggestedAction)
    .map(i => i.suggestedAction!)
    .slice(0, 3);

  if (actionItems.length === 0) {
    actionItems.push('Continue monitoring sales trends');
  }

  return {
    healthScore,
    overallTrend,
    primaryRisk,
    primaryOpportunity,
    actionItems,
  };
}

function calculatePortfolioSummary(products: ProductForecastResult[]): BulkForecastResult['portfolioSummary'] {
  const totalPredictedRevenue = products.reduce((sum, p) => {
    const sixMonthRevenue = p.demandForecast.reduce((s, f) => s + f.predictedRevenue, 0);
    return sum + sixMonthRevenue;
  }, 0);

  // Top growth products
  const productsWithGrowth = products
    .filter(p => p.demandForecast.length >= 2 && p.demandForecast[0].predictedQuantity > 0)
    .map(p => ({
      productId: p.productId,
      name: p.productName,
      growthRate: ((p.demandForecast[p.demandForecast.length - 1].predictedQuantity - p.demandForecast[0].predictedQuantity) / p.demandForecast[0].predictedQuantity) * 100,
    }))
    .sort((a, b) => b.growthRate - a.growthRate);

  const topGrowthProducts = productsWithGrowth.slice(0, 5);

  // At-risk products
  const atRiskProducts = products
    .filter(p => p.inventoryRecommendations.stockoutRisk === 'high' || p.inventoryRecommendations.stockoutRisk === 'critical')
    .map(p => ({
      productId: p.productId,
      name: p.productName,
      risk: p.inventoryRecommendations.stockoutRisk,
    }));

  // Inventory health distribution
  const inventoryHealth = {
    overstocked: 0,
    optimal: 0,
    understocked: 0,
    critical: 0,
  };

  for (const p of products) {
    switch (p.inventoryRecommendations.stockoutRisk) {
      case 'low':
        inventoryHealth.optimal++;
        break;
      case 'medium':
        inventoryHealth.understocked++;
        break;
      case 'high':
        inventoryHealth.understocked++;
        break;
      case 'critical':
        inventoryHealth.critical++;
        break;
    }
  }

  return {
    totalPredictedRevenue,
    topGrowthProducts,
    atRiskProducts,
    inventoryHealth,
  };
}

function calculateCategoryForecasts(
  products: ProductForecastResult[],
  productsData: ProductSalesData[]
): BulkForecastResult['categoryForecasts'] {
  const categoryMap = new Map<string, { revenue: number; count: number; firstMonth: number; lastMonth: number }>();

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const data = productsData[i];
    const category = data.category || 'Uncategorized';

    const existing = categoryMap.get(category) || { revenue: 0, count: 0, firstMonth: 0, lastMonth: 0 };
    const sixMonthRevenue = product.demandForecast.reduce((sum, f) => sum + f.predictedRevenue, 0);

    categoryMap.set(category, {
      revenue: existing.revenue + sixMonthRevenue,
      count: existing.count + 1,
      firstMonth: existing.firstMonth + (product.demandForecast[0]?.predictedRevenue || 0),
      lastMonth: existing.lastMonth + (product.demandForecast[product.demandForecast.length - 1]?.predictedRevenue || 0),
    });
  }

  return Array.from(categoryMap.entries()).map(([category, data]) => ({
    category,
    predictedRevenue: data.revenue,
    productCount: data.count,
    trend: data.lastMonth > data.firstMonth * 1.1 ? 'up' : data.lastMonth < data.firstMonth * 0.9 ? 'down' : 'stable',
  }));
}
