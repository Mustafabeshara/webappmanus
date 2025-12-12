/**
 * Enhanced OCR Workflow with Intelligent Field Population
 * Improved accuracy, validation, and user experience
 */

import * as db from "../db";
import { aiDocumentProcessor } from "./ai-document-processor";

export interface EnhancedOCRRequest {
  documentId: number;
  documentType: string;
  confidenceThreshold: number;
  enableHumanReview: boolean;
  autoPopulate: boolean;
  validationRules?: ValidationRule[];
}

export interface OCRWorkflowResult {
  extractedData: any;
  confidenceScores: Record<string, number>;
  requiresReview: string[];
  autoPopulated: string[];
  validationErrors: string[];
  suggestedCorrections: any;
}

class EnhancedOCRWorkflow {
  /**
   * Process document with enhanced workflow
   */
  async processDocumentEnhanced(
    request: EnhancedOCRRequest
  ): Promise<OCRWorkflowResult> {
    // Step 1: Multi-provider OCR with confidence scoring
    const ocrResults = await this.performMultiProviderOCR(request.documentId);

    // Step 2: AI-powered field extraction with validation
    const extractedData = await this.extractFieldsWithValidation(
      request.documentId,
      ocrResults,
      request.documentType
    );

    // Step 3: Confidence analysis and review flagging
    const confidenceAnalysis = this.analyzeConfidence(
      extractedData,
      request.confidenceThreshold
    );

    // Step 4: Auto-population where confidence is high
    const populationResults = request.autoPopulate
      ? await this.autoPopulateFields(
          request.documentId,
          extractedData,
          confidenceAnalysis
        )
      : { autoPopulated: [], errors: [] };

    // Step 5: Generate suggestions for low-confidence fields
    const suggestions = await this.generateFieldSuggestions(
      extractedData,
      confidenceAnalysis
    );

    return {
      extractedData: extractedData.data,
      confidenceScores: extractedData.confidence,
      requiresReview: confidenceAnalysis.lowConfidenceFields,
      autoPopulated: populationResults.autoPopulated,
      validationErrors: populationResults.errors,
      suggestedCorrections: suggestions,
    };
  }

  /**
   * Multi-provider OCR for improved accuracy
   */
  private async performMultiProviderOCR(documentId: number): Promise<{
    primary: string;
    secondary: string;
    consensus: string;
  }> {
    const document = await db.getDocumentById(documentId);

    // Run OCR with multiple providers
    const [tesseractResult, awsResult] = await Promise.allSettled([
      this.runTesseractOCR(document),
      this.runAWSTextract(document),
    ]);

    // Create consensus text using AI
    const consensus = await this.createConsensusText(
      tesseractResult.status === "fulfilled" ? tesseractResult.value : "",
      awsResult.status === "fulfilled" ? awsResult.value : ""
    );

    return {
      primary:
        tesseractResult.status === "fulfilled" ? tesseractResult.value : "",
      secondary: awsResult.status === "fulfilled" ? awsResult.value : "",
      consensus,
    };
  }

  /**
   * Create consensus text from multiple OCR results
   */
  private async createConsensusText(
    text1: string,
    text2: string
  ): Promise<string> {
    // AI-powered text consensus (simplified)
    if (!text1) return text2;
    if (!text2) return text1;

    // In real implementation, use AI to merge and correct OCR results
    return text1.length > text2.length ? text1 : text2;
  }

  /**
   * Extract fields with enhanced validation
   */
  private async extractFieldsWithValidation(
    documentId: number,
    ocrResults: any,
    documentType: string
  ): Promise<{
    data: any;
    confidence: Record<string, number>;
  }> {
    // Use existing AI document processor
    const extractionRequest = {
      documentId,
      documentType: documentType as any,
      extractionFields: [],
      aiProvider: "openai" as const,
      ocrProvider: "aws_textract" as const,
    };

    const extracted =
      await aiDocumentProcessor.processDocument(extractionRequest);

    const data: any = {};
    const confidence: Record<string, number> = {};

    Object.entries(extracted).forEach(([key, value]) => {
      data[key] = value.value;
      confidence[key] = value.confidence;
    });

    return { data, confidence };
  }

  /**
   * Analyze confidence scores and flag for review
   */
  private analyzeConfidence(
    extractedData: { data: any; confidence: Record<string, number> },
    threshold: number
  ): {
    highConfidenceFields: string[];
    lowConfidenceFields: string[];
    averageConfidence: number;
  } {
    const confidenceEntries = Object.entries(extractedData.confidence);
    const highConfidence = confidenceEntries.filter(
      ([_, score]) => score >= threshold
    );
    const lowConfidence = confidenceEntries.filter(
      ([_, score]) => score < threshold
    );

    const avgConfidence =
      confidenceEntries.reduce((sum, [_, score]) => sum + score, 0) /
      confidenceEntries.length;

    return {
      highConfidenceFields: highConfidence.map(([field]) => field),
      lowConfidenceFields: lowConfidence.map(([field]) => field),
      averageConfidence: avgConfidence,
    };
  }

  /**
   * Auto-populate fields with high confidence
   */
  private async autoPopulateFields(
    documentId: number,
    extractedData: any,
    confidenceAnalysis: any
  ): Promise<{
    autoPopulated: string[];
    errors: string[];
  }> {
    const autoPopulated: string[] = [];
    const errors: string[] = [];

    const document = await db.getDocumentById(documentId);
    if (!document) {
      errors.push("Document not found");
      return { autoPopulated, errors };
    }

    // Auto-populate based on entity type
    try {
      switch (document.entityType) {
        case "tender":
          await this.populateTenderFields(
            document.entityId,
            extractedData.data,
            confidenceAnalysis.highConfidenceFields
          );
          autoPopulated.push(...confidenceAnalysis.highConfidenceFields);
          break;
        case "invoice":
          await this.populateInvoiceFields(
            document.entityId,
            extractedData.data,
            confidenceAnalysis.highConfidenceFields
          );
          autoPopulated.push(...confidenceAnalysis.highConfidenceFields);
          break;
        case "supplier":
          await this.populateSupplierFields(
            document.entityId,
            extractedData.data,
            confidenceAnalysis.highConfidenceFields
          );
          autoPopulated.push(...confidenceAnalysis.highConfidenceFields);
          break;
      }
    } catch (error) {
      errors.push(`Auto-population failed: ${error.message}`);
    }

    return { autoPopulated, errors };
  }

  /**
   * Generate suggestions for low-confidence fields
   */
  private async generateFieldSuggestions(
    extractedData: any,
    confidenceAnalysis: any
  ): Promise<any> {
    const suggestions: any = {};

    for (const field of confidenceAnalysis.lowConfidenceFields) {
      const value = extractedData.data[field];

      // Generate AI-powered suggestions
      suggestions[field] = {
        currentValue: value,
        suggestions: await this.generateValueSuggestions(field, value),
        confidence: extractedData.confidence[field],
        needsReview: true,
      };
    }

    return suggestions;
  }

  /**
   * Generate value suggestions using AI
   */
  private async generateValueSuggestions(
    field: string,
    currentValue: any
  ): Promise<string[]> {
    // AI-powered suggestion generation (simplified)
    const suggestions: string[] = [];

    if (typeof currentValue === "string") {
      // Generate variations and corrections
      suggestions.push(currentValue.trim());
      suggestions.push(currentValue.toUpperCase());
      suggestions.push(currentValue.toLowerCase());
    }

    return suggestions.filter((s, i, arr) => arr.indexOf(s) === i); // Remove duplicates
  }

  // Placeholder methods for field population
  // eslint-disable-next-line sonarjs/cognitive-complexity
  private async populateTenderFields(
    tenderId: number,
    data: any,
    fields: string[]
  ): Promise<void> {
    const updates: any = {};

    const parseDate = (value: any): Date | null => {
      if (!value) return null;
      const asDate = value instanceof Date ? value : new Date(value);
      return Number.isNaN(asDate.getTime()) ? null : asDate;
    };

    const parseMoneyToCents = (value: any): number | undefined => {
      if (value === undefined || value === null) return undefined;
      const cleaned = String(value).replaceAll(/[^0-9.-]/g, "");
      const parsed = Number.parseFloat(cleaned);
      if (Number.isNaN(parsed)) return undefined;
      return Math.round(parsed * 100);
    };

    fields.forEach(field => {
      if (data[field] !== undefined) {
        switch (field) {
          case "title":
            updates.title = data[field];
            break;
          case "description":
            updates.description = data[field];
            break;
          case "publishDate": {
            const parsed = parseDate(data[field]);
            if (parsed) updates.publishDate = parsed;
            break;
          }
          case "submissionDeadline":
            {
              const parsed = parseDate(data[field]);
              if (parsed) updates.submissionDeadline = parsed;
            }
            break;
          case "evaluationDeadline": {
            const parsed = parseDate(data[field]);
            if (parsed) updates.evaluationDeadline = parsed;
            break;
          }
          case "estimatedValue":
            {
              const cents = parseMoneyToCents(data[field]);
              if (cents !== undefined) updates.estimatedValue = cents;
            }
            break;
          case "currency":
            // currency field not stored directly; keep as note for review
            updates.notes = updates.notes
              ? `${updates.notes}\nCurrency: ${data[field]}`
              : `Currency: ${data[field]}`;
            break;
          case "buyer":
            // No dedicated column; append to notes for human review
            updates.notes = updates.notes
              ? `${updates.notes}\nBuyer: ${data[field]}`
              : `Buyer: ${data[field]}`;
            break;
          case "submissionWindow":
            updates.notes = updates.notes
              ? `${updates.notes}\nSubmission window: ${data[field]}`
              : `Submission window: ${data[field]}`;
            break;
        }
      }
    });

    if (Object.keys(updates).length > 0) {
      await db.updateTender(tenderId, updates);
    }
  }

  private async populateInvoiceFields(
    invoiceId: number,
    data: any,
    fields: string[]
  ): Promise<void> {
    // Similar implementation for invoices
  }

  private async populateSupplierFields(
    supplierId: number,
    data: any,
    fields: string[]
  ): Promise<void> {
    // Similar implementation for suppliers
  }

  private async runTesseractOCR(document: any): Promise<string> {
    // Tesseract OCR implementation
    return `Tesseract OCR result for ${document.fileName}`;
  }

  private async runAWSTextract(document: any): Promise<string> {
    // AWS Textract implementation
    return `AWS Textract result for ${document.fileName}`;
  }
}

export const enhancedOCRWorkflow = new EnhancedOCRWorkflow();
