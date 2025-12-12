/* eslint-disable no-case-declarations */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  router,
  protectedProcedure,
  protectedMutationProcedure,
  uploadProcedure,
} from "../_core/trpc";
import * as db from "../db";
import { storagePut } from "../_core/storage";
import {
  extractCatalogData,
  extractExpenseData,
  extractInvoiceData,
  extractPriceListData,
  extractPurchaseOrderData,
  extractTenderData,
  performOCR,
} from "../aiService";
import { extractTenderFromBase64 as ocrServiceExtractFromBase64 } from "../ocr";

// Helper functions for document data extraction
function extractCompanyName(text: string): string {
  // Look for common patterns in company documents
  const patterns = [
    /(?:company\s+name|business\s+name|registered\s+name)[\s:]+([^\n]+)/i,
    /(?:^|\n)([A-Z][A-Za-z\s&]+(?:LLC|Ltd|Inc|Corp|Co\.?|Company))/m,
    /(?:name|company)[\s:]+([A-Z][A-Za-z\s&]+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return "";
}

function extractTaxId(text: string): string {
  // Look for tax ID patterns (various formats)
  const patterns = [
    /(?:tax\s*id|tin|vat|cr\s*no|registration\s*no|cr)[\s:]*([A-Z0-9-]{5,20})/i,
    /\b(\d{2,3}[-\s]?\d{7,10})\b/, // Common tax ID format
    /(?:registration|license)\s*(?:number|no|#)?[\s:]*([A-Z0-9-]{5,20})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return "";
}

function extractEmail(text: string): string {
  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
  const match = text.match(emailPattern);
  return match ? match[0].toLowerCase() : "";
}

function extractPhone(text: string): string {
  const phonePatterns = [
    /(?:tel|phone|mobile|contact)[\s:]*([+\d\s()-]{10,20})/i,
    /\b(\+?\d{1,4}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9})\b/,
  ];

  for (const pattern of phonePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const cleaned = match[1].replace(/\s+/g, " ").trim();
      if (cleaned.length >= 10) {
        return cleaned;
      }
    }
  }
  return "";
}

function extractAddress(text: string): string {
  const patterns = [
    /(?:address|location|office)[\s:]+([^\n]{10,100})/i,
    /(?:p\.?o\.?\s*box|po\s+box)[\s:]*(\d+[^\n]{5,50})/i,
    /(\d+[^\n]{10,80}(?:street|st|road|rd|avenue|ave|blvd|way|drive|dr)[^\n]{0,50})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return "";
}

function extractCatalogName(text: string, fileName: string): string {
  // Try to extract from text first
  const patterns = [
    /(?:catalog|catalogue|price\s*list|product\s*list)[\s:]+([^\n]{5,50})/i,
    /(?:version|edition|issue)[\s:]+([^\n]{5,30})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  // Fall back to filename
  const cleanName = fileName
    .replace(/\.[^.]+$/, "") // Remove extension
    .replace(/[-_]/g, " ")
    .replace(/\d{8,}/g, "") // Remove long numbers (timestamps)
    .trim();

  return cleanName || "Product Catalog";
}

function extractDate(text: string): string {
  const datePatterns = [
    /(?:date|effective|valid\s+from|as\s+of)[\s:]+(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i,
    /(\d{4}[-/]\d{1,2}[-/]\d{1,2})/,
    /(\d{1,2}[-/]\d{1,2}[-/]\d{4})/,
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return "";
}

function extractCurrency(text: string): string {
  const currencyPatterns = [
    /(?:currency|prices?\s+in)[\s:]+([A-Z]{3})/i,
    /\b(USD|EUR|GBP|SAR|AED|QAR|KWD|BHD)\b/i,
    /[$€£]\s*\d/,
  ];

  for (const pattern of currencyPatterns) {
    const match = text.match(pattern);
    if (match) {
      if (match[1]) return match[1].toUpperCase();
      if (match[0].includes("$")) return "USD";
      if (match[0].includes("€")) return "EUR";
      if (match[0].includes("£")) return "GBP";
    }
  }
  return "USD"; // Default
}

export const documentsRouter = router({
  folders: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllDocumentFolders();
    }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string(),
          category: z.string(),
          parentId: z.number().optional(),
          requiredDocuments: z.string().optional(),
          reminderEnabled: z.boolean().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        await db.createDocumentFolder({
          ...input,
          createdBy: ctx.user.id,
        } as any);
        return { success: true };
      }),
  }),

  byEntity: protectedProcedure
    .input(
      z.object({
        entityType: z.string(),
        entityId: z.number(),
      })
    )
    .query(async ({ input }) => {
      return await db.getDocumentsByEntity(input.entityType, input.entityId);
    }),

  upload: uploadProcedure
    .input(
      z.object({
        entityType: z.string(),
        entityId: z.number(),
        folderId: z.number().optional(),
        fileName: z.string(),
        fileData: z.string(), // base64
        mimeType: z.string(),
        documentType: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Upload to S3
      const buffer = Buffer.from(input.fileData, "base64");
      const fileKey = `documents/${input.entityType}/${input.entityId}/${Date.now()}-${input.fileName}`;
      const { url } = await storagePut(fileKey, buffer, input.mimeType);

      // Save document record
      const result = await db.createDocument({
        folderId: input.folderId,
        entityType: input.entityType,
        entityId: input.entityId,
        fileName: input.fileName,
        fileKey,
        fileUrl: url,
        fileSize: buffer.length,
        mimeType: input.mimeType,
        documentType: input.documentType,
        uploadedBy: ctx.user.id,
      } as any);

      const documentId = Number(result.insertId);

      return { success: true, documentId, fileUrl: url };
    }),

  // Extract data from base64 file (for upload wizard)
  extractFromBase64: protectedProcedure
    .input(
      z.object({
        fileData: z.string(), // base64 encoded file
        fileName: z.string(),
        documentType: z.enum([
          "tenders",
          "invoices",
          "suppliers",
          "products",
          "expenses",
          "pricing",
          "purchase_orders",
          "contracts",
        ]),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Convert base64 to buffer
        const buffer = Buffer.from(input.fileData, "base64");
        const isPDF = input.fileName.toLowerCase().endsWith(".pdf");
        const isImage =
          input.fileName.toLowerCase().endsWith(".png") ||
          input.fileName.toLowerCase().endsWith(".jpg") ||
          input.fileName.toLowerCase().endsWith(".jpeg");

        let documentText = "";
        let ocrProvider = "none";

        // Perform OCR if needed
        if (isPDF || isImage) {
          // Use the existing OCR service
          const ocrResult = await ocrServiceExtractFromBase64(
            input.fileData,
            input.fileName,
            { department: "Biomedical Engineering" }
          );

          if (ocrResult.success && ocrResult.data) {
            documentText = ocrResult.data.raw_text || "";
            ocrProvider = ocrResult.data.extraction_method || "tesseract";
          }
        }

        // Extract data based on document type
        let extractedData: Record<
          string,
          { value: any; confidence: number; source: string }
        > = {};

        switch (input.documentType) {
          case "tenders":
            const tenderResult = await extractTenderData(documentText, "");
            if (tenderResult.success && tenderResult.data) {
              extractedData = {
                tenderNumber: {
                  value: tenderResult.data.referenceNumber || "",
                  confidence: tenderResult.confidence?.referenceNumber || 0.7,
                  source: "ai_inference",
                },
                title: {
                  value: tenderResult.data.title || "",
                  confidence: tenderResult.confidence?.title || 0.7,
                  source: "ai_inference",
                },
                submissionDeadline: {
                  value: tenderResult.data.closingDate || "",
                  confidence: tenderResult.confidence?.closingDate || 0.7,
                  source: "ai_inference",
                },
                department: {
                  value: tenderResult.data.department || "",
                  confidence: tenderResult.confidence?.department || 0.6,
                  source: "ai_inference",
                },
                estimatedValue: {
                  value: tenderResult.data.estimatedValue || "",
                  confidence: 0.5,
                  source: "ai_inference",
                },
              };
            }
            break;

          case "invoices":
            const invoiceResult = await extractInvoiceData(documentText);
            if (invoiceResult.success && invoiceResult.data) {
              extractedData = {
                invoiceNumber: {
                  value: invoiceResult.data.invoiceNumber || "",
                  confidence: invoiceResult.confidence?.invoiceNumber || 0.8,
                  source: "ai_inference",
                },
                invoiceDate: {
                  value: invoiceResult.data.invoiceDate || "",
                  confidence: invoiceResult.confidence?.invoiceDate || 0.7,
                  source: "ai_inference",
                },
                dueDate: {
                  value: invoiceResult.data.dueDate || "",
                  confidence: invoiceResult.confidence?.dueDate || 0.7,
                  source: "ai_inference",
                },
                supplierName: {
                  value: invoiceResult.data.supplierName || "",
                  confidence: invoiceResult.confidence?.supplierName || 0.7,
                  source: "ai_inference",
                },
                supplierAddress: {
                  value: invoiceResult.data.supplierAddress || "",
                  confidence:
                    invoiceResult.confidence?.supplierAddress || 0.6,
                  source: "ai_inference",
                },
                supplierTaxId: {
                  value: invoiceResult.data.supplierTaxId || "",
                  confidence: invoiceResult.confidence?.supplierTaxId || 0.7,
                  source: "ai_inference",
                },
                customerName: {
                  value: invoiceResult.data.customerName || "",
                  confidence: invoiceResult.confidence?.customerName || 0.6,
                  source: "ai_inference",
                },
                purchaseOrderNumber: {
                  value: invoiceResult.data.purchaseOrderNumber || "",
                  confidence:
                    invoiceResult.confidence?.purchaseOrderNumber || 0.7,
                  source: "ai_inference",
                },
                currency: {
                  value:
                    invoiceResult.data.currency ||
                    extractCurrency(documentText),
                  confidence: invoiceResult.confidence?.currency || 0.7,
                  source: "ai_inference",
                },
                subtotal: {
                  value: invoiceResult.data.subtotal || 0,
                  confidence: invoiceResult.confidence?.subtotal || 0.7,
                  source: "ai_inference",
                },
                taxRate: {
                  value: invoiceResult.data.taxRate || 0,
                  confidence: invoiceResult.confidence?.taxRate || 0.6,
                  source: "ai_inference",
                },
                taxAmount: {
                  value: invoiceResult.data.taxAmount || 0,
                  confidence: invoiceResult.confidence?.taxAmount || 0.7,
                  source: "ai_inference",
                },
                discountAmount: {
                  value: invoiceResult.data.discountAmount || 0,
                  confidence: invoiceResult.confidence?.discountAmount || 0.6,
                  source: "ai_inference",
                },
                totalAmount: {
                  value: invoiceResult.data.totalAmount || 0,
                  confidence: invoiceResult.confidence?.totalAmount || 0.8,
                  source: "ai_inference",
                },
                paymentTerms: {
                  value: invoiceResult.data.paymentTerms || "",
                  confidence: invoiceResult.confidence?.paymentTerms || 0.6,
                  source: "ai_inference",
                },
                items: {
                  value: (invoiceResult.data as Record<string, unknown>).items || [],
                  confidence: invoiceResult.confidence?.items || 0.7,
                  source: "ai_inference",
                },
                itemCount: {
                  value: Array.isArray((invoiceResult.data as Record<string, unknown>).items)
                    ? ((invoiceResult.data as Record<string, unknown>).items as unknown[]).length
                    : 0,
                  confidence: 0.9,
                  source: "ai_inference",
                },
              };
            }
            break;

          case "expenses":
            const expenseResult = await extractExpenseData(documentText);
            if (expenseResult.success && expenseResult.data) {
              extractedData = {
                amount: {
                  value: expenseResult.data.amount || "",
                  confidence: expenseResult.confidence?.amount || 0.8,
                  source: "ai_inference",
                },
                date: {
                  value: expenseResult.data.date || "",
                  confidence: expenseResult.confidence?.date || 0.7,
                  source: "ai_inference",
                },
                category: {
                  value: expenseResult.data.category || "",
                  confidence: expenseResult.confidence?.category || 0.6,
                  source: "ai_inference",
                },
                description: {
                  value: expenseResult.data.description || "",
                  confidence: expenseResult.confidence?.description || 0.6,
                  source: "ai_inference",
                },
              };
            }
            break;

          case "suppliers":
            // Extract supplier info from document
            extractedData = {
              name: {
                value: extractCompanyName(documentText),
                confidence: 0.7,
                source: "ai_inference",
              },
              taxId: {
                value: extractTaxId(documentText),
                confidence: 0.8,
                source: "ocr",
              },
              email: {
                value: extractEmail(documentText),
                confidence: 0.9,
                source: "ocr",
              },
              phone: {
                value: extractPhone(documentText),
                confidence: 0.8,
                source: "ocr",
              },
              address: {
                value: extractAddress(documentText),
                confidence: 0.6,
                source: "ai_inference",
              },
            };
            break;

          case "pricing":
            // Extract price list data with AI
            const priceListResult = await extractPriceListData(documentText);
            if (priceListResult.success && priceListResult.data) {
              extractedData = {
                supplierName: {
                  value: priceListResult.data.supplierName || "",
                  confidence: priceListResult.confidence?.supplierName || 0.7,
                  source: "ai_inference",
                },
                priceListName: {
                  value:
                    priceListResult.data.priceListName ||
                    extractCatalogName(documentText, input.fileName),
                  confidence:
                    priceListResult.confidence?.priceListName || 0.6,
                  source: "ai_inference",
                },
                effectiveDate: {
                  value:
                    priceListResult.data.effectiveDate ||
                    extractDate(documentText),
                  confidence:
                    priceListResult.confidence?.effectiveDate || 0.5,
                  source: "ai_inference",
                },
                expiryDate: {
                  value: priceListResult.data.expiryDate || "",
                  confidence: priceListResult.confidence?.expiryDate || 0.5,
                  source: "ai_inference",
                },
                currency: {
                  value:
                    priceListResult.data.currency ||
                    extractCurrency(documentText),
                  confidence: priceListResult.confidence?.currency || 0.7,
                  source: "ai_inference",
                },
                discountTerms: {
                  value: priceListResult.data.discountTerms || "",
                  confidence:
                    priceListResult.confidence?.discountTerms || 0.6,
                  source: "ai_inference",
                },
                products: {
                  value: (priceListResult.data as Record<string, unknown>).products || [],
                  confidence: priceListResult.confidence?.products || 0.7,
                  source: "ai_inference",
                },
                productCount: {
                  value: Array.isArray((priceListResult.data as Record<string, unknown>).products)
                    ? ((priceListResult.data as Record<string, unknown>).products as unknown[]).length
                    : 0,
                  confidence: 0.9,
                  source: "ai_inference",
                },
              };
            } else {
              // Fallback to basic extraction
              extractedData = {
                priceListName: {
                  value: extractCatalogName(documentText, input.fileName),
                  confidence: 0.6,
                  source: "ai_inference",
                },
                effectiveDate: {
                  value: extractDate(documentText),
                  confidence: 0.5,
                  source: "ai_inference",
                },
                currency: {
                  value: extractCurrency(documentText),
                  confidence: 0.7,
                  source: "ocr",
                },
              };
            }
            break;

          case "products":
            // Extract product catalog data with AI
            const catalogResult = await extractCatalogData(documentText);
            if (catalogResult.success && catalogResult.data) {
              extractedData = {
                supplierName: {
                  value: catalogResult.data.supplierName || "",
                  confidence: catalogResult.confidence?.supplierName || 0.7,
                  source: "ai_inference",
                },
                catalogName: {
                  value:
                    catalogResult.data.catalogName ||
                    extractCatalogName(documentText, input.fileName),
                  confidence: catalogResult.confidence?.catalogName || 0.6,
                  source: "ai_inference",
                },
                catalogDate: {
                  value:
                    catalogResult.data.catalogDate ||
                    extractDate(documentText),
                  confidence: catalogResult.confidence?.catalogDate || 0.5,
                  source: "ai_inference",
                },
                categories: {
                  value: catalogResult.data.categories || [],
                  confidence: catalogResult.confidence?.categories || 0.7,
                  source: "ai_inference",
                },
                products: {
                  value: (catalogResult.data as Record<string, unknown>).products || [],
                  confidence: catalogResult.confidence?.products || 0.7,
                  source: "ai_inference",
                },
                productCount: {
                  value: Array.isArray((catalogResult.data as Record<string, unknown>).products)
                    ? ((catalogResult.data as Record<string, unknown>).products as unknown[]).length
                    : 0,
                  confidence: 0.9,
                  source: "ai_inference",
                },
              };
            } else {
              // Fallback to basic extraction
              extractedData = {
                catalogName: {
                  value: extractCatalogName(documentText, input.fileName),
                  confidence: 0.6,
                  source: "ai_inference",
                },
                effectiveDate: {
                  value: extractDate(documentText),
                  confidence: 0.5,
                  source: "ai_inference",
                },
                currency: {
                  value: extractCurrency(documentText),
                  confidence: 0.7,
                  source: "ocr",
                },
              };
            }
            break;

          case "purchase_orders":
            // Extract purchase order data with AI
            const poResult = await extractPurchaseOrderData(documentText);
            if (poResult.success && poResult.data) {
              extractedData = {
                poNumber: {
                  value: poResult.data.poNumber || "",
                  confidence: poResult.confidence?.poNumber || 0.8,
                  source: "ai_inference",
                },
                poDate: {
                  value: poResult.data.poDate || extractDate(documentText),
                  confidence: poResult.confidence?.poDate || 0.7,
                  source: "ai_inference",
                },
                supplierName: {
                  value:
                    poResult.data.supplierName ||
                    extractCompanyName(documentText),
                  confidence: poResult.confidence?.supplierName || 0.7,
                  source: "ai_inference",
                },
                supplierAddress: {
                  value:
                    poResult.data.supplierAddress ||
                    extractAddress(documentText),
                  confidence: poResult.confidence?.supplierAddress || 0.6,
                  source: "ai_inference",
                },
                deliveryDate: {
                  value: poResult.data.deliveryDate || "",
                  confidence: poResult.confidence?.deliveryDate || 0.6,
                  source: "ai_inference",
                },
                deliveryAddress: {
                  value: poResult.data.deliveryAddress || "",
                  confidence: poResult.confidence?.deliveryAddress || 0.6,
                  source: "ai_inference",
                },
                currency: {
                  value:
                    poResult.data.currency || extractCurrency(documentText),
                  confidence: poResult.confidence?.currency || 0.7,
                  source: "ai_inference",
                },
                subtotal: {
                  value: poResult.data.subtotal || 0,
                  confidence: poResult.confidence?.subtotal || 0.7,
                  source: "ai_inference",
                },
                taxAmount: {
                  value: poResult.data.taxAmount || 0,
                  confidence: poResult.confidence?.taxAmount || 0.6,
                  source: "ai_inference",
                },
                totalAmount: {
                  value: poResult.data.totalAmount || 0,
                  confidence: poResult.confidence?.totalAmount || 0.8,
                  source: "ai_inference",
                },
                items: {
                  value: (poResult.data as Record<string, unknown>).items || [],
                  confidence: poResult.confidence?.items || 0.7,
                  source: "ai_inference",
                },
                itemCount: {
                  value: Array.isArray((poResult.data as Record<string, unknown>).items)
                    ? ((poResult.data as Record<string, unknown>).items as unknown[]).length
                    : 0,
                  confidence: 0.9,
                  source: "ai_inference",
                },
                paymentTerms: {
                  value: poResult.data.paymentTerms || "",
                  confidence: poResult.confidence?.paymentTerms || 0.6,
                  source: "ai_inference",
                },
                notes: {
                  value: poResult.data.notes || "",
                  confidence: poResult.confidence?.notes || 0.5,
                  source: "ai_inference",
                },
              };
            } else {
              // Fallback to basic extraction
              extractedData = {
                poNumber: {
                  value: "",
                  confidence: 0.5,
                  source: "ocr",
                },
                poDate: {
                  value: extractDate(documentText),
                  confidence: 0.5,
                  source: "ocr",
                },
                supplierName: {
                  value: extractCompanyName(documentText),
                  confidence: 0.6,
                  source: "ai_inference",
                },
              };
            }
            break;

          case "contracts":
            // Extract contract data with basic extraction
            extractedData = {
              contractNumber: {
                value: "",
                confidence: 0.5,
                source: "ai_inference",
              },
              contractDate: {
                value: extractDate(documentText),
                confidence: 0.5,
                source: "ai_inference",
              },
              partyA: {
                value: extractCompanyName(documentText),
                confidence: 0.6,
                source: "ai_inference",
              },
              partyB: {
                value: "",
                confidence: 0.5,
                source: "ai_inference",
              },
            };
            break;

          default:
            // Generic extraction for other types
            extractedData = {
              rawText: {
                value: documentText.substring(0, 500),
                confidence: 0.5,
                source: "ocr",
              },
            };
        }

        return {
          success: true,
          extractedData,
          ocrProvider,
          documentText: documentText.substring(0, 2000), // Return first 2000 chars for preview
        };
      } catch (error) {
        console.error("[Document Extraction] Error:", error);
        return {
          success: false,
          extractedData: {},
          error: error instanceof Error ? error.message : "Extraction failed",
        };
      }
    }),

  extractData: protectedProcedure
    .input(
      z.object({
        documentId: z.number(),
        extractionType: z.enum(["tender", "invoice", "expense"]),
      })
    )
    .mutation(async ({ input }) => {
      const document = await db.getDocumentById(input.documentId);

      if (!document)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found",
        });

      // Update document status
      await db.updateDocument(input.documentId, {
        extractionStatus: "processing",
      });

      try {
        // Perform OCR if needed
        let documentText = "";
        if (
          document.mimeType?.startsWith("image/") ||
          document.mimeType === "application/pdf"
        ) {
          const ocrResult = await performOCR(document.fileUrl);
          if (!ocrResult.success) {
            throw new Error("OCR failed");
          }
          documentText = ocrResult.text;
        }

        // Extract data based on type
        let extractionResult;
        switch (input.extractionType) {
          case "tender":
            extractionResult = await extractTenderData(
              documentText,
              document.fileUrl
            );
            break;
          case "invoice":
            extractionResult = await extractInvoiceData(documentText);
            break;
          case "expense":
            extractionResult = await extractExpenseData(documentText);
            break;
        }

        if (!extractionResult.success) {
          throw new Error("Extraction failed");
        }

        // Save extraction result
        await db.createExtractionResult({
          documentId: input.documentId,
          extractedData: JSON.stringify(extractionResult.data),
          confidenceScores: JSON.stringify(extractionResult.confidence),
          provider: extractionResult.provider,
          ocrProvider: extractionResult.ocrProvider,
        } as any);

        // Update document status
        await db.updateDocument(input.documentId, {
          extractionStatus: "completed",
        });

        return {
          success: true,
          data: extractionResult.data,
          confidence: extractionResult.confidence,
        };
      } catch (error) {
        await db.updateDocument(input.documentId, {
          extractionStatus: "failed",
        });
        throw error;
      }
    }),

  getExtraction: protectedProcedure
    .input(z.object({ documentId: z.number() }))
    .query(async ({ input }) => {
      return await db.getExtractionResult(input.documentId);
    }),
});
