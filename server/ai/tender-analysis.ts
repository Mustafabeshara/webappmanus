/**
 * Tender Analysis AI Module
 * SWOT analysis, win probability, and competitive scoring
 */

import { complete } from './service';

export interface TenderAnalysis {
  swot: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  winProbability: {
    score: number;
    confidence: number;
    factors: Array<{
      name: string;
      impact: 'positive' | 'negative' | 'neutral';
      weight: number;
      description: string;
    }>;
  };
  competitiveScore: {
    overall: number;
    breakdown: {
      priceCompetitiveness: number;
      technicalCapability: number;
      deliveryCapacity: number;
      pastPerformance: number;
      compliance: number;
    };
  };
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    action: string;
    rationale: string;
  }>;
  riskAssessment: {
    level: 'low' | 'medium' | 'high' | 'critical';
    factors: string[];
    mitigations: string[];
  };
}

export interface TenderData {
  id: number;
  title: string;
  description?: string | null;
  status: string;
  category?: string | null;
  department?: string | null;
  estimatedValue?: string | null;
  submissionDeadline?: Date | null;
  items?: Array<{
    description: string;
    quantity: number;
    unit: string;
    estimatedPrice?: number;
  }>;
  historicalWinRate?: number;
  totalSimilarTenders?: number;
}

/**
 * Analyze a tender using AI
 */
export async function analyzeTender(tender: TenderData): Promise<{
  success: boolean;
  analysis?: TenderAnalysis;
  error?: string;
  provider?: string;
}> {
  const historicalWinRate = tender.historicalWinRate ?? 50;
  const totalSimilarTenders = tender.totalSimilarTenders ?? 0;

  const itemsList = tender.items?.length
    ? tender.items.map((item, i) => `${i + 1}. ${item.description} (Qty: ${item.quantity} ${item.unit})`).join('\n')
    : 'Not specified';

  const prompt = `You are a tender analysis expert for medical distribution companies in Kuwait. Analyze this tender opportunity and provide comprehensive insights.

**Tender Details:**
- Title: ${tender.title}
- Department: ${tender.department || 'Not specified'}
- Category: ${tender.category || 'Medical Equipment'}
- Estimated Value: ${tender.estimatedValue ? `${tender.estimatedValue} KWD` : 'Not specified'}
- Submission Deadline: ${tender.submissionDeadline ? new Date(tender.submissionDeadline).toLocaleDateString() : 'Not specified'}
- Status: ${tender.status}
- Description: ${tender.description || 'No description provided'}

**Items/Products:**
${itemsList}

**Historical Performance:**
- Win Rate for ${tender.department || 'this department'}: ${historicalWinRate.toFixed(1)}%
- Total Similar Tenders: ${totalSimilarTenders}

**Company Context:**
- Medical equipment distributor in Kuwait
- Primary clients: Ministry of Health, government hospitals
- Strengths: Established relationships, local presence, certified products

**Provide analysis in this EXACT JSON format (no markdown, no code blocks):**
{
  "swot": {
    "strengths": ["strength 1", "strength 2", "strength 3"],
    "weaknesses": ["weakness 1", "weakness 2"],
    "opportunities": ["opportunity 1", "opportunity 2"],
    "threats": ["threat 1", "threat 2"]
  },
  "winProbability": {
    "score": <0-100>,
    "confidence": <0-100>,
    "factors": [
      {
        "name": "factor name",
        "impact": "positive|negative|neutral",
        "weight": <0-100>,
        "description": "brief description"
      }
    ]
  },
  "competitiveScore": {
    "overall": <0-100>,
    "breakdown": {
      "priceCompetitiveness": <0-100>,
      "technicalCapability": <0-100>,
      "deliveryCapacity": <0-100>,
      "pastPerformance": <0-100>,
      "compliance": <0-100>
    }
  },
  "recommendations": [
    {
      "priority": "high|medium|low",
      "action": "specific action to take",
      "rationale": "why this matters"
    }
  ],
  "riskAssessment": {
    "level": "low|medium|high|critical",
    "factors": ["risk factor 1", "risk factor 2"],
    "mitigations": ["mitigation strategy 1", "mitigation strategy 2"]
  }
}`;

  const response = await complete({
    prompt,
    systemPrompt: 'You are a tender analysis expert. Return only valid JSON, no markdown formatting or code blocks.',
    taskType: 'tenderAnalysis',
    temperature: 0.3,
    maxTokens: 3000,
  });

  if (!response.success) {
    // Return fallback analysis if AI fails
    return {
      success: true,
      analysis: getDefaultAnalysis(tender, historicalWinRate, totalSimilarTenders),
      provider: 'fallback',
    };
  }

  try {
    const cleanContent = response.content
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const analysis = JSON.parse(cleanContent) as TenderAnalysis;

    return {
      success: true,
      analysis,
      provider: response.provider,
    };
  } catch {
    // Return fallback analysis if parsing fails
    return {
      success: true,
      analysis: getDefaultAnalysis(tender, historicalWinRate, totalSimilarTenders),
      provider: 'fallback',
    };
  }
}

/**
 * Get default analysis when AI is unavailable
 */
function getDefaultAnalysis(
  tender: TenderData,
  historicalWinRate: number,
  totalDecided: number
): TenderAnalysis {
  return {
    swot: {
      strengths: [
        'Established presence in Kuwait medical market',
        'Strong relationships with Ministry of Health',
        'Certified product portfolio',
      ],
      weaknesses: [
        'Limited historical data for this tender type',
        'Potential capacity constraints',
      ],
      opportunities: [
        'Growing healthcare sector in Kuwait',
        'Government investment in medical infrastructure',
      ],
      threats: [
        'Competitive pricing from international suppliers',
        'Regulatory changes',
      ],
    },
    winProbability: {
      score: Math.round(historicalWinRate),
      confidence: Math.min(60, totalDecided * 5 + 30),
      factors: [
        {
          name: 'Historical Win Rate',
          impact: historicalWinRate > 50 ? 'positive' : 'negative',
          weight: 30,
          description: `Based on ${totalDecided} similar tenders`,
        },
        {
          name: 'Market Position',
          impact: 'positive',
          weight: 25,
          description: 'Established local distributor',
        },
        {
          name: 'Product Availability',
          impact: 'neutral',
          weight: 20,
          description: 'Requires verification of stock levels',
        },
      ],
    },
    competitiveScore: {
      overall: 65,
      breakdown: {
        priceCompetitiveness: 60,
        technicalCapability: 70,
        deliveryCapacity: 65,
        pastPerformance: Math.min(80, historicalWinRate + 10),
        compliance: 75,
      },
    },
    recommendations: [
      {
        priority: 'high',
        action: 'Review pricing strategy against market benchmarks',
        rationale: 'Price is often the deciding factor in government tenders',
      },
      {
        priority: 'medium',
        action: 'Prepare comprehensive technical documentation',
        rationale: 'Demonstrates capability and reduces evaluation risk',
      },
      {
        priority: 'medium',
        action: 'Confirm product availability and lead times',
        rationale: 'Ensures delivery commitments can be met',
      },
    ],
    riskAssessment: {
      level: tender.submissionDeadline && new Date(tender.submissionDeadline) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        ? 'high'
        : 'medium',
      factors: [
        'Competitive market conditions',
        'Timeline constraints',
        'Product specification compliance',
      ],
      mitigations: [
        'Early supplier engagement',
        'Dedicated bid team assignment',
        'Technical review meeting',
      ],
    },
  };
}

/**
 * Analyze tender specifications to find manufacturers and competitors
 */
export async function analyzeSpecifications(params: {
  specifications: string;
  organization?: string;
  country?: string;
  tenderType?: string;
  estimatedValue?: string;
}): Promise<{
  success: boolean;
  manufacturers: Array<{
    name: string;
    country: string;
    productMatch: 'exact' | 'similar' | 'partial';
    matchingProducts: string[];
    strengths?: string[];
    notes?: string;
  }>;
  competitors: Array<{
    name: string;
    type: 'distributor' | 'manufacturer' | 'importer' | 'local_agent';
    country: string;
    marketPresence: 'strong' | 'moderate' | 'emerging';
    competitiveAdvantage?: string[];
    notes?: string;
  }>;
  recommendations: string[];
  confidenceScore: number;
  error?: string;
  provider?: string;
}> {
  const {
    specifications,
    organization = 'Unknown',
    country = 'Kuwait',
    tenderType = 'Medical Equipment',
    estimatedValue = 'Not specified',
  } = params;

  const prompt = `You are an expert medical equipment market analyst. Analyze the following tender specifications and identify potential manufacturers and competitors.

**TENDER SPECIFICATIONS:**
${specifications.substring(0, 15000)}

**TENDER CONTEXT:**
- Organization: ${organization}
- Country: ${country}
- Tender Type: ${tenderType}
- Estimated Value: ${estimatedValue}

**Provide analysis in this EXACT JSON format:**
{
  "manufacturers": [
    {
      "name": "Manufacturer name",
      "country": "Country",
      "productMatch": "exact|similar|partial",
      "matchingProducts": ["Product names"],
      "strengths": ["Key strengths"],
      "notes": "Additional notes"
    }
  ],
  "competitors": [
    {
      "name": "Company name",
      "type": "distributor|manufacturer|importer|local_agent",
      "country": "Country",
      "marketPresence": "strong|moderate|emerging",
      "competitiveAdvantage": ["Their advantages"],
      "notes": "Additional context"
    }
  ],
  "recommendations": [
    "Strategic recommendation 1",
    "Strategic recommendation 2"
  ],
  "confidenceScore": 0.75
}`;

  const response = await complete({
    prompt,
    systemPrompt: 'You are a medical equipment market analyst. Return only valid JSON.',
    taskType: 'tenderAnalysis',
    temperature: 0.3,
    maxTokens: 3000,
  });

  if (!response.success) {
    return {
      success: false,
      manufacturers: [],
      competitors: [],
      recommendations: [],
      confidenceScore: 0,
      error: response.error,
    };
  }

  try {
    const cleanContent = response.content
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const analysis = JSON.parse(cleanContent);

    return {
      success: true,
      manufacturers: analysis.manufacturers || [],
      competitors: analysis.competitors || [],
      recommendations: analysis.recommendations || [],
      confidenceScore: analysis.confidenceScore || 0.7,
      provider: response.provider,
    };
  } catch {
    return {
      success: false,
      manufacturers: [],
      competitors: [],
      recommendations: [],
      confidenceScore: 0,
      error: 'Failed to parse AI response',
    };
  }
}
