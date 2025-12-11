/**
 * AI-Powered Document Processing Service
 * Handles OCR extraction, field population, and intelligent document analysis
 */

import * as db from "../db";

export interface DocumentExtractionRequest {
  documentId: number;
  documentType:
    | "tender"
    | "invoice"
    | "price_list"
    | "catalog"
    | "po"
    | "contract";
  extractionFields: string[];
  aiProvider?: "openai" | "anthropic" | "groq" | "gemini";
  ocrProvider?: "tesseract" | "aws_textract" | "google_vision";
}

export interface ExtractedData {
  [fieldName: string]: {
    value: any;
    confidence: number;
    boundingBox?: { x: number; y: number; width: number; height: number };
    source: "ocr" | "ai_inference" | "template_match";
  };
}

export interface DocumentTemplate {
  id: number;
  name: string;
  documentType: string;
  fields: TemplateField[];
  aiPrompt: string;
  validationRules: ValidationRule[];
}

export interface TemplateField {
  name: string;
  type: "text" | "number" | "date" | "currency" | "table" | "boolean";
  required: boolean;
  extractionHints: string[];
  validationPattern?: string;
  defaultValue?: any;
}

export interface ValidationRule {
  field: string;
  rule: "required" | "format" | "range" | "cross_reference";
  parameters: any;
}

class AIDocumentProcessor {
  private readonly AI_PROVIDERS = {
    openai: process.env.OPENAI_API_KEY,
    anthropic: process.env.ANTHROPIC_API_KEY,
    groq: process.env.GROQ_API_KEY,
    gemini: process.env.GEMINI_API_KEY,
  };

  /**
   * Process document with AI extraction
   */
  async processDocument(
    request: DocumentExtractionRequest
  ): Promise<ExtractedData> {
    try {
      // Get document from database
      const document = await db.getDocumentById(request.documentId);
      if (!document) {
        throw new Error("Document not found");
      }

      // Get or create template for document type
      const template = await this.getDocumentTemplate(request.documentType);

      // Perform OCR extraction
      const ocrResults = await this.performOCR(document, request.ocrProvider);

      // Perform AI-power extraction
      const aiResults = await this.performAIExtraction(
        document,
        ocrResults,
        template,
        request.aiProvider
      );

      // Validate and clean extracted data
      const validatedData = await this.validateExtractedData(
        aiResults,
        template
      );

      // Store extraction results
      await this.storeExtractionResults(
        request.documentId,
        validatedData,
        template
      );

      return validatedData;
    } catch (error) {
      console.error("[AI Document] Processing failed:", error);
      throw error;
    }
  }

  /**
   * Perform OCR on document
   */
  private async performOCR(
    document: any,
    provider: string = "tesseract"
  ): Promise<string> {
    switch (provider) {
      case "aws_textract":
        return this.performAWSTextract(document);
      case "google_vision":
        return this.performGoogleVision(document);
      case "tesseract":
      default:
        return this.performTesseractOCR(document);
    }
  }

  /**
   * AWS Textract OCR
   */
  private async performAWSTextract(document: any): Promise<string> {
    // Implementation for AWS Textract
    // This would integrate with AWS SDK
    console.log("Performing AWS Textract OCR for:", document.fileName);

    // Mock implementation - replace with actual AWS Textract call
    return `OCR Text from ${document.fileName} using AWS Textract`;
  }

  /**
   * Google Vision OCR
   */
  private async performGoogleVision(document: any): Promise<string> {
    // Implementation for Google Vision API
    console.log("Performing Google Vision OCR for:", document.fileName);

    // Mock implementation - replace with actual Google Vision call
    return `OCR Text from ${document.fileName} using Google Vision`;
  }

  /**
   * Tesseract OCR (local/open source)
   */
  private async performTesseractOCR(document: any): Promise<string> {
    // Implementation for Tesseract OCR
    console.log("Performing Tesseract OCR for:", document.fileName);

    // Mock implementation - replace with actual Tesseract call
    return `OCR Text from ${document.fileName} using Tesseract`;
  }

  /**
   * AI-powered field extraction
   */
  private async performAIExtraction(
    document: any,
    ocrText: string,
    template: DocumentTemplate,
    provider: string = "openai"
  ): Promise<ExtractedData> {
    const prompt = this.buildExtractionPrompt(ocrText, template);

    switch (provider) {
      case "openai":
        return this.extractWithOpenAI(prompt, template);
      case "anthropic":
        return this.extractWithAnthropic(prompt, template);
      case "groq":
        return this.extractWithGroq(prompt, template);
      case "gemini":
        return this.extractWithGemini(prompt, template);
      default:
        throw new Error(`Unsupported AI provider: ${provider}`);
    }
  }

  /**
   * Build extraction prompt for AI
   */
  private buildExtractionPrompt(
    ocrText: string,
    template: DocumentTemplate
  ): string {
    const fieldDescriptions = template.fields
      .map(
        field =>
          `- ${field.name} (${field.type}): ${field.extractionHints.join(", ")}`
      )
      .join("\n");

    return `
Extract the following fields from this ${template.documentType} document:

${fieldDescriptions}

Document Text:
${ocrText}

Please return the extracted data as JSON with the following structure:
{
  "fieldName": {
    "value": "extracted_value",
    "confidence": 0.95,
    "source": "ai_inference"
  }
}

${template.aiPrompt}
`;
  }

  /**
   * Extract with OpenAI
   */
  private async extractWithOpenAI(
    prompt: string,
    template: DocumentTemplate
  ): Promise<ExtractedData> {
    if (!this.AI_PROVIDERS.openai) {
      throw new Error("OpenAI API key not configured");
    }

    try {
      // Mock implementation - replace with actual OpenAI API call
      console.log("Extracting with OpenAI:", template.name);

      // Simulate AI extraction results
      const mockResults: ExtractedData = {};
      template.fields.forEach(field => {
        mockResults[field.name] = {
          value: `Mock ${field.name} value`,
          confidence: 0.85 + Math.random() * 0.15,
          source: "ai_inference",
        };
      });

      return mockResults;
    } catch (error) {
      console.error("[AI] OpenAI extraction failed:", error);
      throw error;
    }
  }

  /**
   * Extract with Anthropic Claude
   */
  private async extractWithAnthropic(
    prompt: string,
    template: DocumentTemplate
  ): Promise<ExtractedData> {
    if (!this.AI_PROVIDERS.anthropic) {
      throw new Error("Anthropic API key not configured");
    }

    // Mock implementation - replace with actual Anthropic API call
    console.log("Extracting with Anthropic:", template.name);

    const mockResults: ExtractedData = {};
    template.fields.forEach(field => {
      mockResults[field.name] = {
        value: `Anthropic ${field.name} value`,
        confidence: 0.88 + Math.random() * 0.12,
        source: "ai_inference",
      };
    });

    return mockResults;
  }

  /**
   * Extract with Groq
   */
  private async extractWithGroq(
    prompt: string,
    template: DocumentTemplate
  ): Promise<ExtractedData> {
    if (!this.AI_PROVIDERS.groq) {
      throw new Error("Groq API key not configured");
    }

    // Mock implementation - replace with actual Groq API call
    console.log("Extracting with Groq:", template.name);

    const mockResults: ExtractedData = {};
    template.fields.forEach(field => {
      mockResults[field.name] = {
        value: `Groq ${field.name} value`,
        confidence: 0.82 + Math.random() * 0.18,
        source: "ai_inference",
      };
    });

    return mockResults;
  }

  /**
   * Extract with Google Gemini
   */
  private async extractWithGemini(
    prompt: string,
    template: DocumentTemplate
  ): Promise<ExtractedData> {
    if (!this.AI_PROVIDERS.gemini) {
      throw new Error("Gemini API key not configured");
    }

    // Mock implementation - replace with actual Gemini API call
    console.log("Extracting with Gemini:", template.name);

    const mockResults: ExtractedData = {};
    template.fields.forEach(field => {
      mockResults[field.name] = {
        value: `Gemini ${field.name} value`,
        confidence: 0.87 + Math.random() * 0.13,
        source: "ai_inference",
      };
    });

    return mockResults;
  }

  /**
   * Validate extracted data against template rules
   */
  private async validateExtractedData(
    extractedData: ExtractedData,
    template: DocumentTemplate
  ): Promise<ExtractedData> {
    const validatedData = { ...extractedData };
    const errors: string[] = [];

    for (const rule of template.validationRules) {
      const fieldData = validatedData[rule.field];

      if (!fieldData && rule.rule === "required") {
        errors.push(`Required field ${rule.field} is missing`);
        continue;
      }

      if (fieldData) {
        switch (rule.rule) {
          case "format":
            if (
              !this.validateFormat(fieldData.value, rule.parameters.pattern)
            ) {
              errors.push(`Field ${rule.field} format is invalid`);
              fieldData.confidence *= 0.5; // Reduce confidence for invalid format
            }
            break;
          case "range":
            if (
              !this.validateRange(
                fieldData.value,
                rule.parameters.min,
                rule.parameters.max
              )
            ) {
              errors.push(`Field ${rule.field} value is out of range`);
              fieldData.confidence *= 0.7;
            }
            break;
          case "cross_reference":
            const isValid = await this.validateCrossReference(
              fieldData.value,
              rule.parameters
            );
            if (!isValid) {
              errors.push(
                `Field ${rule.field} cross-reference validation failed`
              );
              fieldData.confidence *= 0.6;
            }
            break;
        }
      }
    }

    if (errors.length > 0) {
      console.warn("[AI Document] Validation warnings:", errors);
    }

    return validatedData;
  }

  /**
   * Validate field format
   */
  private validateFormat(value: any, pattern: string): boolean {
    if (typeof value !== "string") return false;
    const regex = new RegExp(pattern);
    return regex.test(value);
  }

  /**
   * Validate field range
   */
  private validateRange(value: any, min: number, max: number): boolean {
    const numValue = parseFloat(value);
    return !isNaN(numValue) && numValue >= min && numValue <= max;
  }

  /**
   * Validate cross-reference (e.g., supplier exists, product code is valid)
   */
  private async validateCrossReference(
    value: any,
    parameters: any
  ): Promise<boolean> {
    switch (parameters.type) {
      case "supplier":
        const supplier = await db.getAllSuppliers();
        return supplier.some(s => s.code === value || s.name === value);
      case "product":
        const product = await db.findProductByNameOrCode(value, value);
        return !!product;
      default:
        return true;
    }
  }

  /**
   * Store extraction results in database
   */
  private async storeExtractionResults(
    documentId: number,
    extractedData: ExtractedData,
    template: DocumentTemplate
  ): Promise<void> {
    const confidenceScores: Record<string, number> = {};
    Object.entries(extractedData).forEach(([field, data]) => {
      confidenceScores[field] = data.confidence;
    });

    await db.createExtractionResult({
      documentId,
      extractedData: JSON.stringify(extractedData),
      confidenceScores: JSON.stringify(confidenceScores),
      provider: "ai_processor",
      ocrProvider: "multi_provider",
      validationErrors: null,
      reviewedBy: null,
      reviewedAt: null,
      corrections: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  /**
   * Get document template by type
   */
  private async getDocumentTemplate(
    documentType: string
  ): Promise<DocumentTemplate> {
    // This would typically come from database, but for now return predefined templates
    return this.getBuiltInTemplate(documentType);
  }

  /**
   * Get built-in templates for different document types
   */
  private getBuiltInTemplate(documentType: string): DocumentTemplate {
    const templates: Record<string, DocumentTemplate> = {
      tender: {
        id: 1,
        name: "Tender Document Template",
        documentType: "tender",
        fields: [
          {
            name: "tenderNumber",
            type: "text",
            required: true,
            extractionHints: [
              "tender number",
              "reference number",
              "RFP number",
            ],
            validationPattern: "^[A-Z0-9-]+$",
          },
          {
            name: "title",
            type: "text",
            required: true,
            extractionHints: ["title", "subject", "tender title"],
          },
          {
            name: "submissionDeadline",
            type: "date",
            required: true,
            extractionHints: [
              "submission deadline",
              "due date",
              "closing date",
            ],
          },
          {
            name: "estimatedValue",
            type: "currency",
            required: false,
            extractionHints: ["estimated value", "budget", "maximum amount"],
          },
          {
            name: "requirements",
            type: "table",
            required: true,
            extractionHints: ["requirements", "specifications", "items needed"],
          },
        ],
        aiPrompt:
          "Focus on extracting tender-specific information including deadlines, requirements, and evaluation criteria.",
        validationRules: [
          { field: "tenderNumber", rule: "required", parameters: {} },
          {
            field: "submissionDeadline",
            rule: "format",
            parameters: { pattern: "\\d{4}-\\d{2}-\\d{2}" },
          },
        ],
      },
      invoice: {
        id: 2,
        name: "Invoice Template",
        documentType: "invoice",
        fields: [
          {
            name: "invoiceNumber",
            type: "text",
            required: true,
            extractionHints: ["invoice number", "invoice #", "bill number"],
          },
          {
            name: "supplierName",
            type: "text",
            required: true,
            extractionHints: ["supplier", "vendor", "from", "company name"],
          },
          {
            name: "invoiceDate",
            type: "date",
            required: true,
            extractionHints: ["invoice date", "date", "issued date"],
          },
          {
            name: "dueDate",
            type: "date",
            required: true,
            extractionHints: ["due date", "payment due", "pay by"],
          },
          {
            name: "totalAmount",
            type: "currency",
            required: true,
            extractionHints: ["total", "amount due", "total amount"],
          },
          {
            name: "lineItems",
            type: "table",
            required: true,
            extractionHints: ["line items", "products", "services", "items"],
          },
        ],
        aiPrompt:
          "Extract invoice details including line items with quantities, unit prices, and totals.",
        validationRules: [
          {
            field: "supplierName",
            rule: "cross_reference",
            parameters: { type: "supplier" },
          },
          {
            field: "totalAmount",
            rule: "range",
            parameters: { min: 0, max: 1000000 },
          },
        ],
      },
      price_list: {
        id: 3,
        name: "Price List Template",
        documentType: "price_list",
        fields: [
          {
            name: "supplierName",
            type: "text",
            required: true,
            extractionHints: ["supplier", "company", "vendor name"],
          },
          {
            name: "effectiveDate",
            type: "date",
            required: true,
            extractionHints: ["effective date", "valid from", "price date"],
          },
          {
            name: "expiryDate",
            type: "date",
            required: false,
            extractionHints: ["expiry date", "valid until", "expires"],
          },
          {
            name: "currency",
            type: "text",
            required: true,
            extractionHints: ["currency", "USD", "EUR", "SAR"],
          },
          {
            name: "products",
            type: "table",
            required: true,
            extractionHints: ["products", "items", "price list", "catalog"],
          },
        ],
        aiPrompt:
          "Extract product pricing information including SKUs, descriptions, and unit prices.",
        validationRules: [
          {
            field: "supplierName",
            rule: "cross_reference",
            parameters: { type: "supplier" },
          },
        ],
      },
      catalog: {
        id: 4,
        name: "Product Catalog Template",
        documentType: "catalog",
        fields: [
          {
            name: "supplierName",
            type: "text",
            required: true,
            extractionHints: ["supplier", "manufacturer", "company"],
          },
          {
            name: "catalogDate",
            type: "date",
            required: false,
            extractionHints: ["catalog date", "version date", "updated"],
          },
          {
            name: "products",
            type: "table",
            required: true,
            extractionHints: ["products", "items", "catalog", "specifications"],
          },
        ],
        aiPrompt:
          "Extract detailed product information including specifications, features, and technical details.",
        validationRules: [],
      },
    };

    return templates[documentType] || templates.tender;
  }

  /**
   * Auto-populate fields in related entities
   */
  async autoPopulateFields(
    documentId: number,
    extractedData: ExtractedData
  ): Promise<void> {
    const document = await db.getDocumentById(documentId);
    if (!document) return;

    switch (document.entityType) {
      case "tender":
        await this.populateTenderFields(document.entityId, extractedData);
        break;
      case "invoice":
        await this.populateInvoiceFields(document.entityId, extractedData);
        break;
      case "supplier":
        await this.populateSupplierFields(document.entityId, extractedData);
        break;
    }
  }

  /**
   * Populate tender fields from extracted data
   */
  private async populateTenderFields(
    tenderId: number,
    extractedData: ExtractedData
  ): Promise<void> {
    const updates: any = {};

    if (extractedData.title?.value) {
      updates.title = extractedData.title.value;
    }
    if (extractedData.submissionDeadline?.value) {
      updates.submissionDeadline = new Date(
        extractedData.submissionDeadline.value
      );
    }
    if (extractedData.estimatedValue?.value) {
      updates.estimatedValue =
        parseFloat(extractedData.estimatedValue.value) * 100; // Convert to cents
    }
    if (extractedData.requirements?.value) {
      updates.requirements = extractedData.requirements.value;
    }

    if (Object.keys(updates).length > 0) {
      await db.updateTender(tenderId, updates);
    }
  }

  /**
   * Populate invoice fields from extracted data
   */
  private async populateInvoiceFields(
    invoiceId: number,
    extractedData: ExtractedData
  ): Promise<void> {
    const updates: any = {};

    if (extractedData.invoiceDate?.value) {
      updates.issueDate = new Date(extractedData.invoiceDate.value);
    }
    if (extractedData.dueDate?.value) {
      updates.dueDate = new Date(extractedData.dueDate.value);
    }
    if (extractedData.totalAmount?.value) {
      updates.totalAmount = parseFloat(extractedData.totalAmount.value) * 100; // Convert to cents
    }

    if (Object.keys(updates).length > 0) {
      await db.updateInvoice(invoiceId, updates);
    }
  }

  /**
   * Populate supplier fields from extracted data
   */
  private async populateSupplierFields(
    supplierId: number,
    extractedData: ExtractedData
  ): Promise<void> {
    // Implementation for populating supplier catalog data
    console.log("Populating supplier fields:", supplierId, extractedData);
  }
}

export const aiDocumentProcessor = new AIDocumentProcessor();
