/**
 * AI-Powered Inventory Optimization Service
 * Demand forecasting, reorder recommendations, and stock optimization
 */

import { complete } from './service';

export interface InventoryItem {
  id: number;
  productId: number;
  productName: string;
  productSku: string;
  category?: string;
  quantity: number;
  minStockLevel: number;
  maxStockLevel?: number;
  unitPrice?: number;
  expiryDate?: Date | null;
  location?: string;
  lastRestocked?: Date | null;
}

export interface OptimizationResult {
  demandForecast: {
    nextMonth: number;
    next3Months: number;
    next6Months: number;
    confidence: number;
    trend: 'increasing' | 'decreasing' | 'stable' | 'seasonal';
  };
  reorderRecommendations: Array<{
    productId: number;
    productName: string;
    sku: string;
    currentStock: number;
    reorderPoint: number;
    suggestedOrderQty: number;
    urgency: 'critical' | 'high' | 'medium' | 'low';
    estimatedCost: number;
    reason: string;
  }>;
  stockOptimization: {
    overstock: Array<{
      productId: number;
      productName: string;
      excessQty: number;
      tiedUpCapital: number;
      recommendation: string;
    }>;
    understock: Array<{
      productId: number;
      productName: string;
      shortfallQty: number;
      riskLevel: 'high' | 'medium' | 'low';
      recommendation: string;
    }>;
    expiringItems: Array<{
      productId: number;
      productName: string;
      qty: number;
      expiryDate: string;
      daysUntilExpiry: number;
      recommendation: string;
    }>;
  };
  insights: Array<{
    type: 'opportunity' | 'risk' | 'recommendation' | 'trend';
    title: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
    actionable: boolean;
  }>;
  metrics: {
    turnoverRate: number;
    stockoutRisk: number;
    inventoryHealth: number;
    potentialSavings: number;
  };
}

/**
 * Analyze inventory and generate AI-powered optimization recommendations
 */
export async function analyzeInventory(
  inventoryItems: InventoryItem[]
): Promise<OptimizationResult> {
  if (inventoryItems.length === 0) {
    return getEmptyOptimization();
  }

  // Calculate basic statistics
  const totalItems = inventoryItems.reduce((sum, inv) => sum + inv.quantity, 0);
  const totalValue = inventoryItems.reduce(
    (sum, inv) => sum + inv.quantity * (inv.unitPrice || 0),
    0
  );

  // Identify critical items
  const criticalItems = inventoryItems.filter(
    (inv) => inv.quantity <= inv.minStockLevel
  );

  const lowStockItems = inventoryItems.filter(
    (inv) => inv.quantity <= inv.minStockLevel * 1.5 && inv.quantity > inv.minStockLevel
  );

  const overstockItems = inventoryItems.filter(
    (inv) => inv.maxStockLevel && inv.quantity > inv.maxStockLevel
  );

  // Items expiring within 30 days
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  const expiringItems = inventoryItems.filter(
    (inv) => inv.expiryDate && new Date(inv.expiryDate) <= thirtyDaysFromNow
  );

  // Build AI prompt
  const prompt = buildOptimizationPrompt(
    inventoryItems,
    criticalItems,
    lowStockItems,
    overstockItems,
    expiringItems,
    totalItems,
    totalValue
  );

  const systemPrompt = `You are an inventory optimization AI for a medical equipment distribution company.
Analyze inventory data and provide actionable recommendations for:
1. Demand forecasting
2. Reorder point optimization
3. Stock level balancing
4. Expiry management
5. Cost optimization

Return ONLY valid JSON matching the exact structure requested. No markdown, no explanations.`;

  try {
    const response = await complete({
      prompt,
      systemPrompt,
      maxTokens: 4000,
      temperature: 0.3,
      taskType: 'analysis',
    });

    if (!response.success) {
      console.warn('[Inventory AI] AI analysis failed, using fallback:', response.error);
      return generateFallbackOptimization(
        inventoryItems,
        criticalItems,
        lowStockItems,
        overstockItems,
        expiringItems,
        totalValue
      );
    }

    try {
      const cleanContent = response.content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      const parsed = JSON.parse(cleanContent);
      return validateAndNormalizeResult(parsed);
    } catch (parseError) {
      console.warn('[Inventory AI] Failed to parse AI response:', parseError);
      return generateFallbackOptimization(
        inventoryItems,
        criticalItems,
        lowStockItems,
        overstockItems,
        expiringItems,
        totalValue
      );
    }
  } catch (error) {
    console.error('[Inventory AI] Error:', error);
    return generateFallbackOptimization(
      inventoryItems,
      criticalItems,
      lowStockItems,
      overstockItems,
      expiringItems,
      totalValue
    );
  }
}

function buildOptimizationPrompt(
  inventory: InventoryItem[],
  criticalItems: InventoryItem[],
  lowStockItems: InventoryItem[],
  overstockItems: InventoryItem[],
  expiringItems: InventoryItem[],
  totalItems: number,
  totalValue: number
): string {
  return `Analyze this inventory data for a medical equipment distributor:

**Current Inventory Overview:**
- Total Items: ${totalItems}
- Total Value: $${(totalValue / 100).toFixed(2)}
- Unique Products: ${inventory.length}
- Critical Low Stock: ${criticalItems.length} items
- Low Stock Warning: ${lowStockItems.length} items
- Overstocked: ${overstockItems.length} items
- Expiring Soon (30 days): ${expiringItems.length} items

**Critical Items (Below Minimum Stock):**
${criticalItems.slice(0, 10).map((inv) => `
- ${inv.productName} (${inv.productSku})
  Stock: ${inv.quantity} / Min: ${inv.minStockLevel}
  Category: ${inv.category || 'General'}
  Unit Price: $${((inv.unitPrice || 0) / 100).toFixed(2)}
`).join('')}

**Overstocked Items:**
${overstockItems.slice(0, 5).map((inv) => `
- ${inv.productName}: ${inv.quantity} (Max: ${inv.maxStockLevel})
  Excess: ${inv.quantity - (inv.maxStockLevel || 0)} units
`).join('') || 'None'}

**Expiring Items:**
${expiringItems.slice(0, 5).map((inv) => `
- ${inv.productName}: ${inv.quantity} units expiring ${inv.expiryDate ? new Date(inv.expiryDate).toLocaleDateString() : 'soon'}
`).join('') || 'None'}

**Return this exact JSON structure:**
{
  "demandForecast": {
    "nextMonth": <number>,
    "next3Months": <number>,
    "next6Months": <number>,
    "confidence": <0-100>,
    "trend": "increasing|decreasing|stable|seasonal"
  },
  "reorderRecommendations": [
    {
      "productId": <number>,
      "productName": "string",
      "sku": "string",
      "currentStock": <number>,
      "reorderPoint": <number>,
      "suggestedOrderQty": <number>,
      "urgency": "critical|high|medium|low",
      "estimatedCost": <number in cents>,
      "reason": "brief reason"
    }
  ],
  "stockOptimization": {
    "overstock": [
      {
        "productId": <number>,
        "productName": "string",
        "excessQty": <number>,
        "tiedUpCapital": <number in cents>,
        "recommendation": "what to do"
      }
    ],
    "understock": [
      {
        "productId": <number>,
        "productName": "string",
        "shortfallQty": <number>,
        "riskLevel": "high|medium|low",
        "recommendation": "what to do"
      }
    ],
    "expiringItems": [
      {
        "productId": <number>,
        "productName": "string",
        "qty": <number>,
        "expiryDate": "YYYY-MM-DD",
        "daysUntilExpiry": <number>,
        "recommendation": "what to do"
      }
    ]
  },
  "insights": [
    {
      "type": "opportunity|risk|recommendation|trend",
      "title": "brief title",
      "description": "detailed insight",
      "impact": "high|medium|low",
      "actionable": true|false
    }
  ],
  "metrics": {
    "turnoverRate": <0-10>,
    "stockoutRisk": <0-100>,
    "inventoryHealth": <0-100>,
    "potentialSavings": <number in cents>
  }
}`;
}

function generateFallbackOptimization(
  inventory: InventoryItem[],
  criticalItems: InventoryItem[],
  lowStockItems: InventoryItem[],
  overstockItems: InventoryItem[],
  expiringItems: InventoryItem[],
  totalValue: number
): OptimizationResult {
  const now = new Date();
  const totalStock = inventory.reduce((sum, inv) => sum + inv.quantity, 0);

  return {
    demandForecast: {
      nextMonth: Math.round(totalStock * 0.15),
      next3Months: Math.round(totalStock * 0.45),
      next6Months: Math.round(totalStock * 0.9),
      confidence: 60,
      trend: 'stable',
    },
    reorderRecommendations: criticalItems.slice(0, 10).map((inv) => ({
      productId: inv.productId,
      productName: inv.productName,
      sku: inv.productSku,
      currentStock: inv.quantity,
      reorderPoint: inv.minStockLevel,
      suggestedOrderQty: Math.max(
        (inv.maxStockLevel || inv.minStockLevel * 3) - inv.quantity,
        inv.minStockLevel
      ),
      urgency: inv.quantity === 0 ? 'critical' as const :
               inv.quantity < inv.minStockLevel * 0.5 ? 'high' as const : 'medium' as const,
      estimatedCost: ((inv.maxStockLevel || inv.minStockLevel * 3) - inv.quantity) * (inv.unitPrice || 0),
      reason: `Stock ${inv.quantity} below minimum ${inv.minStockLevel}`,
    })),
    stockOptimization: {
      overstock: overstockItems.slice(0, 5).map((inv) => ({
        productId: inv.productId,
        productName: inv.productName,
        excessQty: inv.quantity - (inv.maxStockLevel || 0),
        tiedUpCapital: (inv.quantity - (inv.maxStockLevel || 0)) * (inv.unitPrice || 0),
        recommendation: 'Consider promotional pricing or redistribution',
      })),
      understock: lowStockItems.slice(0, 5).map((inv) => ({
        productId: inv.productId,
        productName: inv.productName,
        shortfallQty: inv.minStockLevel - inv.quantity,
        riskLevel: inv.quantity === 0 ? 'high' as const : 'medium' as const,
        recommendation: 'Place reorder immediately',
      })),
      expiringItems: expiringItems.slice(0, 5).map((inv) => {
        const expiry = inv.expiryDate ? new Date(inv.expiryDate) : now;
        const daysUntil = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return {
          productId: inv.productId,
          productName: inv.productName,
          qty: inv.quantity,
          expiryDate: inv.expiryDate?.toISOString().split('T')[0] || '',
          daysUntilExpiry: Math.max(0, daysUntil),
          recommendation: daysUntil < 7 ? 'Urgent: Consider returns or disposal' : 'Prioritize for upcoming orders',
        };
      }),
    },
    insights: [
      ...(criticalItems.length > 0 ? [{
        type: 'risk' as const,
        title: `${criticalItems.length} Critical Stock Items`,
        description: `${criticalItems.length} products are below minimum stock levels and need immediate attention.`,
        impact: 'high' as const,
        actionable: true,
      }] : []),
      ...(expiringItems.length > 0 ? [{
        type: 'risk' as const,
        title: `${expiringItems.length} Items Expiring Soon`,
        description: `${expiringItems.length} products will expire within 30 days. Consider promotional sales or returns.`,
        impact: 'medium' as const,
        actionable: true,
      }] : []),
      ...(overstockItems.length > 0 ? [{
        type: 'opportunity' as const,
        title: 'Capital Optimization Opportunity',
        description: `${overstockItems.length} overstocked items are tying up capital. Consider redistribution.`,
        impact: 'medium' as const,
        actionable: true,
      }] : []),
      {
        type: 'recommendation' as const,
        title: 'Regular Stock Review',
        description: 'Schedule weekly inventory reviews to maintain optimal stock levels.',
        impact: 'low' as const,
        actionable: true,
      },
    ],
    metrics: {
      turnoverRate: 4.2,
      stockoutRisk: Math.min(100, (criticalItems.length / Math.max(1, inventory.length)) * 100 * 2),
      inventoryHealth: Math.max(0, 100 - (criticalItems.length * 5) - (expiringItems.length * 3) - (overstockItems.length * 2)),
      potentialSavings: overstockItems.reduce((sum, inv) =>
        sum + ((inv.quantity - (inv.maxStockLevel || 0)) * (inv.unitPrice || 0) * 0.1),
        0
      ),
    },
  };
}

function getEmptyOptimization(): OptimizationResult {
  return {
    demandForecast: {
      nextMonth: 0,
      next3Months: 0,
      next6Months: 0,
      confidence: 0,
      trend: 'stable',
    },
    reorderRecommendations: [],
    stockOptimization: {
      overstock: [],
      understock: [],
      expiringItems: [],
    },
    insights: [{
      type: 'recommendation',
      title: 'No inventory data',
      description: 'Add inventory items to get AI optimization insights',
      impact: 'high',
      actionable: true,
    }],
    metrics: {
      turnoverRate: 0,
      stockoutRisk: 0,
      inventoryHealth: 0,
      potentialSavings: 0,
    },
  };
}

function validateAndNormalizeResult(parsed: any): OptimizationResult {
  // Validate and fill in defaults for missing fields
  return {
    demandForecast: {
      nextMonth: parsed.demandForecast?.nextMonth ?? 0,
      next3Months: parsed.demandForecast?.next3Months ?? 0,
      next6Months: parsed.demandForecast?.next6Months ?? 0,
      confidence: parsed.demandForecast?.confidence ?? 50,
      trend: parsed.demandForecast?.trend ?? 'stable',
    },
    reorderRecommendations: Array.isArray(parsed.reorderRecommendations)
      ? parsed.reorderRecommendations
      : [],
    stockOptimization: {
      overstock: Array.isArray(parsed.stockOptimization?.overstock)
        ? parsed.stockOptimization.overstock
        : [],
      understock: Array.isArray(parsed.stockOptimization?.understock)
        ? parsed.stockOptimization.understock
        : [],
      expiringItems: Array.isArray(parsed.stockOptimization?.expiringItems)
        ? parsed.stockOptimization.expiringItems
        : [],
    },
    insights: Array.isArray(parsed.insights) ? parsed.insights : [],
    metrics: {
      turnoverRate: parsed.metrics?.turnoverRate ?? 0,
      stockoutRisk: parsed.metrics?.stockoutRisk ?? 0,
      inventoryHealth: parsed.metrics?.inventoryHealth ?? 50,
      potentialSavings: parsed.metrics?.potentialSavings ?? 0,
    },
  };
}
