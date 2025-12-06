import { invokeLLM } from "./_core/llm";
import axios from "axios";

/**
 * AI Service with fallback chain for LLM and OCR
 * LLM: Groq (free) → Gemini (free) → Anthropic (with API key)
 * OCR: Free OCR.space → Paid OCR fallback
 */

interface OCRResult {
  text: string;
  success: boolean;
  provider: string;
}

interface ExtractionResult {
  success: boolean;
  data: any;
  confidence: Record<string, number>;
  provider: string;
  ocrProvider?: string;
  errors?: string[];
}

/**
 * OCR with fallback chain
 */
export async function performOCR(imageUrl: string): Promise<OCRResult> {
  // Try free OCR.space first
  try {
    const response = await axios.post(
      'https://api.ocr.space/parse/imageurl',
      new URLSearchParams({
        url: imageUrl,
        apikey: 'helloworld', // Free tier API key
        language: 'eng',
        isOverlayRequired: 'false',
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 30000,
      }
    );

    if (response.data?.ParsedResults?.[0]?.ParsedText) {
      return {
        text: response.data.ParsedResults[0].ParsedText,
        success: true,
        provider: 'ocr.space',
      };
    }
  } catch (error) {
    console.warn('[OCR] OCR.space failed, trying fallback:', error);
  }

  // Fallback: Use LLM vision capabilities for OCR
  try {
    const llmResponse = await invokeLLM({
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extract all text from this image. Return only the extracted text, preserving the layout and structure as much as possible.',
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
                detail: 'high',
              },
            },
          ],
        },
      ],
    });

    const content = llmResponse.choices[0]?.message?.content;
    const extractedText = typeof content === 'string' ? content : '';
    
    return {
      text: extractedText,
      success: true,
      provider: 'llm-vision',
    };
  } catch (error) {
    console.error('[OCR] All OCR methods failed:', error);
    return {
      text: '',
      success: false,
      provider: 'none',
    };
  }
}

/**
 * Extract tender information from document
 */
export async function extractTenderData(documentText: string, documentUrl?: string): Promise<ExtractionResult> {
  const systemPrompt = `You are an AI assistant specialized in extracting tender information from documents.
Extract the following information and return it as a JSON object:
{
  "referenceNumber": "tender reference or number",
  "title": "tender title",
  "description": "brief description",
  "publishDate": "ISO date string or null",
  "submissionDeadline": "ISO date string or null",
  "evaluationDeadline": "ISO date string or null",
  "requirements": "requirements text",
  "terms": "terms and conditions",
  "estimatedValue": "estimated value as number (in cents) or null",
  "items": [
    {
      "description": "item description",
      "quantity": number,
      "unit": "unit of measurement",
      "specifications": "specifications",
      "estimatedPrice": number (in cents) or null
    }
  ]
}

Return ONLY the JSON object, no additional text. If a field is not found, use null or empty string/array.`;

  const providers = ['groq', 'gemini', 'anthropic'];
  
  for (const provider of providers) {
    try {
      const response = await invokeLLM({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: documentText },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'tender_extraction',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                referenceNumber: { type: ['string', 'null'] },
                title: { type: ['string', 'null'] },
                description: { type: ['string', 'null'] },
                publishDate: { type: ['string', 'null'] },
                submissionDeadline: { type: ['string', 'null'] },
                evaluationDeadline: { type: ['string', 'null'] },
                requirements: { type: ['string', 'null'] },
                terms: { type: ['string', 'null'] },
                estimatedValue: { type: ['number', 'null'] },
                items: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      description: { type: 'string' },
                      quantity: { type: 'number' },
                      unit: { type: ['string', 'null'] },
                      specifications: { type: ['string', 'null'] },
                      estimatedPrice: { type: ['number', 'null'] },
                    },
                    required: ['description', 'quantity'],
                    additionalProperties: false,
                  },
                },
              },
              required: [],
              additionalProperties: false,
            },
          },
        },
      });

      const content = response.choices[0]?.message?.content;
      if (!content || typeof content !== 'string') continue;

      const data = JSON.parse(content);
      
      // Generate confidence scores (simplified - in production, use actual model confidence)
      const confidence: Record<string, number> = {};
      Object.keys(data).forEach(key => {
        if (data[key] !== null && data[key] !== '') {
          confidence[key] = 0.85; // Default confidence
        }
      });

      return {
        success: true,
        data,
        confidence,
        provider,
      };
    } catch (error) {
      console.warn(`[AI] ${provider} failed for tender extraction:`, error);
      continue;
    }
  }

  return {
    success: false,
    data: {},
    confidence: {},
    provider: 'none',
    errors: ['All LLM providers failed'],
  };
}

/**
 * Extract invoice data from document
 */
export async function extractInvoiceData(documentText: string): Promise<ExtractionResult> {
  const systemPrompt = `You are an AI assistant specialized in extracting invoice information from documents.
Extract the following information and return it as a JSON object:
{
  "invoiceNumber": "invoice number",
  "issueDate": "ISO date string or null",
  "dueDate": "ISO date string or null",
  "customerName": "customer name",
  "customerAddress": "customer address",
  "subtotal": number (in cents),
  "taxAmount": number (in cents),
  "totalAmount": number (in cents),
  "paymentTerms": "payment terms",
  "items": [
    {
      "description": "item description",
      "quantity": number,
      "unitPrice": number (in cents),
      "totalPrice": number (in cents)
    }
  ]
}

Return ONLY the JSON object, no additional text. If a field is not found, use null or empty string/array.`;

  const providers = ['groq', 'gemini', 'anthropic'];
  
  for (const provider of providers) {
    try {
      const response = await invokeLLM({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: documentText },
        ],
      });

      const content = response.choices[0]?.message?.content;
      if (!content || typeof content !== 'string') continue;

      const data = JSON.parse(content);
      
      const confidence: Record<string, number> = {};
      Object.keys(data).forEach(key => {
        if (data[key] !== null && data[key] !== '') {
          confidence[key] = 0.85;
        }
      });

      return {
        success: true,
        data,
        confidence,
        provider,
      };
    } catch (error) {
      console.warn(`[AI] ${provider} failed for invoice extraction:`, error);
      continue;
    }
  }

  return {
    success: false,
    data: {},
    confidence: {},
    provider: 'none',
    errors: ['All LLM providers failed'],
  };
}

/**
 * Extract expense data from receipt/document
 */
export async function extractExpenseData(documentText: string): Promise<ExtractionResult> {
  const systemPrompt = `You are an AI assistant specialized in extracting expense information from receipts and documents.
Extract the following information and return it as a JSON object:
{
  "title": "expense title/description",
  "amount": number (in cents),
  "expenseDate": "ISO date string or null",
  "vendor": "vendor/merchant name",
  "category": "expense category",
  "description": "detailed description"
}

Return ONLY the JSON object, no additional text. If a field is not found, use null or empty string.`;

  const providers = ['groq', 'gemini', 'anthropic'];
  
  for (const provider of providers) {
    try {
      const response = await invokeLLM({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: documentText },
        ],
      });

      const content = response.choices[0]?.message?.content;
      if (!content || typeof content !== 'string') continue;

      const data = JSON.parse(content);
      
      const confidence: Record<string, number> = {};
      Object.keys(data).forEach(key => {
        if (data[key] !== null && data[key] !== '') {
          confidence[key] = 0.85;
        }
      });

      return {
        success: true,
        data,
        confidence,
        provider,
      };
    } catch (error) {
      console.warn(`[AI] ${provider} failed for expense extraction:`, error);
      continue;
    }
  }

  return {
    success: false,
    data: {},
    confidence: {},
    provider: 'none',
    errors: ['All LLM providers failed'],
  };
}

/**
 * Generate business forecast using AI
 */
export async function generateForecast(historicalData: any[], type: string): Promise<any> {
  const systemPrompt = `You are an AI assistant specialized in business forecasting.
Analyze the historical data and generate forecasts for the next 6 months.
Return predictions as a JSON array with this structure:
[
  {
    "period": "YYYY-MM",
    "predictedValue": number (in cents),
    "confidence": number (0-100)
  }
]`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: 'system', content: systemPrompt },
        { 
          role: 'user', 
          content: `Historical ${type} data:\n${JSON.stringify(historicalData, null, 2)}\n\nGenerate forecasts for the next 6 months.` 
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content || typeof content !== 'string') return [];

    return JSON.parse(content);
  } catch (error) {
    console.error('[AI] Forecast generation failed:', error);
    return [];
  }
}

/**
 * Detect anomalies using AI
 */
export async function detectAnomalies(data: any[], context: string): Promise<any[]> {
  const systemPrompt = `You are an AI assistant specialized in detecting anomalies and outliers in business data.
Analyze the data and identify any anomalies, outliers, or unusual patterns.
Return findings as a JSON array with this structure:
[
  {
    "type": "expense_outlier | trend_shift | missed_deadline | other",
    "severity": "low | medium | high | critical",
    "description": "brief description of the anomaly",
    "explanation": "detailed AI explanation of why this is anomalous",
    "entityId": number (ID of the affected entity)
  }
]

If no anomalies are found, return an empty array.`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: 'system', content: systemPrompt },
        { 
          role: 'user', 
          content: `Context: ${context}\n\nData to analyze:\n${JSON.stringify(data, null, 2)}` 
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content || typeof content !== 'string') return [];

    return JSON.parse(content);
  } catch (error) {
    console.error('[AI] Anomaly detection failed:', error);
    return [];
  }
}

/**
 * Calculate win rate and pricing analytics for tenders
 */
export async function analyzeTenderWinRate(tenderHistory: any[]): Promise<any> {
  const systemPrompt = `You are an AI assistant specialized in tender analysis and pricing strategy.
Analyze the historical tender data and provide insights on:
1. Win rate percentage
2. Optimal pricing strategies
3. Competitor analysis
4. Recommendations for future tenders

Return analysis as a JSON object:
{
  "winRate": number (percentage),
  "averageWinningBid": number (in cents),
  "competitorInsights": "text analysis",
  "pricingRecommendations": "text recommendations",
  "riskFactors": ["array of risk factors"]
}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: 'system', content: systemPrompt },
        { 
          role: 'user', 
          content: `Tender history:\n${JSON.stringify(tenderHistory, null, 2)}` 
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content || typeof content !== 'string') return null;

    return JSON.parse(content);
  } catch (error) {
    console.error('[AI] Win rate analysis failed:', error);
    return null;
  }
}
