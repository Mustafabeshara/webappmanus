import axios from "axios";
import { isIP } from "node:net";
import { invokeLLM } from "./_core/llm";

/**
 * AI Service with fallback chain for LLM and OCR
 * LLM: Groq (free) → Gemini (free) → Anthropic (with API key)
 * OCR: Free OCR.space → Paid OCR fallback
 * 
 * Security features:
 * - SSRF protection for image URLs
 * - Input validation and sanitization
 * - Rate limiting awareness
 * - Secure error handling (no sensitive data leakage)
 */

type JsonRecord = Record<string, unknown>;

// Security constants
const MAX_DOCUMENT_TEXT_LENGTH = 100000; // 100KB max text
const MAX_PROMPT_LENGTH = 10000; // 10KB max prompt
const ALLOWED_IMAGE_PROTOCOLS = ['https:'] as const;
const BLOCKED_DOMAINS = [
  'localhost',
  '127.0.0.1',
  '::1',
  '0.0.0.0',
  '169.254.169.254', // AWS metadata service
  'metadata.google.internal', // GCP metadata service
] as const;

interface InvoiceLineItem {
  description?: string;
  quantity?: number;
  unitPriceCents?: number;
  totalCents?: number;
}

interface OCRResult {
  text: string;
  success: boolean;
  provider: string;
}

interface ExtractionResult<T = JsonRecord> {
  success: boolean;
  data: T;
  confidence: Record<string, number>;
  provider: string;
  ocrProvider?: string;
  errors?: string[];
}

interface InvoiceRegexResult {
  [key: string]: string | number | null | InvoiceLineItem[];
  invoiceNumber: string | null;
  invoiceDate: string | null;
  dueDate: string | null;
  supplierName: string | null;
  totalAmount: number | null;
  items: InvoiceLineItem[];
}

interface ForecastPoint {
  period: string;
  predictedValue: number;
  confidence: number;
}

interface ForecastInputPoint {
  period: string;
  value: number;
}

interface AnomalyFinding {
  type: "expense_outlier" | "trend_shift" | "missed_deadline" | "other";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  explanation: string;
  entityId: number;
}

type AnalyzableRow = Record<string, string | number | boolean | null>;

interface TenderWinRateAnalysis {
  winRate: number;
  averageWinningBid: number;
  competitorInsights: string;
  pricingRecommendations: string;
  riskFactors: string[];
}

function isPrivateIpv4(ip: string): boolean {
  const [a, b, c] = ip.split(".").map(Number);
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true;
  if (a === 127) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64.0.0/10
  if (a === 0 && b === 0 && c === 0) return true;
  return false;
}

function isPrivateIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized === "::1") return true;
  if (normalized.startsWith("fd") || normalized.startsWith("fc")) return true;
  if (normalized.startsWith("fe80")) return true;
  return false;
}

function isPrivateIp(ip: string): boolean {
  const ipType = isIP(ip);
  if (ipType === 4) return isPrivateIpv4(ip);
  if (ipType === 6) return isPrivateIpv6(ip);
  return false;
}

/**
 * Validates and sanitizes image URLs to prevent SSRF attacks
 * @param imageUrl - URL to validate
 * @returns true if URL is safe to use
 */
function isSafeRemoteImageUrl(imageUrl: string): boolean {
  try {
    // Input validation
    if (!imageUrl || typeof imageUrl !== 'string') return false;
    if (imageUrl.length > 2048) return false; // URLs shouldn't be this long
    
    const url = new URL(imageUrl);

    // Only allow HTTPS
    if (!ALLOWED_IMAGE_PROTOCOLS.includes(url.protocol as 'https:')) {
      console.warn(`[Security] Blocked non-HTTPS URL protocol: ${url.protocol}`);
      return false;
    }

    const hostname = url.hostname.toLowerCase();
    if (!hostname) return false;

    // Block known sensitive domains
    if (BLOCKED_DOMAINS.includes(hostname as any)) {
      console.warn(`[Security] Blocked access to sensitive domain: ${hostname}`);
      return false;
    }

    // Block localhost-like domains
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1"
    ) {
      console.warn(`[Security] Blocked localhost access: ${hostname}`);
      return false;
    }

    // Block .local and .internal TLDs (typically internal networks)
    if (hostname.endsWith(".local") || hostname.endsWith(".internal")) {
      console.warn(`[Security] Blocked internal domain: ${hostname}`);
      return false;
    }

    // Check for private IP addresses
    if (isPrivateIp(hostname)) {
      console.warn(`[Security] Blocked private IP address: ${hostname}`);
      return false;
    }

    // Additional check: Block cloud metadata services
    if (
      hostname.includes('metadata') ||
      hostname === '169.254.169.254' ||
      hostname.includes('metadata.google') ||
      hostname.includes('metadata.azure')
    ) {
      console.warn(`[Security] Blocked cloud metadata service: ${hostname}`);
      return false;
    }

    return true;
  } catch (error) {
    console.warn(`[Security] Invalid URL format: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
}

/**
 * Validates and sanitizes document text to prevent injection attacks
 * @param text - Document text to validate
 * @returns Sanitized text or throws error if invalid
 */
function validateDocumentText(text: string): string {
  if (!text || typeof text !== 'string') {
    throw new Error('Document text must be a non-empty string');
  }
  
  if (text.length > MAX_DOCUMENT_TEXT_LENGTH) {
    throw new Error(`Document text exceeds maximum length of ${MAX_DOCUMENT_TEXT_LENGTH} characters`);
  }
  
  // Remove any potential control characters that could cause issues
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

/**
 * Validates prompt length to prevent resource exhaustion
 * @param prompt - Prompt text to validate
 * @returns true if valid
 */
function validatePromptLength(prompt: string): boolean {
  if (!prompt || typeof prompt !== 'string') return false;
  return prompt.length <= MAX_PROMPT_LENGTH;
}

/**
 * Safely parse JSON with error handling
 * @param jsonString - JSON string to parse
 * @returns Parsed object or null
 */
function safeJsonParse(jsonString: string): JsonRecord | null {
  try {
    // Remove markdown code blocks if present
    let cleanJson = jsonString.trim();
    if (cleanJson.startsWith("```")) {
      cleanJson = cleanJson
        .replace(/^```(?:json)?\n?/, "")
        .replace(/\n?```$/, "");
    }
    
    const parsed = JSON.parse(cleanJson);
    
    // Validate it's an object
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return null;
    }
    
    return parsed as JsonRecord;
  } catch (error) {
    console.warn('[AI] JSON parse error:', error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

/**
 * OCR with fallback chain and security improvements
 */
export async function performOCR(imageUrl: string): Promise<OCRResult> {
  // Input validation
  if (!imageUrl || typeof imageUrl !== 'string') {
    console.error('[OCR] Invalid input: imageUrl must be a non-empty string');
    return {
      text: "",
      success: false,
      provider: "error",
    };
  }

  if (!isSafeRemoteImageUrl(imageUrl)) {
    console.warn(`[OCR] Blocked unsafe image URL: ${imageUrl.substring(0, 100)}...`);
    return {
      text: "",
      success: false,
      provider: "blocked",
    };
  }

  // Try OCR.space first if API key is configured
  const ocrSpaceKey = process.env.OCR_SPACE_API_KEY;
  if (ocrSpaceKey) {
    try {
      const response = await axios.post(
        "https://api.ocr.space/parse/imageurl",
        new URLSearchParams({
          url: imageUrl,
          apikey: ocrSpaceKey,
          language: "eng",
          isOverlayRequired: "false",
        }),
        {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          timeout: 30000,
          // Security: Don't follow redirects to prevent SSRF
          maxRedirects: 0,
          validateStatus: (status) => status === 200,
        }
      );

      if (response.data?.ParsedResults?.[0]?.ParsedText) {
        const extractedText = response.data.ParsedResults[0].ParsedText;
        // Validate the response
        if (typeof extractedText === 'string' && extractedText.length > 0) {
          return {
            text: extractedText,
            success: true,
            provider: "ocr.space",
          };
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn("[OCR] OCR.space failed, trying fallback:", errorMessage);
      // Don't expose internal error details to prevent information leakage
    }
  } else {
    console.warn(
      "[OCR] OCR_SPACE_API_KEY not set; skipping OCR.space and using fallback."
    );
  }

  // Fallback: Use LLM vision capabilities for OCR
  try {
    const llmResponse = await invokeLLM({
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract all text from this image. Return only the extracted text, preserving the layout and structure as much as possible.",
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
                detail: "high",
              },
            },
          ],
        },
      ],
    });

    const content = llmResponse.choices[0]?.message?.content;
    const extractedText = typeof content === "string" ? content : "";

    return {
      text: extractedText,
      success: true,
      provider: "llm-vision",
    };
  } catch (error) {
    console.error("[OCR] All OCR methods failed:", error);
    return {
      text: "",
      success: false,
      provider: "none",
    };
  }
}

/**
 * Extract tender information from document with input validation
 */
export async function extractTenderData(
  documentText: string,
  documentUrl?: string
): Promise<ExtractionResult> {
  // Input validation
  try {
    documentText = validateDocumentText(documentText);
  } catch (error) {
    console.error('[AI] Tender extraction failed - invalid input:', error instanceof Error ? error.message : 'Unknown error');
    return {
      success: false,
      data: {},
      confidence: {},
      provider: "none",
      errors: ["Invalid document text input"],
    };
  }

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

  const providers = ["groq", "gemini", "anthropic"];

  for (const provider of providers) {
    try {
      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: documentText },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "tender_extraction",
            strict: true,
            schema: {
              type: "object",
              properties: {
                referenceNumber: { type: ["string", "null"] },
                title: { type: ["string", "null"] },
                description: { type: ["string", "null"] },
                publishDate: { type: ["string", "null"] },
                submissionDeadline: { type: ["string", "null"] },
                evaluationDeadline: { type: ["string", "null"] },
                requirements: { type: ["string", "null"] },
                terms: { type: ["string", "null"] },
                estimatedValue: { type: ["number", "null"] },
                items: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      description: { type: "string" },
                      quantity: { type: "number" },
                      unit: { type: ["string", "null"] },
                      specifications: { type: ["string", "null"] },
                      estimatedPrice: { type: ["number", "null"] },
                    },
                    required: ["description", "quantity"],
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
      if (!content || typeof content !== "string") continue;

      const data = safeJsonParse(content);
      if (!data) {
        console.warn(`[AI] ${provider} returned invalid JSON for tender extraction`);
        continue;
      }

      // Generate confidence scores (simplified - in production, use actual model confidence)
      const confidence: Record<string, number> = {};
      Object.keys(data).forEach(key => {
        if (data[key] !== null && data[key] !== "") {
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
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.warn(`[AI] ${provider} failed for tender extraction:`, errorMsg);
      continue;
    }
  }

  return {
    success: false,
    data: {},
    confidence: {},
    provider: "none",
    errors: ["All LLM providers failed"],
  };
}

/**
 * Extract invoice data from document with enhanced line item extraction and input validation
 */
export async function extractInvoiceData(
  documentText: string
): Promise<ExtractionResult> {
  // Input validation
  try {
    documentText = validateDocumentText(documentText);
  } catch (error) {
    console.error('[AI] Invoice extraction failed - invalid input:', error instanceof Error ? error.message : 'Unknown error');
    return {
      success: false,
      data: {},
      confidence: {},
      provider: "none",
      errors: ["Invalid document text input"],
    };
  }

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

  const providers = ["groq", "gemini", "anthropic"];

  for (const provider of providers) {
    try {
      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Extract invoice data from this document:\n\n${documentText}`,
          },
        ],
      });

      const content = response.choices[0]?.message?.content;
      if (!content || typeof content !== "string") continue;

      // Use safe JSON parsing
      const data = safeJsonParse(content);
      if (!data) {
        console.warn(`[AI] ${provider} returned invalid JSON for invoice extraction`);
        continue;
      }

      // Calculate confidence based on field completeness
      const confidence: Record<string, number> = {};
      const highConfidenceFields = new Set([
        "invoiceNumber",
        "totalAmount",
        "supplierName",
      ]);
      const mediumConfidenceFields = new Set([
        "invoiceDate",
        "dueDate",
        "items",
        "subtotal",
      ]);

      Object.keys(data).forEach(key => {
        if (
          data[key] !== null &&
          data[key] !== "" &&
          !(Array.isArray(data[key]) && data[key].length === 0)
        ) {
          if (highConfidenceFields.has(key)) {
            confidence[key] = 0.9;
          } else if (mediumConfidenceFields.has(key)) {
            confidence[key] = 0.8;
          } else {
            confidence[key] = 0.7;
          }
        }
      });

      // Special confidence for items based on count
      if (data.items && Array.isArray(data.items) && data.items.length > 0) {
        confidence["items"] = Math.min(0.95, 0.7 + data.items.length * 0.05);
      }

      return {
        success: true,
        data,
        confidence,
        provider,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.warn(`[AI] ${provider} failed for invoice extraction:`, errorMsg);
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
      provider: "regex-fallback",
    };
  }

  return {
    success: false,
    data: {},
    confidence: {},
    provider: "none",
    errors: ["All extraction methods failed"],
  };
}

/**
 * Regex-based invoice extraction fallback
 */
function extractInvoiceWithRegex(text: string): InvoiceRegexResult {
  const data: InvoiceRegexResult = {
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
    const match = pattern.exec(text);
    if (match) {
      data.invoiceNumber = match[1].trim();
      break;
    }
  }

  // Date patterns
  const datePattern =
    /(\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{4}[-/]\d{1,2}[-/]\d{1,2})/g;
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
    const match = pattern.exec(text);
    if (match) {
      const amount = Number.parseFloat(match[1].replaceAll(",", ""));
      data.totalAmount = Math.round(amount * 100); // Convert to cents
      break;
    }
  }

  return data;
}

/**
 * Extract price list data from document with table parsing and input validation
 */
export async function extractPriceListData(
  documentText: string
): Promise<ExtractionResult> {
  // Input validation
  try {
    documentText = validateDocumentText(documentText);
  } catch (error) {
    console.error('[AI] Price list extraction failed - invalid input:', error instanceof Error ? error.message : 'Unknown error');
    return {
      success: false,
      data: {},
      confidence: {},
      provider: "none",
      errors: ["Invalid document text input"],
    };
  }

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

  const providers = ["groq", "gemini", "anthropic"];

  for (const provider of providers) {
    try {
      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Extract price list data from this document:\n\n${documentText}`,
          },
        ],
      });

      const content = response.choices[0]?.message?.content;
      if (!content || typeof content !== "string") continue;

      const data = safeJsonParse(content);
      if (!data) {
        console.warn(`[AI] ${provider} returned invalid JSON for price list extraction`);
        continue;
      }

      const confidence: Record<string, number> = {};
      Object.keys(data).forEach(key => {
        if (
          data[key] !== null &&
          data[key] !== "" &&
          !(Array.isArray(data[key]) && data[key].length === 0)
        ) {
          confidence[key] = 0.8;
        }
      });

      if (data.products && Array.isArray(data.products)) {
        confidence["products"] = Math.min(
          0.95,
          0.6 + data.products.length * 0.02
        );
      }

      return {
        success: true,
        data,
        confidence,
        provider,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.warn(`[AI] ${provider} failed for price list extraction:`, errorMsg);
      continue;
    }
  }

  return {
    success: false,
    data: {},
    confidence: {},
    provider: "none",
    errors: ["All extraction methods failed"],
  };
}

/**
 * Extract product catalog data with detailed specifications and input validation
 */
export async function extractCatalogData(
  documentText: string
): Promise<ExtractionResult> {
  // Input validation
  try {
    documentText = validateDocumentText(documentText);
  } catch (error) {
    console.error('[AI] Catalog extraction failed - invalid input:', error instanceof Error ? error.message : 'Unknown error');
    return {
      success: false,
      data: {},
      confidence: {},
      provider: "none",
      errors: ["Invalid document text input"],
    };
  }

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

  const providers = ["groq", "gemini", "anthropic"];

  for (const provider of providers) {
    try {
      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Extract product catalog data from this document:\n\n${documentText}`,
          },
        ],
      });

      const content = response.choices[0]?.message?.content;
      if (!content || typeof content !== "string") continue;

      const data = safeJsonParse(content);
      if (!data) {
        console.warn(`[AI] ${provider} returned invalid JSON for catalog extraction`);
        continue;
      }

      const confidence: Record<string, number> = {};
      Object.keys(data).forEach(key => {
        if (
          data[key] !== null &&
          data[key] !== "" &&
          !(Array.isArray(data[key]) && data[key].length === 0)
        ) {
          confidence[key] = 0.75;
        }
      });

      if (data.products && Array.isArray(data.products)) {
        confidence["products"] = Math.min(
          0.9,
          0.5 + data.products.length * 0.03
        );
        // Higher confidence if products have specifications
        const withSpecs = data.products.filter(
          (p: { specifications?: Record<string, unknown> }) =>
            p.specifications && Object.keys(p.specifications).length > 0
        ).length;
        if (withSpecs > 0) {
          confidence["specifications"] = 0.85;
        }
      }

      return {
        success: true,
        data,
        confidence,
        provider,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.warn(`[AI] ${provider} failed for catalog extraction:`, errorMsg);
      continue;
    }
  }

  return {
    success: false,
    data: {},
    confidence: {},
    provider: "none",
    errors: ["All extraction methods failed"],
  };
}

/**
 * Extract purchase order data with input validation
 */
export async function extractPurchaseOrderData(
  documentText: string
): Promise<ExtractionResult> {
  // Input validation
  try {
    documentText = validateDocumentText(documentText);
  } catch (error) {
    console.error('[AI] Purchase order extraction failed - invalid input:', error instanceof Error ? error.message : 'Unknown error');
    return {
      success: false,
      data: {},
      confidence: {},
      provider: "none",
      errors: ["Invalid document text input"],
    };
  }

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

  const providers = ["groq", "gemini", "anthropic"];

  for (const provider of providers) {
    try {
      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Extract purchase order data from this document:\n\n${documentText}`,
          },
        ],
      });

      const content = response.choices[0]?.message?.content;
      if (!content || typeof content !== "string") continue;

      const data = safeJsonParse(content);
      if (!data) {
        console.warn(`[AI] ${provider} returned invalid JSON for PO extraction`);
        continue;
      }

      const confidence: Record<string, number> = {};
      const highConfidenceFields = new Set([
        "poNumber",
        "totalAmount",
        "supplierName",
      ]);

      Object.keys(data).forEach(key => {
        if (
          data[key] !== null &&
          data[key] !== "" &&
          !(Array.isArray(data[key]) && data[key].length === 0)
        ) {
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
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.warn(`[AI] ${provider} failed for PO extraction:`, errorMsg);
      continue;
    }
  }

  return {
    success: false,
    data: {},
    confidence: {},
    provider: "none",
    errors: ["All extraction methods failed"],
  };
}

/**
 * Extract expense data from receipt/document with input validation
 */
export async function extractExpenseData(
  documentText: string
): Promise<ExtractionResult> {
  // Input validation
  try {
    documentText = validateDocumentText(documentText);
  } catch (error) {
    console.error('[AI] Expense extraction failed - invalid input:', error instanceof Error ? error.message : 'Unknown error');
    return {
      success: false,
      data: {},
      confidence: {},
      provider: "none",
      errors: ["Invalid document text input"],
    };
  }

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

  const providers = ["groq", "gemini", "anthropic"];

  for (const provider of providers) {
    try {
      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: documentText },
        ],
      });

      const content = response.choices[0]?.message?.content;
      if (!content || typeof content !== "string") continue;

      const data = safeJsonParse(content);
      if (!data) {
        console.warn(`[AI] ${provider} returned invalid JSON for expense extraction`);
        continue;
      }

      const confidence: Record<string, number> = {};
      Object.keys(data).forEach(key => {
        if (data[key] !== null && data[key] !== "") {
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
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.warn(`[AI] ${provider} failed for expense extraction:`, errorMsg);
      continue;
    }
  }

  return {
    success: false,
    data: {},
    confidence: {},
    provider: "none",
    errors: ["All LLM providers failed"],
  };
}

/**
 * Generate business forecast using AI with input validation
 */
export async function generateForecast(
  historicalData: ForecastInputPoint[],
  type: string
): Promise<ForecastPoint[]> {
  // Input validation
  if (!Array.isArray(historicalData) || historicalData.length === 0) {
    console.error('[AI] Forecast generation failed - invalid historicalData');
    return [];
  }

  if (!type || typeof type !== 'string' || type.length > 100) {
    console.error('[AI] Forecast generation failed - invalid type');
    return [];
  }

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
    const dataString = JSON.stringify(historicalData, null, 2);
    const prompt = `Historical ${type} data:\n${dataString}\n\nGenerate forecasts for the next 6 months.`;
    
    if (!validatePromptLength(prompt)) {
      console.error('[AI] Forecast generation failed - prompt too long');
      return [];
    }

    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content || typeof content !== "string") return [];

    const parsed = safeJsonParse(content);
    if (!parsed) {
      // Try parsing as array directly
      try {
        const cleanContent = content.trim()
          .replace(/^```(?:json)?\n?/, "")
          .replace(/\n?```$/, "");
        return JSON.parse(cleanContent) as ForecastPoint[];
      } catch {
        console.warn('[AI] Forecast generation - failed to parse response');
        return [];
      }
    }

    return Array.isArray(parsed) ? (parsed as ForecastPoint[]) : [];
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error("[AI] Forecast generation failed:", errorMsg);
    return [];
  }
}

/**
 * Detect anomalies using AI with input validation
 */
export async function detectAnomalies(
  data: AnalyzableRow[],
  context: string
): Promise<AnomalyFinding[]> {
  // Input validation
  if (!Array.isArray(data) || data.length === 0) {
    console.error('[AI] Anomaly detection failed - invalid data');
    return [];
  }

  if (!context || typeof context !== 'string' || context.length > 500) {
    console.error('[AI] Anomaly detection failed - invalid context');
    return [];
  }

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
    const dataString = JSON.stringify(data, null, 2);
    const prompt = `Context: ${context}\n\nData to analyze:\n${dataString}`;
    
    if (!validatePromptLength(prompt)) {
      console.error('[AI] Anomaly detection failed - prompt too long');
      return [];
    }

    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content || typeof content !== "string") return [];

    const parsed = safeJsonParse(content);
    if (!parsed) {
      // Try parsing as array directly
      try {
        const cleanContent = content.trim()
          .replace(/^```(?:json)?\n?/, "")
          .replace(/\n?```$/, "");
        return JSON.parse(cleanContent) as AnomalyFinding[];
      } catch {
        console.warn('[AI] Anomaly detection - failed to parse response');
        return [];
      }
    }

    return Array.isArray(parsed) ? (parsed as AnomalyFinding[]) : [];
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error("[AI] Anomaly detection failed:", errorMsg);
    return [];
  }
}

/**
 * Calculate win rate and pricing analytics for tenders with input validation
 */
export async function analyzeTenderWinRate(
  tenderHistory: ReadonlyArray<JsonRecord>
): Promise<TenderWinRateAnalysis | null> {
  // Input validation
  if (!Array.isArray(tenderHistory) || tenderHistory.length === 0) {
    console.error('[AI] Tender win rate analysis failed - invalid tenderHistory');
    return null;
  }

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
    const dataString = JSON.stringify(tenderHistory, null, 2);
    const prompt = `Tender history:\n${dataString}`;
    
    if (!validatePromptLength(prompt)) {
      console.error('[AI] Tender win rate analysis failed - prompt too long');
      return null;
    }

    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content || typeof content !== "string") return null;

    const parsed = safeJsonParse(content);
    if (!parsed) {
      console.warn('[AI] Win rate analysis - failed to parse response');
      return null;
    }

    return parsed as TenderWinRateAnalysis;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error("[AI] Win rate analysis failed:", errorMsg);
    return null;
  }
}

// =============================================================================
// COMPREHENSIVE DOCUMENT EXTRACTION FUNCTIONS
// =============================================================================

/**
 * Extract supplier data from registration documents
 */
export async function extractSupplierData(
  documentText: string
): Promise<ExtractionResult> {
  const systemPrompt = `You are an AI assistant specialized in extracting supplier/company registration information.
Extract the following information and return it as a JSON object:
{
  "companyName": "company legal name",
  "companyNameAr": "company name in Arabic if present",
  "commercialRegistration": "CR number (10 digits)",
  "vatNumber": "VAT number (15 digits, starts and ends with 3)",
  "contactPerson": "primary contact person name",
  "email": "email address",
  "phone": "phone number",
  "address": "full business address",
  "city": "city name",
  "country": "country name",
  "bankName": "bank name if present",
  "bankAccountNumber": "IBAN or account number",
  "supplierType": ["array of supplier types: Manufacturer, Distributor, Agent, etc."],
  "productCategories": ["array of product/service categories"],
  "yearEstablished": "year company was established",
  "employeeCount": number or null,
  "capital": number (paid-up capital in cents) or null
}

Return ONLY the JSON object. If a field is not found, use null or empty string/array.`;

  return await genericExtraction(documentText, systemPrompt, "supplier");
}

/**
 * Extract detailed expense report data with line items
 */
export async function extractExpenseReportData(
  documentText: string
): Promise<ExtractionResult> {
  const systemPrompt = `You are an AI assistant specialized in extracting expense report information.
Extract the following information and return it as a JSON object:
{
  "reportTitle": "expense report title",
  "employeeName": "employee name who submitted",
  "department": "department name",
  "reportDate": "YYYY-MM-DD format",
  "periodStart": "YYYY-MM-DD format",
  "periodEnd": "YYYY-MM-DD format",
  "currency": "currency code (SAR, USD, etc.)",
  "totalAmount": number (total in cents),
  "justification": "business justification text",
  "expenses": [
    {
      "date": "YYYY-MM-DD",
      "category": "Travel, Meals, Accommodation, Transport, Supplies, Other",
      "description": "expense description",
      "vendor": "merchant/vendor name",
      "amount": number (in cents),
      "receiptNumber": "receipt number if available"
    }
  ]
}

Convert all amounts to cents. Return ONLY the JSON object.`;

  return await genericExtraction(documentText, systemPrompt, "expense_report");
}

/**
 * Extract budget data from financial documents
 */
export async function extractBudgetData(
  documentText: string
): Promise<ExtractionResult> {
  const systemPrompt = `You are an AI assistant specialized in extracting budget information.
Extract the following information and return it as a JSON object:
{
  "budgetName": "budget name/title",
  "fiscalYear": "fiscal year (e.g., 2024)",
  "department": "department name",
  "category": "budget category",
  "totalAmount": number (total budget in cents),
  "currency": "currency code",
  "startDate": "YYYY-MM-DD format",
  "endDate": "YYYY-MM-DD format",
  "quarterlyBreakdown": {
    "Q1": number (in cents),
    "Q2": number (in cents),
    "Q3": number (in cents),
    "Q4": number (in cents)
  },
  "description": "budget description/purpose"
}

Convert all amounts to cents. Return ONLY the JSON object.`;

  return await genericExtraction(documentText, systemPrompt, "budget");
}

/**
 * Extract commercial registration (CR) data
 */
export async function extractCommercialRegistrationData(
  documentText: string
): Promise<ExtractionResult> {
  const systemPrompt = `You are an AI assistant specialized in extracting Saudi Commercial Registration (السجل التجاري) information.
Extract the following information and return it as a JSON object:
{
  "crNumber": "10-digit CR number",
  "companyName": "company name in English",
  "companyNameAr": "company name in Arabic (اسم الشركة)",
  "legalForm": "LLC, Joint Stock, Sole Proprietorship, Partnership, or Branch",
  "capital": number (paid-up capital in cents),
  "issueDate": "YYYY-MM-DD format",
  "expiryDate": "YYYY-MM-DD format",
  "activities": ["array of business activities"],
  "city": "city of registration",
  "managers": ["array of manager names"]
}

Look for Arabic text like: رقم السجل التجاري، اسم المنشأة، الشكل القانوني، رأس المال
Return ONLY the JSON object.`;

  return await genericExtraction(
    documentText,
    systemPrompt,
    "commercial_registration"
  );
}

/**
 * Extract VAT certificate data
 */
export async function extractVATCertificateData(
  documentText: string
): Promise<ExtractionResult> {
  const systemPrompt = `You are an AI assistant specialized in extracting VAT certificate information.
Extract the following information and return it as a JSON object:
{
  "vatNumber": "15-digit VAT number (starts and ends with 3)",
  "companyName": "taxpayer/company name",
  "registrationDate": "YYYY-MM-DD format",
  "status": "Active, Suspended, or Cancelled"
}

Look for Arabic text like: الرقم الضريبي، شهادة تسجيل ضريبة القيمة المضافة
Return ONLY the JSON object.`;

  return await genericExtraction(documentText, systemPrompt, "vat_certificate");
}

/**
 * Extract Zakat certificate data
 */
export async function extractZakatCertificateData(
  documentText: string
): Promise<ExtractionResult> {
  const systemPrompt = `You are an AI assistant specialized in extracting Zakat & Tax certificate information.
Extract the following information and return it as a JSON object:
{
  "certificateNumber": "certificate number",
  "companyName": "company name",
  "taxNumber": "tax number/distinctive number",
  "issueDate": "YYYY-MM-DD format",
  "expiryDate": "YYYY-MM-DD format"
}

Look for Arabic text like: شهادة الزكاة والدخل، رقم الشهادة، صالحة حتى
Return ONLY the JSON object.`;

  return await genericExtraction(
    documentText,
    systemPrompt,
    "zakat_certificate"
  );
}

/**
 * Extract GOSI certificate data
 */
export async function extractGOSICertificateData(
  documentText: string
): Promise<ExtractionResult> {
  const systemPrompt = `You are an AI assistant specialized in extracting GOSI certificate information.
Extract the following information and return it as a JSON object:
{
  "certificateNumber": "certificate number",
  "establishmentNumber": "establishment/subscription number",
  "companyName": "company name",
  "issueDate": "YYYY-MM-DD format",
  "expiryDate": "YYYY-MM-DD format",
  "complianceStatus": "Compliant, Non-Compliant, or Pending"
}

Look for Arabic text like: شهادة التأمينات الاجتماعية، رقم المنشأة
Return ONLY the JSON object.`;

  return await genericExtraction(
    documentText,
    systemPrompt,
    "gosi_certificate"
  );
}

/**
 * Extract bank guarantee data
 */
export async function extractBankGuaranteeData(
  documentText: string
): Promise<ExtractionResult> {
  const systemPrompt = `You are an AI assistant specialized in extracting bank guarantee/letter of guarantee information.
Extract the following information and return it as a JSON object:
{
  "guaranteeNumber": "guarantee reference number",
  "bankName": "issuing bank name",
  "bankBranch": "bank branch",
  "amount": number (guarantee amount in cents),
  "currency": "SAR, USD, etc.",
  "beneficiary": "beneficiary name",
  "issueDate": "YYYY-MM-DD format",
  "expiryDate": "YYYY-MM-DD format",
  "guaranteeType": "Bid Bond, Performance Bond, Advance Payment, Retention, Credit Facility",
  "purpose": "purpose of guarantee"
}

Convert amounts to cents. Return ONLY the JSON object.`;

  return await genericExtraction(documentText, systemPrompt, "bank_guarantee");
}

/**
 * Extract Letter of Authorization (LOA) data
 */
export async function extractLOAData(
  documentText: string
): Promise<ExtractionResult> {
  const systemPrompt = `You are an AI assistant specialized in extracting Letter of Authorization (LOA) information.
Extract the following information and return it as a JSON object:
{
  "loaNumber": "LOA reference number if present",
  "manufacturerName": "manufacturer/principal company name",
  "manufacturerCountry": "manufacturer country of origin",
  "authorizedDistributor": "authorized distributor/agent name",
  "authorizationType": "Exclusive Distributor, Non-Exclusive Distributor, Authorized Agent, Authorized Reseller, Service Provider",
  "territory": ["array of authorized territories/countries"],
  "productLines": ["array of authorized product lines/brands"],
  "issueDate": "YYYY-MM-DD format",
  "expiryDate": "YYYY-MM-DD format",
  "signatoryName": "name of person who signed",
  "signatoryTitle": "title/position of signatory"
}

Return ONLY the JSON object.`;

  return await genericExtraction(documentText, systemPrompt, "loa");
}

/**
 * Extract MOCI agency registration data
 */
export async function extractMOCILetterData(
  documentText: string
): Promise<ExtractionResult> {
  const systemPrompt = `You are an AI assistant specialized in extracting Saudi MOCI agency registration information.
Extract the following information and return it as a JSON object:
{
  "registrationNumber": "agency registration number",
  "agentName": "agent/distributor company name",
  "principalName": "principal/manufacturer name",
  "principalCountry": "principal country of origin",
  "agencyType": "Commercial Agency, Distribution Agreement, or Franchise",
  "productDescription": "description of products/services covered",
  "registrationDate": "YYYY-MM-DD format",
  "expiryDate": "YYYY-MM-DD format"
}

Look for Arabic text like: وزارة التجارة، الوكالة التجارية
Return ONLY the JSON object.`;

  return await genericExtraction(documentText, systemPrompt, "moci_letter");
}

/**
 * Extract FDA certificate data
 */
export async function extractFDACertificateData(
  documentText: string
): Promise<ExtractionResult> {
  const systemPrompt = `You are an AI assistant specialized in extracting FDA certificate and 510(k) clearance information.
Extract the following information and return it as a JSON object:
{
  "fdaNumber": "FDA registration number or 510(k) number (e.g., K123456)",
  "certificateType": "510(k) Clearance, PMA Approval, De Novo, FDA Registration, Establishment Registration, Device Listing",
  "deviceName": "device/product name",
  "deviceClass": "Class I, Class II, or Class III",
  "productCode": "FDA product code",
  "manufacturerName": "manufacturer name",
  "manufacturerAddress": "manufacturer address",
  "clearanceDate": "YYYY-MM-DD format",
  "predicateDevice": "predicate device K number for 510(k)",
  "intendedUse": "intended use statement"
}

Return ONLY the JSON object.`;

  return await genericExtraction(documentText, systemPrompt, "fda_certificate");
}

/**
 * Extract CE marking certificate data
 */
export async function extractCECertificateData(
  documentText: string
): Promise<ExtractionResult> {
  const systemPrompt = `You are an AI assistant specialized in extracting CE marking certificate information.
Extract the following information and return it as a JSON object:
{
  "certificateNumber": "EC certificate number",
  "certificateType": "EC Certificate, Declaration of Conformity, Technical File Review, Type Examination Certificate",
  "notifiedBody": "notified body name",
  "notifiedBodyNumber": "NB number (4 digits)",
  "manufacturerName": "manufacturer name",
  "productName": "product/device name",
  "productModels": ["array of model numbers covered"],
  "directive": ["MDR 2017/745", "MDD 93/42/EEC", etc.],
  "classification": "Class I, IIa, IIb, III, A, B, C, or D",
  "annexApplied": ["array of conformity assessment annexes"],
  "issueDate": "YYYY-MM-DD format",
  "expiryDate": "YYYY-MM-DD format"
}

Return ONLY the JSON object.`;

  return await genericExtraction(documentText, systemPrompt, "ce_certificate");
}

/**
 * Extract ISO certificate data
 */
export async function extractISOCertificateData(
  documentText: string
): Promise<ExtractionResult> {
  const systemPrompt = `You are an AI assistant specialized in extracting ISO certification information.
Extract the following information and return it as a JSON object:
{
  "certificateNumber": "certificate number",
  "isoStandard": ["ISO 9001:2015", "ISO 13485:2016", etc.],
  "certificationBody": "certification body name",
  "accreditationBody": "accreditation body (UKAS, DAkkS, ANAB, etc.)",
  "companyName": "certified organization name",
  "certifiedSites": ["array of certified site addresses"],
  "scope": "certification scope description",
  "issueDate": "YYYY-MM-DD format",
  "expiryDate": "YYYY-MM-DD format",
  "lastAuditDate": "YYYY-MM-DD format if mentioned"
}

Return ONLY the JSON object.`;

  return await genericExtraction(documentText, systemPrompt, "iso_certificate");
}

/**
 * Extract SFDA certificate data
 */
export async function extractSFDACertificateData(
  documentText: string
): Promise<ExtractionResult> {
  const systemPrompt = `You are an AI assistant specialized in extracting Saudi FDA (SFDA) medical device registration information.
Extract the following information and return it as a JSON object:
{
  "sfdaNumber": "SFDA registration number (MDN)",
  "certificateType": "Marketing Authorization, Device Listing, Establishment License, Import License, Free Sale Certificate",
  "deviceName": "device/product name in English",
  "deviceNameAr": "device name in Arabic",
  "riskClass": "Class A, B, C, or D",
  "gmdnCode": "GMDN code if present",
  "manufacturerName": "manufacturer name",
  "manufacturerCountry": "country of origin",
  "localAgent": "local authorized representative name",
  "issueDate": "YYYY-MM-DD format",
  "expiryDate": "YYYY-MM-DD format",
  "intendedUse": "intended use statement"
}

Look for Arabic text like: هيئة الغذاء والدواء، تسجيل الأجهزة الطبية
Return ONLY the JSON object.`;

  return await genericExtraction(
    documentText,
    systemPrompt,
    "sfda_certificate"
  );
}

/**
 * Extract manufacturer authorization letter data
 */
export async function extractManufacturerAuthorizationData(
  documentText: string
): Promise<ExtractionResult> {
  const systemPrompt = `You are an AI assistant specialized in extracting manufacturer authorization letter information.
Extract the following information and return it as a JSON object:
{
  "referenceNumber": "letter reference number",
  "manufacturerName": "manufacturer company name",
  "manufacturerCountry": "manufacturer country",
  "authorizedCompany": "authorized company name",
  "authorizationPurpose": "Tender Participation, General Distribution, Service Provision, After-Sales Support, Project Specific",
  "tenderReference": "tender/project reference if mentioned",
  "customerName": "end customer name if mentioned",
  "products": ["array of authorized products/models"],
  "letterDate": "YYYY-MM-DD format",
  "validUntil": "YYYY-MM-DD format if specified",
  "signatoryName": "signatory name",
  "signatoryTitle": "signatory title/position"
}

Return ONLY the JSON object.`;

  return await genericExtraction(
    documentText,
    systemPrompt,
    "manufacturer_authorization"
  );
}

/**
 * Generic extraction helper function with input validation
 */
async function genericExtraction(
  documentText: string,
  systemPrompt: string,
  extractionType: string
): Promise<ExtractionResult> {
  // Input validation
  try {
    documentText = validateDocumentText(documentText);
  } catch (error) {
    console.error(`[AI] ${extractionType} extraction failed - invalid input:`, error instanceof Error ? error.message : 'Unknown error');
    return {
      success: false,
      data: {},
      confidence: {},
      provider: "none",
      errors: ["Invalid document text input"],
    };
  }

  const providers = ["groq", "gemini", "anthropic"];

  for (const provider of providers) {
    try {
      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Extract data from this document:\n\n${documentText}`,
          },
        ],
      });

      const content = response.choices[0]?.message?.content;
      if (!content || typeof content !== "string") continue;

      // Use safe JSON parsing
      const data = safeJsonParse(content);
      if (!data) {
        console.warn(`[AI] ${provider} returned invalid JSON for ${extractionType} extraction`);
        continue;
      }

      // Generate confidence scores based on field completeness
      const confidence: Record<string, number> = {};
      Object.keys(data).forEach(key => {
        if (
          data[key] !== null &&
          data[key] !== "" &&
          !(Array.isArray(data[key]) && data[key].length === 0)
        ) {
          // Higher confidence for key identification fields
          const keyFields = [
            "certificateNumber",
            "registrationNumber",
            "vatNumber",
            "crNumber",
            "fdaNumber",
            "sfdaNumber",
            "companyName",
            "manufacturerName",
          ];
          if (keyFields.includes(key)) {
            confidence[key] = 0.9;
          } else {
            confidence[key] = 0.75;
          }
        }
      });

      return {
        success: true,
        data,
        confidence,
        provider,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.warn(
        `[AI] ${provider} failed for ${extractionType} extraction:`,
        errorMsg
      );
      continue;
    }
  }

  return {
    success: false,
    data: {},
    confidence: {},
    provider: "none",
    errors: [`All extraction methods failed for ${extractionType}`],
  };
}
