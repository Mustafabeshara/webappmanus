import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  protectedProcedure,
  router,
  sensitiveProcedure,
  uploadProcedure,
} from "../_core/trpc";
import * as db from "../db";
import { storagePut } from "../storage";

/**
 * Files Router
 * Universal file management system with S3 storage, versioning, and rollback support
 */
export const filesRouter = router({
  /**
   * Upload a file to S3 with full processing
   * Handles base64 decoding, S3 upload, and database metadata storage
   * @param fileName - Original file name
   * @param fileData - Base64 encoded file data
   * @param mimeType - File MIME type (must be in allowed list)
   * @param entityType - Type of entity this file belongs to
   * @param entityId - ID of the entity
   * @param category - Optional file category for organization
   * @throws BAD_REQUEST if file type not allowed or file too large (max 25MB)
   */
  uploadToS3: uploadProcedure
    .input(
      z.object({
        fileName: z.string().min(1).max(255),
        fileData: z.string(), // base64 encoded file data
        mimeType: z.string(),
        entityType: z.enum(["tender", "invoice", "expense", "product", "supplier", "customer", "delivery", "document"]),
        entityId: z.number().int().positive(),
        category: z.string().max(100).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Sanitize filename to prevent path traversal attacks
      const sanitizeFilename = (name: string): string => {
        // Remove any path components and dangerous characters
        let sanitized = name;
        // Remove path prefixes (everything before last slash)
        const lastSlash = Math.max(sanitized.lastIndexOf("/"), sanitized.lastIndexOf("\\"));
        if (lastSlash >= 0) {
          sanitized = sanitized.substring(lastSlash + 1);
        }
        // Remove directory traversal sequences
        sanitized = sanitized.replaceAll("..", "");
        // Remove invalid/dangerous characters: < > : " | ? *
        sanitized = sanitized.replaceAll("<", "").replaceAll(">", "").replaceAll(":", "")
          .replaceAll('"', "").replaceAll("|", "").replaceAll("?", "").replaceAll("*", "");
        // Remove control characters (0x00-0x1f) using character code filtering
        sanitized = Array.from(sanitized).filter(char => (char.codePointAt(0) ?? 0) > 31).join("");
        sanitized = sanitized.trim();

        if (!sanitized || sanitized.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid filename",
          });
        }
        return sanitized;
      };

      const safeFileName = sanitizeFilename(input.fileName);

      // Basic safety checks
      const allowedMimeTypes = [
        "application/pdf",
        "image/png",
        "image/jpeg",
        "image/jpg",
        "text/plain",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/csv",
      ];
      const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB

      if (!allowedMimeTypes.includes(input.mimeType)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Unsupported file type",
        });
      }

      // Convert base64 to buffer
      const buffer = Buffer.from(input.fileData, "base64");
      const fileSize = buffer.length;

      if (fileSize > MAX_FILE_BYTES) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "File too large (max 25MB)",
        });
      }

      // Generate unique file key with sanitized filename
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(7);
      const fileKey = `${input.entityType}/${input.entityId}/${timestamp}-${randomSuffix}-${safeFileName}`;

      // Upload to S3
      const { url } = await storagePut(fileKey, buffer, input.mimeType);

      // Save metadata to database with sanitized filename
      const file = await db.createFile({
        fileName: safeFileName,
        fileKey,
        fileUrl: url,
        fileSize,
        mimeType: input.mimeType,
        entityType: input.entityType,
        entityId: input.entityId,
        category: input.category,
        uploadedBy: ctx.user.id,
      });

      return file;
    }),

  /**
   * Register an already uploaded file in the database
   * Used when file is uploaded externally but metadata needs to be tracked
   * @param fileName - File name
   * @param fileKey - S3 file key
   * @param fileUrl - Full URL to the file
   * @param fileSize - File size in bytes
   * @param mimeType - File MIME type
   * @param entityType - Type of entity this file belongs to
   * @param entityId - ID of the entity
   * @param category - Optional file category
   */
  upload: uploadProcedure
    .input(
      z.object({
        fileName: z.string(),
        fileKey: z.string(),
        fileUrl: z.string(),
        fileSize: z.number(),
        mimeType: z.string(),
        entityType: z.string(),
        entityId: z.number(),
        category: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const file = await db.createFile({
        ...input,
        uploadedBy: ctx.user.id,
      });
      return file;
    }),

  /**
   * Get all files for a specific entity
   * @param entityType - Type of entity (e.g., "tender", "invoice")
   * @param entityId - Entity ID
   * @param category - Optional category filter
   */
  getByEntity: protectedProcedure
    .input(
      z.object({
        entityType: z.string(),
        entityId: z.number(),
        category: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      return await db.getFilesByEntity(
        input.entityType,
        input.entityId,
        input.category
      );
    }),

  /**
   * Delete a file
   * Only file owner or admin can delete
   * @param id - File ID to delete
   * @throws NOT_FOUND if file doesn't exist
   * @throws FORBIDDEN if user not authorized
   */
  delete: sensitiveProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const file = await db.getFileById(input.id);
      if (!file) {
        throw new TRPCError({ code: "NOT_FOUND", message: "File not found" });
      }

      // Check if user owns the file or is admin
      if (file.uploadedBy !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized to delete this file",
        });
      }

      await db.deleteFile(input.id);
      return { success: true };
    }),

  /**
   * Get all files in the system
   * Returns complete file list for admin purposes
   */
  getAll: protectedProcedure.query(async () => {
    return await db.getAllFiles();
  }),

  /**
   * Get version history for a file
   * Returns all versions of a file in chronological order
   * @param fileId - File ID to get history for
   */
  getHistory: protectedProcedure
    .input(z.object({ fileId: z.number() }))
    .query(async ({ input }) => {
      return await db.getFileHistory(input.fileId);
    }),

  /**
   * Replace a file with a new version
   * Creates a new version while preserving the original
   * Maintains version history and allows rollback
   * @param originalFileId - ID of file to replace
   * @param fileName - New file name
   * @param fileData - Base64 encoded new file data
   * @param mimeType - New file MIME type
   * @throws NOT_FOUND if original file doesn't exist
   * @throws FORBIDDEN if user not authorized
   */
  replaceFile: protectedProcedure
    .input(
      z.object({
        originalFileId: z.number(),
        fileName: z.string(),
        fileData: z.string(), // base64 encoded
        mimeType: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Get the original file to inherit entity info
      const originalFile = await db.getFileById(input.originalFileId);
      if (!originalFile) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Original file not found",
        });
      }

      // Check if user owns the file or is admin
      if (
        originalFile.uploadedBy !== ctx.user.id &&
        ctx.user.role !== "admin"
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized to replace this file",
        });
      }

      // Convert base64 to buffer
      const buffer = Buffer.from(input.fileData, "base64");
      const fileSize = buffer.length;

      // Generate unique file key
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(7);
      const fileKey = `${originalFile.entityType}/${originalFile.entityId}/${timestamp}-${randomSuffix}-${input.fileName}`;

      // Upload to S3
      const { url } = await storagePut(fileKey, buffer, input.mimeType);

      // Get the parent file ID (if original is already a version, use its parent)
      const parentFileId = originalFile.parentFileId || originalFile.id;

      // Get the next version number
      const history = await db.getFileHistory(parentFileId);
      const nextVersion = history.length + 1;

      // Mark the current file as replaced
      await db.markFileAsReplaced(input.originalFileId);

      // Create new version
      const newFile = await db.createFileVersion({
        fileName: input.fileName,
        fileKey,
        fileUrl: url,
        fileSize,
        mimeType: input.mimeType,
        entityType: originalFile.entityType,
        entityId: originalFile.entityId,
        category: originalFile.category,
        uploadedBy: ctx.user.id,
        version: nextVersion,
        parentFileId,
        isCurrent: true,
      });

      return newFile;
    }),

  /**
   * Rollback to a previous file version
   * Sets an older version as the current version
   * Does not delete newer versions, just changes current pointer
   * @param versionId - ID of the version to rollback to
   * @throws NOT_FOUND if version doesn't exist
   * @throws FORBIDDEN if user not authorized
   */
  rollbackToVersion: protectedProcedure
    .input(z.object({ versionId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const versionFile = await db.getFileById(input.versionId);
      if (!versionFile) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Version not found",
        });
      }

      // Check if user owns the file or is admin
      if (
        versionFile.uploadedBy !== ctx.user.id &&
        ctx.user.role !== "admin"
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized to rollback this file",
        });
      }

      // Get parent file ID
      const parentFileId = versionFile.parentFileId || versionFile.id;

      // Mark all versions as not current
      await db.markAllVersionsAsNotCurrent(parentFileId);

      // Mark this version as current
      await db.markFileAsCurrent(input.versionId);

      return { success: true };
    }),
});
