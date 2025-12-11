import DOMPurify from "isomorphic-dompurify";
import { z } from "zod";
import * as db from "../db";

/**
 * Input Validation Service - Task 1.1
 * Comprehensive validation and sanitization for all user inputs
 */

// SQL Injection detection patterns
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
  /(\b(UNION|OR|AND)\s+\d+\s*=\s*\d+)/i,
  /(--|\/\*|\*\/|;)/,
  /(\b(SCRIPT|JAVASCRIPT|VBSCRIPT|ONLOAD|ONERROR)\b)/i,
  /('|(\\x27)|(\\x2D\\x2D))/i,
];

// XSS payload detection patterns
const XSS_PATTERNS = [
  /<script[^>]*>.*?<\/script>/gi,
  /<iframe[^>]*>.*?<\/iframe>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<img[^>]*src\s*=\s*["']?javascript:/gi,
  /<object[^>]*>.*?<\/object>/gi,
  /<embed[^>]*>.*?<\/embed>/gi,
];

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedValue?: any;
}

export interface SecurityThreat {
  type: "sql_injection" | "xss" | "malicious_file";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  input: string;
}

class InputValidationService {
  /**
   * Validate and sanitize input using Zod schema
   */
  validateAndSanitize<T>(input: unknown, schema: z.ZodSchema<T>): T {
    try {
      // First sanitize if it's a string
      if (typeof input === "string") {
        input = this.sanitizeString(input);
      } else if (typeof input === "object" && input !== null) {
        input = this.sanitizeObject(input);
      }

      // Then validate with schema
      const result = schema.parse(input);
      return result;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(
          `Validation failed: ${error.errors.map(e => e.message).join(", ")}`
        );
      }
      throw error;
    }
  }

  /**
   * Sanitize HTML content to prevent XSS
   */
  sanitizeHtml(content: string): string {
    if (!content || typeof content !== "string") {
      return "";
    }

    // Use DOMPurify to sanitize HTML
    const sanitized = DOMPurify.sanitize(content, {
      ALLOWED_TAGS: ["b", "i", "em", "strong", "p", "br", "ul", "ol", "li"],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true,
    });

    return sanitized;
  }

  /**
   * Sanitize plain text strings
   */
  sanitizeString(input: string): string {
    if (!input || typeof input !== "string") {
      return "";
    }

    // Remove null bytes and control characters
    let sanitized = input
      .replace(/\0/g, "")
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

    // Normalize whitespace
    sanitized = sanitized.trim().replace(/\s+/g, " ");

    return sanitized;
  }

  /**
   * Recursively sanitize object properties
   */
  sanitizeObject(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === "string") {
      return this.sanitizeString(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    if (typeof obj === "object") {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const sanitizedKey = this.sanitizeString(key);
        sanitized[sanitizedKey] = this.sanitizeObject(value);
      }
      return sanitized;
    }

    return obj;
  }

  /**
   * Validate file upload
   */
  validateFileUpload(file: {
    originalname: string;
    mimetype: string;
    size: number;
    buffer?: Buffer;
  }): ValidationResult {
    const errors: string[] = [];

    // Check file size (10MB limit)
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      errors.push(
        `File size ${file.size} exceeds maximum allowed size of ${MAX_FILE_SIZE} bytes`
      );
    }

    // Check file extension
    const allowedExtensions = [
      ".pdf",
      ".doc",
      ".docx",
      ".xls",
      ".xlsx",
      ".jpg",
      ".jpeg",
      ".png",
      ".gif",
    ];
    const fileExtension = file.originalname
      .toLowerCase()
      .substring(file.originalname.lastIndexOf("."));

    if (!allowedExtensions.includes(fileExtension)) {
      errors.push(`File extension ${fileExtension} is not allowed`);
    }

    // Check MIME type
    const allowedMimeTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      errors.push(`MIME type ${file.mimetype} is not allowed`);
    }

    // Check for malicious content in filename
    if (
      this.detectSqlInjection(file.originalname) ||
      this.detectXssPayload(file.originalname)
    ) {
      errors.push("Malicious content detected in filename");
    }

    // Basic file content validation
    if (file.buffer) {
      const fileHeader = file.buffer.slice(0, 100).toString("hex");

      // Check for executable file signatures
      const executableSignatures = [
        "4d5a", // PE executable
        "7f454c46", // ELF executable
        "cafebabe", // Java class file
      ];

      for (const signature of executableSignatures) {
        if (fileHeader.startsWith(signature)) {
          errors.push("Executable file detected");
          break;
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue:
        errors.length === 0
          ? {
              ...file,
              originalname: this.sanitizeString(file.originalname),
            }
          : undefined,
    };
  }

  /**
   * Detect SQL injection attempts
   */
  detectSqlInjection(input: string): boolean {
    if (!input || typeof input !== "string") {
      return false;
    }

    const normalizedInput = input.toLowerCase().replace(/\s+/g, " ");

    return SQL_INJECTION_PATTERNS.some(pattern =>
      pattern.test(normalizedInput)
    );
  }

  /**
   * Detect XSS payload attempts
   */
  detectXssPayload(input: string): boolean {
    if (!input || typeof input !== "string") {
      return false;
    }

    return XSS_PATTERNS.some(pattern => pattern.test(input));
  }

  /**
   * Log security threat and create security event
   */
  async logSecurityThreat(
    threat: SecurityThreat,
    userId?: number,
    ipAddress?: string,
    userAgent?: string,
    endpoint?: string
  ): Promise<void> {
    try {
      // Create security event in database
      await db.createSecurityEvent({
        type:
          threat.type === "sql_injection"
            ? "sql_injection_attempt"
            : threat.type === "xss"
              ? "xss_attempt"
              : "suspicious_activity",
        severity: threat.severity,
        description: threat.description,
        details: JSON.stringify({ input: threat.input }),
        userId,
        ipAddress: ipAddress || "unknown",
        userAgent,
        endpoint,
        input: threat.input.substring(0, 1000), // Limit input length
        resolved: false,
        createdAt: new Date(),
      });

      console.warn(`[Security] ${threat.type} detected:`, {
        severity: threat.severity,
        description: threat.description,
        userId,
        ipAddress,
        endpoint,
      });
    } catch (error) {
      console.error("[Security] Failed to log security threat:", error);
    }
  }

  /**
   * Validate and sanitize with threat detection
   */
  async validateWithThreatDetection<T>(
    input: unknown,
    schema: z.ZodSchema<T>,
    context: {
      userId?: number;
      ipAddress?: string;
      userAgent?: string;
      endpoint?: string;
    } = {}
  ): Promise<T> {
    // Check for security threats in string inputs
    if (typeof input === "string") {
      if (this.detectSqlInjection(input)) {
        await this.logSecurityThreat(
          {
            type: "sql_injection",
            severity: "high",
            description: "SQL injection attempt detected",
            input: input,
          },
          context.userId,
          context.ipAddress,
          context.userAgent,
          context.endpoint
        );

        throw new Error("Invalid input detected");
      }

      if (this.detectXssPayload(input)) {
        await this.logSecurityThreat(
          {
            type: "xss",
            severity: "high",
            description: "XSS payload detected",
            input: input,
          },
          context.userId,
          context.ipAddress,
          context.userAgent,
          context.endpoint
        );

        throw new Error("Invalid input detected");
      }
    }

    return this.validateAndSanitize(input, schema);
  }
}

// Create security event function for database
export async function createSecurityEvent(event: {
  type:
    | "sql_injection_attempt"
    | "xss_attempt"
    | "invalid_file_upload"
    | "rate_limit_exceeded"
    | "unauthorized_access"
    | "suspicious_activity"
    | "csrf_violation"
    | "session_hijack_attempt";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  details?: string;
  userId?: number;
  ipAddress: string;
  userAgent?: string;
  endpoint?: string;
  input?: string;
  resolved?: boolean;
  createdAt: Date;
}) {
  const db_instance = await db.getDb();
  if (!db_instance) {
    console.error(
      "[Security] Cannot log security event: database not available"
    );
    return;
  }

  try {
    await db_instance.insert(db.securityEvents).values(event);
  } catch (error) {
    console.error("[Security] Failed to create security event:", error);
  }
}

export const inputValidation = new InputValidationService();
