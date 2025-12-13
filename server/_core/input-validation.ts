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
  /(\b(UNION\s+SELECT|UNION|OR|AND)\s+\d+\s*=\s*\d+)/i,
  /(information_schema\b)/i,
  /(concat\s*\()/i,
  /(0x[0-9a-f]+)/i,
  /(--|\/\*|\*\/|;)/,
  /(\b(SCRIPT|JAVASCRIPT|VBSCRIPT|ONLOAD|ONERROR)\b)/i,
  /('|(\\x27)|(\\x2D\\x2D))/i,
];

// XSS payload detection patterns
const XSS_PATTERNS = [
  /<script[^>]*>[\s\S]*?<\/script>/i,
  /<iframe[^>]*>[\s\S]*?<\/iframe>/i,
  /javascript:\s*/i,
  /on\w+\s*=\s*/i,
  /<img[^>]*src\s*=\s*["']?javascript:/i,
  /<object[^>]*>[\s\S]*?<\/object>/i,
  /<embed[^>]*>[\s\S]*?<\/embed>/i,
  /eval\s*\(/i,
  /settimeout\s*\(/i,
  /&#x3c;\s*script/i,
  /<img[^>]*onerror\s*=\s*/i,
  /&#x?[0-9a-f]+;/i,
];

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedValue?: any;
  fileInfo?: {
    isSafe: boolean;
    originalname?: string;
    mimetype?: string;
    size?: number;
  };
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
          `Validation failed: ${error.issues.map((e: z.ZodIssue) => e.message).join(", ")}`
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
    const sanitizedChars = Array.from(input).filter(char => {
      const code = char.codePointAt(0) ?? 0;
      return code >= 32 && code !== 127;
    });

    let sanitized = sanitizedChars.join("");

    // Normalize whitespace
    sanitized = sanitized.trim().replaceAll(/\s+/g, " ");

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
    originalname?: string;
    name?: string;
    mimetype?: string;
    type?: string;
    size?: number;
    buffer?: Buffer;
  }): ValidationResult {
    const errors: string[] = [];

    const originalname = file.originalname ?? file.name ?? "";
    const mimetype = file.mimetype ?? file.type ?? "";
    const size = file.size ?? 0;

    if (!originalname) {
      errors.push("File name is required");
    }

    // Check file size (10MB limit)
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (size > MAX_FILE_SIZE) {
      errors.push(
        `File size ${size} exceeds maximum allowed size of ${MAX_FILE_SIZE} bytes`
      );
    }

    if (size <= 0) {
      errors.push("File is empty");
    }
    const fileExtension = originalname.includes(".")
      ? originalname.toLowerCase().substring(originalname.lastIndexOf("."))
      : "";

    this.validateFileTypeAndMime(fileExtension, mimetype, errors);

    // Check for malicious content in filename
    if (
      this.detectSqlInjection(originalname) ||
      this.detectXssPayload(originalname)
    ) {
      errors.push("Malicious content detected in filename");
    }

    // Basic file content validation
    if (file.buffer) {
      const fileHeader = file.buffer.subarray(0, 100).toString("hex");

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

    const isValid = errors.length === 0;
    return {
      isValid,
      errors,
      sanitizedValue: isValid
        ? {
            ...file,
            originalname: this.sanitizeString(originalname),
            mimetype,
            size,
          }
        : undefined,
      fileInfo: isValid
        ? {
            isSafe: true,
            originalname: this.sanitizeString(originalname),
            mimetype,
            size,
          }
        : undefined,
      fileInfo: {
        isSafe: isValid,
      },
    };
  }

  /**
   * Detect SQL injection attempts
   */
  detectSqlInjection(input: string): boolean {
    if (!input || typeof input !== "string") {
      return false;
    }

    const normalizedInput = input.toLowerCase().replaceAll(/\s+/g, " ");

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

    const normalized = input.toLowerCase();
    const decoded = this.decodeHtmlEntities(normalized);

    return XSS_PATTERNS.some(pattern => {
      pattern.lastIndex = 0;
      return pattern.test(normalized) || pattern.test(decoded);
    });
  }

  private validateFileTypeAndMime(
    fileExtension: string,
    mimetype: string,
    errors: string[]
  ): void {
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

    if (!allowedMimeTypes.includes(mimetype)) {
      errors.push(`MIME type ${mimetype} is not allowed`);
    }

    // Ensure extension and MIME type align
    const extensionToMime: Record<string, string[]> = {
      ".pdf": ["application/pdf"],
      ".doc": ["application/msword"],
      ".docx": [
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ],
      ".xls": ["application/vnd.ms-excel"],
      ".xlsx": [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ],
      ".jpg": ["image/jpeg", "image/jpg"],
      ".jpeg": ["image/jpeg", "image/jpg"],
      ".png": ["image/png"],
      ".gif": ["image/gif"],
    };

    const allowedForExt = extensionToMime[fileExtension] ?? [];
    if (allowedForExt.length > 0 && !allowedForExt.includes(mimetype)) {
      errors.push(
        `MIME type ${mimetype} does not match file extension ${fileExtension}`
      );
    }
  }

  private decodeHtmlEntities(value: string): string {
    return value
      .replaceAll(/&#(\d+);?/g, (_match, dec) => {
        const code = Number.parseInt(dec, 10);
        return Number.isNaN(code) ? "" : String.fromCodePoint(code);
      })
      .replaceAll(/&#x([0-9a-f]+);?/gi, (_match, hex) => {
        const code = Number.parseInt(hex, 16);
        return Number.isNaN(code) ? "" : String.fromCodePoint(code);
      })
      .replaceAll("&lt;", "<")
      .replaceAll("&gt;", ">")
      .replaceAll("&quot;", '"')
      .replaceAll("&apos;", "'")
      .replaceAll("&amp;", "&");
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
      let eventType:
        | "sql_injection_attempt"
        | "xss_attempt"
        | "suspicious_activity";
      if (threat.type === "sql_injection") {
        eventType = "sql_injection_attempt";
      } else if (threat.type === "xss") {
        eventType = "xss_attempt";
      } else {
        eventType = "suspicious_activity";
      }

      await db.createSecurityEvent({
        type: eventType,
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

// Re-export as inputValidationService for backward compatibility with trpc.ts
export const inputValidationService = inputValidation;

// Common validation schemas using Zod
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

  // Optional safe string
  optionalSafeString: (maxLength = 255) =>
    z
      .string()
      .max(maxLength, `Field must be ${maxLength} characters or less`)
      .refine(
        val => !val || !inputValidationService.detectSqlInjection(val),
        "Invalid characters detected"
      )
      .refine(
        val => !val || !inputValidationService.detectXssPayload(val),
        "Invalid content detected"
      )
      .optional(),

  // Email validation
  email: z
    .string()
    .regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/, "Invalid email format")
    .max(320, "Email must be 320 characters or less")
    .refine(
      val => !inputValidationService.detectSqlInjection(val),
      "Invalid characters detected"
    ),

  // Safe number (positive integer)
  positiveInt: z
    .number()
    .int({ message: "Must be a whole number" })
    .positive({ message: "Must be a positive number" }),

  // Safe ID
  id: z.number().int().positive("ID must be a positive integer"),

  // Date validation
  date: z.coerce.date(),

  // Optional date
  optionalDate: z.coerce.date().optional().nullable(),

  // Money amount (in cents)
  money: z
    .number()
    .int({ message: "Amount must be in cents (whole number)" })
    .min(0, { message: "Amount cannot be negative" }),

  // Percentage (0-100)
  percentage: z
    .number()
    .min(0, { message: "Percentage cannot be negative" })
    .max(100, { message: "Percentage cannot exceed 100" }),

  // File upload schema (base64 encoded file data)
  fileUpload: z.object({
    fileName: z.string().min(1).max(255),
    fileData: z.string(), // base64 encoded
    mimeType: z.string().min(1).max(100),
  }),
};
