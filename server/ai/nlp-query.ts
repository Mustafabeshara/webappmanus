/**
 * NLP Query Interface
 *
 * Translates natural language queries into structured database operations.
 * Supports conversational queries like:
 * - "Show me all medical equipment under $5000"
 * - "Find tenders due next week"
 * - "What products did we buy from MedSupply last month?"
 */

import { complete } from './service';

// Query intent types
export type QueryIntent =
  | 'search_products'
  | 'search_tenders'
  | 'search_suppliers'
  | 'search_documents'
  | 'get_statistics'
  | 'compare_items'
  | 'get_recommendations'
  | 'filter_by_date'
  | 'filter_by_price'
  | 'filter_by_category'
  | 'aggregate_data'
  | 'unknown';

// Parsed query structure
export interface ParsedQuery {
  intent: QueryIntent;
  entities: QueryEntity[];
  filters: QueryFilter[];
  sort?: QuerySort;
  limit?: number;
  aggregation?: QueryAggregation;
  originalQuery: string;
  confidence: number;
}

// Entity extracted from query
export interface QueryEntity {
  type: 'product' | 'tender' | 'supplier' | 'document' | 'category' | 'date' | 'price' | 'quantity';
  value: string;
  confidence: number;
}

// Filter condition
export interface QueryFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'startsWith' | 'endsWith' | 'between';
  value: any;
  value2?: any; // For 'between' operator
}

// Sort specification
export interface QuerySort {
  field: string;
  direction: 'asc' | 'desc';
}

// Aggregation specification
export interface QueryAggregation {
  type: 'count' | 'sum' | 'avg' | 'min' | 'max' | 'group';
  field?: string;
  groupBy?: string;
}

// Query response
export interface NLPQueryResponse {
  success: boolean;
  parsedQuery: ParsedQuery;
  suggestedSQL?: string;
  explanation: string;
  alternativeInterpretations?: ParsedQuery[];
}

/**
 * Pattern-based query parser (fast, no AI needed)
 */
function patternBasedParse(query: string): ParsedQuery | null {
  const q = query.toLowerCase().trim();

  // Initialize default parsed query
  const parsed: ParsedQuery = {
    intent: 'unknown',
    entities: [],
    filters: [],
    originalQuery: query,
    confidence: 0.5,
  };

  // Detect intent patterns
  const intentPatterns: Record<QueryIntent, RegExp[]> = {
    search_products: [
      /(?:show|find|list|get|search).*(?:product|item|equipment|device)/i,
      /(?:what|which).*(?:product|item|equipment)/i,
      /(?:product|item|equipment).*(?:list|catalog)/i,
    ],
    search_tenders: [
      /(?:show|find|list|get|search).*tender/i,
      /(?:what|which).*tender/i,
      /(?:upcoming|active|open).*tender/i,
      /tender.*(?:due|deadline|closing)/i,
    ],
    search_suppliers: [
      /(?:show|find|list|get|search).*(?:supplier|vendor)/i,
      /(?:what|which).*(?:supplier|vendor)/i,
      /(?:who|whom).*(?:supply|provide|sell)/i,
    ],
    search_documents: [
      /(?:show|find|list|get|search).*(?:document|file|catalog|pdf)/i,
      /(?:what|which).*(?:document|file)/i,
    ],
    get_statistics: [
      /(?:how many|count|total|number of)/i,
      /(?:statistics|stats|summary|overview)/i,
    ],
    compare_items: [
      /(?:compare|difference|versus|vs)/i,
      /(?:better|best|worst|cheaper|expensive)/i,
    ],
    get_recommendations: [
      /(?:recommend|suggest|best|top)/i,
      /(?:what should|which should)/i,
    ],
    filter_by_date: [
      /(?:due|deadline|expires?|closing).*(?:today|tomorrow|this week|next week|this month)/i,
      /(?:created|added|modified).*(?:today|yesterday|last week|last month)/i,
    ],
    filter_by_price: [
      /(?:under|below|less than|cheaper than)\s*\$?\d+/i,
      /(?:over|above|more than|expensive)\s*\$?\d+/i,
      /(?:between|from)\s*\$?\d+.*(?:to|and)\s*\$?\d+/i,
      /(?:price|cost|budget)/i,
    ],
    filter_by_category: [
      /(?:in|from|category|type)\s+(?:medical|surgical|diagnostic|laboratory)/i,
      /(?:medical|surgical|diagnostic|laboratory).*(?:equipment|device|product)/i,
    ],
    aggregate_data: [
      /(?:total|sum|average|avg|minimum|min|maximum|max)/i,
      /(?:group by|grouped by|per|by category)/i,
    ],
    unknown: [],
  };

  // Find best matching intent
  let bestIntent: QueryIntent = 'unknown';
  let bestScore = 0;

  for (const [intent, patterns] of Object.entries(intentPatterns) as [QueryIntent, RegExp[]][]) {
    for (const pattern of patterns) {
      if (pattern.test(q)) {
        const score = pattern.source.length / 100; // Longer patterns = more specific
        if (score > bestScore) {
          bestScore = score;
          bestIntent = intent;
        }
      }
    }
  }

  parsed.intent = bestIntent;
  parsed.confidence = Math.min(0.5 + bestScore, 0.9);

  // Extract entities

  // Price extraction
  const priceMatch = q.match(/\$?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/);
  if (priceMatch) {
    const price = parseFloat(priceMatch[1].replace(/,/g, ''));
    parsed.entities.push({
      type: 'price',
      value: String(price),
      confidence: 0.9,
    });

    // Determine filter operator
    if (/under|below|less than|cheaper|maximum|max|up to/.test(q)) {
      parsed.filters.push({ field: 'price', operator: 'lte', value: price * 100 }); // Convert to cents
    } else if (/over|above|more than|expensive|minimum|min|at least/.test(q)) {
      parsed.filters.push({ field: 'price', operator: 'gte', value: price * 100 });
    }
  }

  // Date extraction
  const datePatterns: Record<string, () => Date> = {
    'today': () => new Date(),
    'tomorrow': () => { const d = new Date(); d.setDate(d.getDate() + 1); return d; },
    'yesterday': () => { const d = new Date(); d.setDate(d.getDate() - 1); return d; },
    'this week': () => { const d = new Date(); d.setDate(d.getDate() + 7); return d; },
    'next week': () => { const d = new Date(); d.setDate(d.getDate() + 14); return d; },
    'this month': () => { const d = new Date(); d.setMonth(d.getMonth() + 1); return d; },
    'next month': () => { const d = new Date(); d.setMonth(d.getMonth() + 2); return d; },
    'last week': () => { const d = new Date(); d.setDate(d.getDate() - 7); return d; },
    'last month': () => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d; },
  };

  for (const [datePhrase, getDate] of Object.entries(datePatterns)) {
    if (q.includes(datePhrase)) {
      const date = getDate();
      parsed.entities.push({
        type: 'date',
        value: date.toISOString(),
        confidence: 0.85,
      });

      // Add date filter
      if (/due|deadline|expires?|closing/.test(q)) {
        parsed.filters.push({ field: 'deadline', operator: 'lte', value: date });
      } else if (/created|added/.test(q)) {
        parsed.filters.push({ field: 'createdAt', operator: 'gte', value: date });
      }
      break;
    }
  }

  // Category extraction
  const categories = [
    'medical', 'surgical', 'diagnostic', 'laboratory', 'imaging',
    'cardiac', 'respiratory', 'orthopedic', 'dental', 'ophthalmology',
    'patient monitoring', 'sterilization', 'emergency', 'rehabilitation',
  ];

  for (const category of categories) {
    if (q.includes(category)) {
      parsed.entities.push({
        type: 'category',
        value: category,
        confidence: 0.9,
      });
      parsed.filters.push({ field: 'category', operator: 'contains', value: category });
    }
  }

  // Limit extraction
  const limitMatch = q.match(/(?:top|first|show|limit)\s*(\d+)/i);
  if (limitMatch) {
    parsed.limit = parseInt(limitMatch[1], 10);
  }

  // Sort extraction
  if (/(?:cheapest|lowest price|least expensive)/.test(q)) {
    parsed.sort = { field: 'price', direction: 'asc' };
  } else if (/(?:most expensive|highest price)/.test(q)) {
    parsed.sort = { field: 'price', direction: 'desc' };
  } else if (/(?:newest|latest|recent|most recent)/.test(q)) {
    parsed.sort = { field: 'createdAt', direction: 'desc' };
  } else if (/(?:oldest|earliest)/.test(q)) {
    parsed.sort = { field: 'createdAt', direction: 'asc' };
  } else if (/(?:due soon|soonest|earliest deadline)/.test(q)) {
    parsed.sort = { field: 'deadline', direction: 'asc' };
  }

  // Aggregation extraction
  if (/how many|count|number of/.test(q)) {
    parsed.aggregation = { type: 'count' };
  } else if (/total.*(?:price|cost|value|amount)/.test(q)) {
    parsed.aggregation = { type: 'sum', field: 'price' };
  } else if (/average.*(?:price|cost)/.test(q)) {
    parsed.aggregation = { type: 'avg', field: 'price' };
  } else if (/(?:group by|by category|per category)/.test(q)) {
    parsed.aggregation = { type: 'group', groupBy: 'category' };
  }

  return parsed.intent !== 'unknown' ? parsed : null;
}

/**
 * AI-powered query parser (more accurate, requires AI)
 */
async function aiParse(query: string): Promise<ParsedQuery | null> {
  const prompt = `Parse the following natural language query into a structured format.

Query: "${query}"

Respond in this exact JSON format:
{
  "intent": "search_products|search_tenders|search_suppliers|search_documents|get_statistics|compare_items|get_recommendations|filter_by_date|filter_by_price|filter_by_category|aggregate_data|unknown",
  "entities": [{"type": "product|tender|supplier|category|date|price", "value": "extracted value"}],
  "filters": [{"field": "fieldName", "operator": "eq|gt|lt|contains", "value": "filterValue"}],
  "sort": {"field": "fieldName", "direction": "asc|desc"} or null,
  "limit": number or null,
  "confidence": 0.0-1.0
}

JSON only:`;

  try {
    const response = await complete({
      prompt,
      maxTokens: 500,
      temperature: 0.1,
      taskType: 'fast_analysis',
    });

    if (response.success && response.content) {
      // Extract JSON from response
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          ...parsed,
          originalQuery: query,
          confidence: parsed.confidence || 0.7,
        };
      }
    }
  } catch (error) {
    console.error('[NLP] AI parsing failed:', error);
  }

  return null;
}

/**
 * Main NLP query parser
 * Uses pattern matching first, falls back to AI for complex queries
 */
export async function parseNaturalLanguageQuery(query: string): Promise<NLPQueryResponse> {
  // Try pattern-based parsing first (fast)
  const patternParsed = patternBasedParse(query);

  if (patternParsed && patternParsed.confidence >= 0.7) {
    return {
      success: true,
      parsedQuery: patternParsed,
      explanation: generateExplanation(patternParsed),
      suggestedSQL: generateSuggestedSQL(patternParsed),
    };
  }

  // Try AI parsing for complex queries
  const aiParsed = await aiParse(query);

  if (aiParsed) {
    return {
      success: true,
      parsedQuery: aiParsed,
      explanation: generateExplanation(aiParsed),
      suggestedSQL: generateSuggestedSQL(aiParsed),
      alternativeInterpretations: patternParsed ? [patternParsed] : undefined,
    };
  }

  // Return pattern parsed result even if low confidence
  if (patternParsed) {
    return {
      success: true,
      parsedQuery: patternParsed,
      explanation: generateExplanation(patternParsed),
      suggestedSQL: generateSuggestedSQL(patternParsed),
    };
  }

  // Unable to parse
  return {
    success: false,
    parsedQuery: {
      intent: 'unknown',
      entities: [],
      filters: [],
      originalQuery: query,
      confidence: 0,
    },
    explanation: 'Unable to understand the query. Try rephrasing or use simpler terms.',
  };
}

/**
 * Generate human-readable explanation of parsed query
 */
function generateExplanation(parsed: ParsedQuery): string {
  const parts: string[] = [];

  // Intent explanation
  const intentDescriptions: Record<QueryIntent, string> = {
    search_products: 'Searching for products',
    search_tenders: 'Searching for tenders',
    search_suppliers: 'Searching for suppliers',
    search_documents: 'Searching for documents',
    get_statistics: 'Getting statistics',
    compare_items: 'Comparing items',
    get_recommendations: 'Getting recommendations',
    filter_by_date: 'Filtering by date',
    filter_by_price: 'Filtering by price',
    filter_by_category: 'Filtering by category',
    aggregate_data: 'Aggregating data',
    unknown: 'Unknown query type',
  };

  parts.push(intentDescriptions[parsed.intent]);

  // Filters explanation
  if (parsed.filters.length > 0) {
    const filterDescs = parsed.filters.map(f => {
      const opDescs: Record<string, string> = {
        eq: 'equals',
        ne: 'not equals',
        gt: 'greater than',
        gte: 'at least',
        lt: 'less than',
        lte: 'at most',
        contains: 'contains',
        startsWith: 'starts with',
        endsWith: 'ends with',
        between: 'between',
      };
      return `${f.field} ${opDescs[f.operator] || f.operator} ${f.value}`;
    });
    parts.push(`with filters: ${filterDescs.join(', ')}`);
  }

  // Sort explanation
  if (parsed.sort) {
    parts.push(`sorted by ${parsed.sort.field} (${parsed.sort.direction})`);
  }

  // Limit explanation
  if (parsed.limit) {
    parts.push(`limited to ${parsed.limit} results`);
  }

  // Aggregation explanation
  if (parsed.aggregation) {
    if (parsed.aggregation.type === 'group') {
      parts.push(`grouped by ${parsed.aggregation.groupBy}`);
    } else {
      parts.push(`calculating ${parsed.aggregation.type}${parsed.aggregation.field ? ` of ${parsed.aggregation.field}` : ''}`);
    }
  }

  return parts.join(' ');
}

/**
 * Generate suggested SQL query (for reference/debugging)
 */
function generateSuggestedSQL(parsed: ParsedQuery): string {
  const tableMap: Record<string, string> = {
    search_products: 'products',
    search_tenders: 'tenders',
    search_suppliers: 'suppliers',
    search_documents: 'documents',
  };

  const table = tableMap[parsed.intent] || 'products';
  let sql = `SELECT * FROM ${table}`;

  // WHERE clause
  if (parsed.filters.length > 0) {
    const conditions = parsed.filters.map(f => {
      const opMap: Record<string, string> = {
        eq: '=',
        ne: '!=',
        gt: '>',
        gte: '>=',
        lt: '<',
        lte: '<=',
        contains: 'LIKE',
        startsWith: 'LIKE',
        endsWith: 'LIKE',
      };
      const op = opMap[f.operator] || '=';
      let value = f.value;

      if (f.operator === 'contains') value = `%${value}%`;
      if (f.operator === 'startsWith') value = `${value}%`;
      if (f.operator === 'endsWith') value = `%${value}`;

      return `${f.field} ${op} '${value}'`;
    });
    sql += ` WHERE ${conditions.join(' AND ')}`;
  }

  // ORDER BY clause
  if (parsed.sort) {
    sql += ` ORDER BY ${parsed.sort.field} ${parsed.sort.direction.toUpperCase()}`;
  }

  // LIMIT clause
  if (parsed.limit) {
    sql += ` LIMIT ${parsed.limit}`;
  }

  return sql;
}

/**
 * Generate query suggestions based on partial input
 */
export function getQuerySuggestions(partialQuery: string): string[] {
  const q = partialQuery.toLowerCase();
  const suggestions: string[] = [];

  // Common query templates
  const templates = [
    'Show me all {category} equipment',
    'Find tenders due this week',
    'List products under ${price}',
    'What are the top 10 {category} products?',
    'Compare prices from different suppliers',
    'Show me invoices from last month',
    'Find suppliers who provide {category}',
    'What products need restocking?',
    'Show recent tenders in {department}',
    'Get total inventory value',
  ];

  // Filter templates based on partial input
  for (const template of templates) {
    if (template.toLowerCase().includes(q) || q.split(' ').some(word => template.toLowerCase().includes(word))) {
      suggestions.push(template);
    }
  }

  // Add category-specific suggestions
  if (q.includes('medical') || q.includes('product') || q.includes('equipment')) {
    suggestions.push(
      'Show me medical monitoring equipment',
      'List surgical instruments under $5000',
      'Find diagnostic equipment from approved suppliers',
    );
  }

  if (q.includes('tender') || q.includes('deadline') || q.includes('due')) {
    suggestions.push(
      'Find tenders due this week',
      'Show active tenders in healthcare',
      'List tenders with deadline next month',
    );
  }

  return [...new Set(suggestions)].slice(0, 5);
}
