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
 * Extract invoice data from document with enhanced line item extraction
 */
export async function extractInvoiceData(documentText: string): Promise<ExtractionResult> {
  const systemPrompt = `You are an AI assistant specialized in extracting invoice information from documents.
Extract the following information and return it as a JSON object:
{
  "invoiceNumber": "invoice number/reference",
  "invoiceDate": "YYYY-MM-DD format or null",
  "dueDate": "YYYY-MM-DD format or null",
  "supplierName": "supplier/vendor company name",
  "supplierAddress": "supplier address",
  "supplierTaxId": "supplier tax ID/VAT number",
  "customerName": "customer/buyer name",
  "customerAddress": "customer address",
  "purchaseOrderNumber": "PO number if referenced",
  "currency": "currency code (USD, EUR, SAR, etc.)",
  "subtotal": number (amount before tax, convert to cents by multiplying by 100),
  "taxRate": number (percentage, e.g. 15 for 15%),
  "taxAmount": number (tax amount in cents),
  "discountAmount": number (discount in cents, 0 if none),
  "totalAmount": number (final total in cents),
  "paymentTerms": "payment terms text (Net 30, etc.)",
  "bankDetails": "bank account info if present",
  "notes": "any additional notes",
  "items": [
    {
      "lineNumber": number (1, 2, 3...),
      "sku": "product code/SKU if present",
      "description": "item description",
      "quantity": number,
      "unit": "unit of measurement (pcs, kg, etc.)",
      "unitPrice": number (price per unit in cents),
      "discount": number (line discount in cents, 0 if none),
      "taxRate": number (line tax rate percentage),
      "totalPrice": number (line total in cents)
    }
  ]
}

IMPORTANT:
- Convert all monetary amounts to cents (multiply by 100)
- Parse dates to YYYY-MM-DD format
- Extract ALL line items from the invoice
- Return ONLY the JSON object, no additional text
- If a field is not found, use null or empty string/array`;

  const providers = ['groq', 'gemini', 'anthropic'];

  for (const provider of providers) {
    try {
      const response = await invokeLLM({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Extract invoice data from this document:\n\n${documentText}` },
        ],
      });

      const content = response.choices[0]?.message?.content;
      if (!content || typeof content !== 'string') continue;

      // Parse JSON, handling potential markdown code blocks
      let jsonStr = content.trim();
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }

      const data = JSON.parse(jsonStr);

      // Calculate confidence based on field completeness
      const confidence: Record<string, number> = {};
      const highConfidenceFields = ['invoiceNumber', 'totalAmount', 'supplierName'];
      const mediumConfidenceFields = ['invoiceDate', 'dueDate', 'items', 'subtotal'];

      Object.keys(data).forEach(key => {
        if (data[key] !== null && data[key] !== '' &&
            !(Array.isArray(data[key]) && data[key].length === 0)) {
          if (highConfidenceFields.includes(key)) {
            confidence[key] = 0.9;
          } else if (mediumConfidenceFields.includes(key)) {
            confidence[key] = 0.8;
          } else {
            confidence[key] = 0.7;
          }
        }
      });

      // Special confidence for items based on count
      if (data.items && Array.isArray(data.items) && data.items.length > 0) {
        confidence['items'] = Math.min(0.95, 0.7 + (data.items.length * 0.05));
      }

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

  // Fallback: Try regex extraction
  const fallbackData = extractInvoiceWithRegex(documentText);
  if (fallbackData.invoiceNumber || fallbackData.totalAmount) {
    return {
      success: true,
      data: fallbackData,
      confidence: { invoiceNumber: 0.6, totalAmount: 0.6 },
      provider: 'regex-fallback',
    };
  }

  return {
    success: false,
    data: {},
    confidence: {},
    provider: 'none',
    errors: ['All extraction methods failed'],
  };
}

/**
 * Regex-based invoice extraction fallback
 */
function extractInvoiceWithRegex(text: string): any {
  const data: any = {
    invoiceNumber: null,
    invoiceDate: null,
    dueDate: null,
    supplierName: null,
    totalAmount: null,
    items: [],
  };

  // Invoice number patterns
  const invNumPatterns = [
    /invoice\s*(?:no|number|#)?[\s:]*([A-Z0-9-]+)/i,
    /inv[\s-]*#?[\s:]*([A-Z0-9-]+)/i,
    /bill\s*(?:no|number)?[\s:]*([A-Z0-9-]+)/i,
  ];
  for (const pattern of invNumPatterns) {
    const match = text.match(pattern);
    if (match) {
      data.invoiceNumber = match[1].trim();
      break;
    }
  }

  // Date patterns
  const datePattern = /(\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{4}[-/]\d{1,2}[-/]\d{1,2})/g;
  const dates = text.match(datePattern);
  if (dates && dates.length > 0) {
    data.invoiceDate = dates[0];
    if (dates.length > 1) data.dueDate = dates[1];
  }

  // Total amount patterns
  const totalPatterns = [
    /(?:total|amount\s*due|grand\s*total)[\s:]*[$€£]?\s*([\d,]+\.?\d*)/i,
    /[$€£]\s*([\d,]+\.?\d*)\s*(?:total)?$/im,
  ];
  for (const pattern of totalPatterns) {
    const match = text.match(pattern);
    if (match) {
      const amount = parseFloat(match[1].replace(/,/g, ''));
      data.totalAmount = Math.round(amount * 100); // Convert to cents
      break;
    }
  }

  return data;
}

/**
 * Extract price list data from document with table parsing
 */
export async function extractPriceListData(documentText: string): Promise<ExtractionResult> {
  const systemPrompt = `You are an AI assistant specialized in extracting price list information from documents.
Extract the following information and return it as a JSON object:
{
  "supplierName": "supplier/vendor company name",
  "priceListName": "name or version of the price list",
  "effectiveDate": "YYYY-MM-DD format or null",
  "expiryDate": "YYYY-MM-DD format or null",
  "currency": "currency code (USD, EUR, SAR, etc.)",
  "discountTerms": "any discount terms mentioned",
  "paymentTerms": "payment terms if specified",
  "minimumOrder": "minimum order requirements",
  "deliveryTerms": "delivery/shipping terms",
  "products": [
    {
      "sku": "product code/SKU",
      "name": "product name",
      "description": "product description",
      "category": "product category if apparent",
      "unit": "unit of measurement (each, box, kg, etc.)",
      "unitPrice": number (price in cents),
      "bulkPrice": number (bulk/wholesale price in cents, null if same),
      "bulkMinQuantity": number (minimum quantity for bulk price),
      "availability": "in stock, out of stock, or null if not specified"
    }
  ]
}

IMPORTANT:
- Convert all prices to cents (multiply by 100)
- Extract ALL products from the price list
- Preserve SKU/product codes exactly as written
- Return ONLY the JSON object, no additional text`;

  const providers = ['groq', 'gemini', 'anthropic'];

  for (const provider of providers) {
    try {
      const response = await invokeLLM({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Extract price list data from this document:\n\n${documentText}` },
        ],
      });

      const content = response.choices[0]?.message?.content;
      if (!content || typeof content !== 'string') continue;

      let jsonStr = content.trim();
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }

      const data = JSON.parse(jsonStr);

      const confidence: Record<string, number> = {};
      Object.keys(data).forEach(key => {
        if (data[key] !== null && data[key] !== '' &&
            !(Array.isArray(data[key]) && data[key].length === 0)) {
          confidence[key] = 0.8;
        }
      });

      if (data.products && Array.isArray(data.products)) {
        confidence['products'] = Math.min(0.95, 0.6 + (data.products.length * 0.02));
      }

      return {
        success: true,
        data,
        confidence,
        provider,
      };
    } catch (error) {
      console.warn(`[AI] ${provider} failed for price list extraction:`, error);
      continue;
    }
  }

  return {
    success: false,
    data: {},
    confidence: {},
    provider: 'none',
    errors: ['All extraction methods failed'],
  };
}

/**
 * Extract product catalog data with detailed specifications
 */
export async function extractCatalogData(documentText: string): Promise<ExtractionResult> {
  const systemPrompt = `You are an AI assistant specialized in extracting product catalog information.
Extract the following information and return it as a JSON object:
{
  "supplierName": "manufacturer/supplier company name",
  "catalogName": "catalog name or version",
  "catalogDate": "YYYY-MM-DD format or null",
  "categories": ["list of product categories found"],
  "products": [
    {
      "sku": "product code/SKU/model number",
      "name": "product name",
      "shortDescription": "brief 1-2 sentence description",
      "fullDescription": "complete product description",
      "category": "product category",
      "subcategory": "subcategory if applicable",
      "brand": "brand name if different from supplier",
      "manufacturer": "manufacturer name",
      "specifications": {
        "key1": "value1",
        "key2": "value2"
      },
      "features": ["feature 1", "feature 2"],
      "applications": ["application 1", "application 2"],
      "certifications": ["certification 1"],
      "warranty": "warranty information",
      "unitPrice": number (price in cents, null if not listed),
      "unit": "unit of measurement",
      "minimumOrder": number (minimum order quantity),
      "leadTime": "lead time information",
      "weight": "product weight",
      "dimensions": "product dimensions",
      "imageDescription": "description of product image if visible"
    }
  ]
}

IMPORTANT:
- Extract ALL products from the catalog
- Capture detailed specifications as key-value pairs
- Generate concise short descriptions from full descriptions
- Identify and categorize products appropriately
- Convert any prices to cents
- Return ONLY the JSON object`;

  const providers = ['groq', 'gemini', 'anthropic'];

  for (const provider of providers) {
    try {
      const response = await invokeLLM({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Extract product catalog data from this document:\n\n${documentText}` },
        ],
      });

      const content = response.choices[0]?.message?.content;
      if (!content || typeof content !== 'string') continue;

      let jsonStr = content.trim();
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }

      const data = JSON.parse(jsonStr);

      const confidence: Record<string, number> = {};
      Object.keys(data).forEach(key => {
        if (data[key] !== null && data[key] !== '' &&
            !(Array.isArray(data[key]) && data[key].length === 0)) {
          confidence[key] = 0.75;
        }
      });

      if (data.products && Array.isArray(data.products)) {
        confidence['products'] = Math.min(0.9, 0.5 + (data.products.length * 0.03));
        // Higher confidence if products have specifications
        const withSpecs = data.products.filter((p: any) =>
          p.specifications && Object.keys(p.specifications).length > 0
        ).length;
        if (withSpecs > 0) {
          confidence['specifications'] = 0.85;
        }
      }

      return {
        success: true,
        data,
        confidence,
        provider,
      };
    } catch (error) {
      console.warn(`[AI] ${provider} failed for catalog extraction:`, error);
      continue;
    }
  }

  return {
    success: false,
    data: {},
    confidence: {},
    provider: 'none',
    errors: ['All extraction methods failed'],
  };
}

/**
 * Extract purchase order data
 */
export async function extractPurchaseOrderData(documentText: string): Promise<ExtractionResult> {
  const systemPrompt = `You are an AI assistant specialized in extracting purchase order information.
Extract the following information and return it as a JSON object:
{
  "poNumber": "purchase order number",
  "poDate": "YYYY-MM-DD format",
  "supplierName": "supplier/vendor name",
  "supplierAddress": "supplier address",
  "buyerName": "buyer/company name",
  "buyerAddress": "buyer address",
  "shipToAddress": "shipping address if different",
  "requestedDeliveryDate": "YYYY-MM-DD format or null",
  "paymentTerms": "payment terms",
  "shippingMethod": "shipping method",
  "currency": "currency code",
  "subtotal": number (in cents),
  "taxAmount": number (in cents),
  "shippingCost": number (in cents),
  "totalAmount": number (in cents),
  "specialInstructions": "any special instructions",
  "items": [
    {
      "lineNumber": number,
      "sku": "product code/SKU",
      "description": "item description",
      "quantity": number,
      "unit": "unit of measurement",
      "unitPrice": number (in cents),
      "totalPrice": number (in cents),
      "requestedDate": "YYYY-MM-DD or null"
    }
  ]
}

Convert all monetary amounts to cents. Return ONLY the JSON object.`;

  const providers = ['groq', 'gemini', 'anthropic'];

  for (const provider of providers) {
    try {
      const response = await invokeLLM({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Extract purchase order data from this document:\n\n${documentText}` },
        ],
      });

      const content = response.choices[0]?.message?.content;
      if (!content || typeof content !== 'string') continue;

      let jsonStr = content.trim();
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }

      const data = JSON.parse(jsonStr);

      const confidence: Record<string, number> = {};
      const highConfidenceFields = new Set(['poNumber', 'totalAmount', 'supplierName']);

      Object.keys(data).forEach(key => {
        if (data[key] !== null && data[key] !== '' &&
            !(Array.isArray(data[key]) && data[key].length === 0)) {
          confidence[key] = highConfidenceFields.has(key) ? 0.9 : 0.75;
        }
      });

      return {
        success: true,
        data,
        confidence,
        provider,
      };
    } catch (error) {
      console.warn(`[AI] ${provider} failed for PO extraction:`, error);
      continue;
    }
  }

  return {
    success: false,
    data: {},
    confidence: {},
    provider: 'none',
    errors: ['All extraction methods failed'],
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
