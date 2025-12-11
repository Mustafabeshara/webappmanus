/**
 * Comprehensive Input Validation Service
 *
 * Provides security-focused input validation, sanitization, and threat detection
 * to prevent SQL injection, XSS, and other input-based attacks.
 */

import { TRPCError } from "@trpc/server";
import DOMPurify from "isomorphic-dompurify";
import { ZodError, z } from "zod";

export interface ValidationResult {
  isValid: boolean;
  errors?: string[];
  sanitizedValue?: unknown;
}

export interface FileValidationResult extends ValidationResult {
  fileInfo?: {
    name: string;
    size: number;
    type: string;
    isSafe: boolean;
  };
}

/**
 * SQL Injection detection patterns
 * These patterns identify common SQL injection attack vectors
 */
const SQL_INJECTION_PATTERNS = [
  // Union-based attacks
  /(\bunion\b.*\bselect\b)|(\bselect\b.*\bunion\b)/i,
  // Comment-based attacks
  /(--|#|\/\*|\*\/)/,
  // Boolean-based blind attacks
  /(\band\b|\bor\b)\s+\d+\s*=\s*\d+/i,
  // Time-based blind attacks
  /\b(sleep|waitfor|delay)\s*\(/i,
  // Stacked queries
  /;\s*(drop|delete|insert|update|create|alter)\b/i,
  // Information schema attacks
  /\binformation_schema\b/i,
  // System function calls
  /\b(load_file|into\s+outfile|dumpfile)\b/i,
  // Hex encoding attacks
  /0x[0-9a-f]+/i,
  // Concatenation attacks
  /\bconcat\s*\(/i,
];

/**
 * XSS payload detection patterns
 * These patterns identify common XSS attack vectors
 */
const XSS_PATTERNS = [
  // Script tags
  /<script[^>]*>.*?<\/script>/gi,
  // Event handlers
  /\bon\w+\s*=\s*['"]/i,
  // JavaScript URLs
  /javascript\s*:/i,
  // Data URLs with scripts
  /data\s*:\s*text\/html/i,
  // Expression() attacks
  /expression\s*\(/i,
  // Import statements
  /\bimport\s*\(/i,
  // Eval and similar functions
  /\b(eval|setTimeout|setInterval)\s*\(/i,
  // HTML entities that could be XSS
  /&#x?[0-9a-f]+;?/i,
];

/**
 * Dangerous file extensions that should be blocked
 */
const DANGEROUS_FILE_EXTENSIONS = new Set([
  ".exe",
  ".bat",
  ".cmd",
  ".com",
  ".pif",
  ".scr",
  ".vbs",
  ".js",
  ".jar",
  ".php",
  ".asp",
  ".aspx",
  ".jsp",
  ".py",
  ".rb",
  ".pl",
  ".sh",
  ".ps1",
  ".msi",
  ".deb",
  ".rpm",
  ".dmg",
  ".app",
  ".ipa",
  ".apk",
]);

/**
 * Allowed MIME types for file uploads
 */
const ALLOWED_MIME_TYPES = new Set([
  // Images
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  // Documents
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  // Archives
  "application/zip",
  "application/x-rar-compressed",
  "application/x-7z-compressed",
]);

/**
 * Maximum file size (10MB)
 */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

class InputValidationService {
  /**
   * Validate and sanitize input using Zod schema
   */
  validateAndSanitize<T>(input: unknown, schema: ZodType<T>): T {
    try {
      // First, check for potential security threats in string inputs
      if (typeof input === "string") {
        this.checkForSecurityThreats(input);
      } else if (typeof input === "object" && input !== null) {
        this.checkObjectForThreats(input);
      }

      // Validate with Zod schema
      const result = schema.parse(input);

      // Additional sanitization for string fields
      if (typeof result === "object" && result !== null) {
        return this.sanitizeObject(result) as T;
      }

      return result;
    } catch (error) {
      if (error instanceof ZodError) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Input validation failed",
          cause: error.issues,
        });
      }

      if (error instanceof TRPCError) {
        throw error;
      }

      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invalid input provided",
      });
    }
  }

  /**
   * Sanitize HTML content to prevent XSS attacks
   */
  sanitizeHtml(content: string): string {
    if (!content || typeof content !== "string") {
      return "";
    }

    // Check for XSS patterns before sanitization
    if (this.detectXssPayload(content)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Potentially malicious content detected",
      });
    }

    // Use DOMPurify to sanitize HTML
    const sanitized = DOMPurify.sanitize(content, {
      ALLOWED_TAGS: [
        "p",
        "br",
        "strong",
        "em",
        "u",
        "ol",
        "ul",
        "li",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
      ],
      ALLOWED_ATTR: ["class"],
      FORBID_SCRIPT: true,
      FORBID_TAGS: [
        "script",
        "object",
        "embed",
        "form",
        "input",
        "textarea",
        "select",
        "button",
      ],
      FORBID_ATTR: [
        "onclick",
        "onload",
        "onerror",
        "onmouseover",
        "onfocus",
        "onblur",
        "onchange",
        "onsubmit",
      ],
    });

    return sanitized;
  }

  /**
   * Validate file uploads for security
   */
  validateFileUpload(file: {
    name: string;
    size: number;
    type: string;
    buffer?: Buffer;
  }): FileValidationResult {
    const errors: string[] = [];

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      errors.push(
        `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / (1024 * 1024)}MB`
      );
    }

    if (file.size === 0) {
      errors.push("File is empty");
    }

    // Check file extension
    const extension = this.getFileExtension(file.name);
    if (DANGEROUS_FILE_EXTENSIONS.has(extension.toLowerCase())) {
      errors.push(`File extension '${extension}' is not allowed`);
    }

    // Check MIME type
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      errors.push(`File type '${file.type}' is not allowed`);
    }

    // Check for null bytes in filename (directory traversal protection)
    if (file.name.includes("\0") || file.name.includes("..")) {
      errors.push("Invalid characters in filename");
    }

    // Basic malware detection (check for suspicious patterns in filename)
    if (this.containsSuspiciousPatterns(file.name)) {
      errors.push("Suspicious filename detected");
    }

    const isValid = errors.length === 0;

    return {
      isValid,
      errors: errors.length > 0 ? errors : undefined,
      fileInfo: {
        name: file.name,
        size: file.size,
        type: file.type,
        isSafe: isValid,
      },
    };
  }

  /**
   * Detect SQL injection patterns in input
   */
  detectSqlInjection(input: string): boolean {
    if (!input || typeof input !== "string") {
      return false;
    }

    const normalizedInput = input.toLowerCase().replaceAll(/\s+/g, " ").trim();

    return SQL_INJECTION_PATTERNS.some(pattern =>
      pattern.test(normalizedInput)
    );
  }

  /**
   * Detect XSS payload patterns in input
   */
  detectXssPayload(input: string): boolean {
    if (!input || typeof input !== "string") {
      return false;
    }

    const normalizedInput = input.toLowerCase().replaceAll(/\s+/g, " ").trim();

    return XSS_PATTERNS.some(pattern => pattern.test(normalizedInput));
  }

  /**
   * Check input for various security threats
   */
  private checkForSecurityThreats(input: string): void {
    if (this.detectSqlInjection(input)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Potential SQL injection detected",
      });
    }

    if (this.detectXssPayload(input)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Potential XSS payload detected",
      });
    }
  }

  /**
   * Recursively check object properties for security threats
   */
  private checkObjectForThreats(obj: any): void {
    if (typeof obj !== "object" || obj === null) {
      return;
    }

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];

        if (typeof value === "string") {
          this.checkForSecurityThreats(value);
        } else if (typeof value === "object" && value !== null) {
          this.checkObjectForThreats(value);
        }
      }
    }
  }

  /**
   * Sanitize object properties recursively
   */
  private sanitizeObject<T>(obj: T): T {
    if (typeof obj !== "object" || obj === null) {
      return obj;
    }

    const sanitized = { ...obj } as any;

    for (const key in sanitized) {
      if (sanitized.hasOwnProperty(key)) {
        const value = sanitized[key];

        if (typeof value === "string") {
          // Only sanitize HTML if it looks like it might contain HTML
          if (
            value.includes("<") ||
            value.includes(">") ||
            value.includes("&")
          ) {
            sanitized[key] = this.sanitizeHtml(value);
          }
        } else if (typeof value === "object" && value !== null) {
          sanitized[key] = this.sanitizeObject(value);
        }
      }
    }

    return sanitized;
  }

  /**
   * Get file extension from filename
   */
  private getFileExtension(filename: string): string {
    const lastDotIndex = filename.lastIndexOf(".");
    return lastDotIndex === -1 ? "" : filename.substring(lastDotIndex);
  }

  /**
   * Check if filename contains suspicious patterns
   */
  private containsSuspiciousPatterns(filename: string): boolean {
    const suspiciousPatterns = [
      /\.(exe|bat|cmd|com|pif|scr|vbs|js|jar)$/i,
      /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i, // Windows reserved names
      /[<>:"|?*]/, // Invalid filename characters
      /^\./, // Hidden files starting with dot
    ];

    return suspiciousPatterns.some(pattern => pattern.test(filename));
  }
}

// Export singleton instance
export const inputValidationService = new InputValidationService();

// Export common validation schemas
export const commonSchemas = {
  // Basic string validation with length limits
  safeString: (maxLength = 255) =>
    z
      .string()
      .min(1, "Field is required")
      .max(maxLength, `Field must be ${maxLength} characters or less`)
      .refine(
        val => !inputValidationService.detectSqlInjection(val),
        "Invalid characters detected"
      )
      .refine(
        val => !inputValidationService.detectXssPayload(val),
        "Invalid content detected"
      ),

  // Email validation
  email: z
    .string()
    .email({ message: "Invalid email format" })
    .max(320, "Email must be 320 characters or less")
    .refine(
      val => !inputValidationService.detectSqlInjection(val),
      "Invalid characters detected"
    ),

  // URL validation
  url: z
    .string()
    .url({ message: "Invalid URL format" })
    .max(2048, "URL must be 2048 characters or less")
    .refine(
      val => !val.toLowerCase().startsWith("javascript:"),
      "JavaScript URLs not allowed"
    )
    .refine(
      val => !val.toLowerCase().startsWith("data:"),
      "Data URLs not allowed"
    ),

  // HTML content validation
  htmlContent: z
    .string()
    .max(10000, "Content must be 10000 characters or less")
    .transform(val => inputValidationService.sanitizeHtml(val)),

  // Numeric ID validation
  positiveInt: z.number().int().positive("Must be a positive integer"),

  // File upload validation
  fileUpload: z
    .object({
      name: z
        .string()
        .min(1, "Filename is required")
        .max(255, "Filename too long"),
      size: z
        .number()
        .positive("File size must be positive")
        .max(MAX_FILE_SIZE, "File too large"),
      type: z.string().min(1, "File type is required"),
    })
    .refine(
      file => inputValidationService.validateFileUpload(file).isValid,
      "File validation failed"
    ),
};
