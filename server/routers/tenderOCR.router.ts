import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router, uploadProcedure } from "../_core/trpc";
import * as db from "../db";
import * as ocrService from "../ocr";
import { storagePut } from "../storage";

export const tenderOCRRouter = router({
  // Check if OCR service is available
  status: protectedProcedure.query(async () => {
    return await ocrService.getOCRStatus();
  }),

  // Upload and extract tender PDF in one step
  uploadAndExtract: uploadProcedure
    .input(
      z.object({
        fileName: z.string(),
        fileData: z.string(), // base64 PDF data
        department: z.string().default("Biomedical Engineering"),
        tenderId: z.number().optional(), // Link to existing tender
        saveToTender: z.boolean().default(false), // Create/update tender from results
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Validate it's a PDF
      if (!input.fileName.toLowerCase().endsWith(".pdf")) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only PDF files are supported for OCR extraction",
        });
      }

      // Upload to S3 first
      const buffer = Buffer.from(input.fileData, "base64");
      const fileKey = `tender-ocr/${Date.now()}-${input.fileName}`;
      const { url } = await storagePut(fileKey, buffer, "application/pdf");

      // Create document record
      const docResult = await db.createDocument({
        entityType: input.tenderId ? "tender" : "ocr_upload",
        entityId: input.tenderId || 0,
        fileName: input.fileName,
        fileKey,
        fileUrl: url,
        fileSize: buffer.length,
        mimeType: "application/pdf",
        documentType: "tender_pdf",
        uploadedBy: ctx.user.id,
        status: "processing",
        extractionStatus: "processing",
      } as any);

      const documentId = Number((docResult as any).insertId);

      // Run OCR extraction
      const ocrResult = await ocrService.extractTenderFromBase64(
        input.fileData,
        input.fileName,
        {
          department: input.department,
          languages: ["eng", "ara"],
          dpi: 300,
          maxPages: 10,
        }
      );

      if (!ocrResult.success || !ocrResult.data) {
        // Update document status to failed
        await db.updateDocument(documentId, {
          status: "failed",
          extractionStatus: "failed",
        });

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: ocrResult.error || "OCR extraction failed",
        });
      }

      // Save extraction result
      await db.createExtractionResult({
        documentId,
        extractedData: JSON.stringify(ocrResult.data),
        confidenceScores: JSON.stringify({
          overall: ocrResult.data.ocr_confidence,
        }),
        provider: "tesseract",
        ocrProvider: "tesseract",
      } as any);

      // Update document status
      await db.updateDocument(documentId, {
        status: "completed",
        extractionStatus: "completed",
      });

      // Optionally create/update tender from extracted data
      let tenderId = input.tenderId;
      if (input.saveToTender && ocrResult.data) {
        const tenderData = {
          title:
            ocrResult.data.title ||
            `Tender ${ocrResult.data.reference_number}`,
          referenceNumber: ocrResult.data.reference_number,
          description: ocrResult.data.specifications_text || "",
          status: "draft" as const,
          submissionDeadline: ocrResult.data.closing_date
            ? new Date(
                ocrResult.data.closing_date.split("/").reverse().join("-")
              )
            : null,
          createdBy: ctx.user.id,
        };

        if (tenderId) {
          // Update existing tender
          await db.updateTender(tenderId, tenderData);
        } else {
          // Create new tender
          const tenderResult = await db.createTender(tenderData as any);
          tenderId = Number((tenderResult as any).insertId);

          // Link document to tender
          await db.updateDocument(documentId, {
            entityType: "tender",
            entityId: tenderId,
          });
        }

        // Create tender items from extracted items
        if (ocrResult.data.items && ocrResult.data.items.length > 0) {
          for (const item of ocrResult.data.items) {
            await db.createTenderItem({
              tenderId: tenderId,
              description: item.description,
              quantity: parseInt(item.quantity) || 1,
              unit: item.unit || "units",
              specifications: item.specifications || "",
            } as any);
          }
        }
      }

      return {
        success: true,
        documentId,
        tenderId,
        extraction: ocrResult.data,
        fileUrl: url,
      };
    }),

  // Extract from an existing document
  extractFromDocument: protectedProcedure
    .input(
      z.object({
        documentId: z.number(),
        department: z.string().default("Biomedical Engineering"),
      })
    )
    .mutation(async ({ input }) => {
      // Get document
      const documents = await db.getDocumentsByEntity("", 0);
      const document = documents.find(d => d.id === input.documentId);

      if (!document) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found",
        });
      }

      if (document.mimeType !== "application/pdf") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only PDF files are supported for OCR extraction",
        });
      }

      // Update status to processing
      await db.updateDocument(input.documentId, {
        extractionStatus: "processing",
      });

      // Download file and run OCR
      // Note: For S3 files, you'd need to download first
      const ocrResult = await ocrService.extractTenderFromPDF(
        document.fileUrl,
        {
          department: input.department,
        }
      );

      if (!ocrResult.success || !ocrResult.data) {
        await db.updateDocument(input.documentId, {
          extractionStatus: "failed",
        });

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: ocrResult.error || "OCR extraction failed",
        });
      }

      // Save extraction result
      await db.createExtractionResult({
        documentId: input.documentId,
        extractedData: JSON.stringify(ocrResult.data),
        confidenceScores: JSON.stringify({
          overall: ocrResult.data.ocr_confidence,
        }),
        provider: "tesseract",
        ocrProvider: "tesseract",
      } as any);

      // Update status
      await db.updateDocument(input.documentId, {
        extractionStatus: "completed",
      });

      return {
        success: true,
        extraction: ocrResult.data,
      };
    }),

  // Get extraction results for a document
  getResults: protectedProcedure
    .input(z.object({ documentId: z.number() }))
    .query(async ({ input }) => {
      const result = await db.getExtractionResult(input.documentId);
      if (!result) return null;

      return {
        ...result,
        extractedData: result.extractedData
          ? JSON.parse(result.extractedData as string)
          : null,
        confidenceScores: result.confidenceScores
          ? JSON.parse(result.confidenceScores as string)
          : null,
      };
    }),
});
