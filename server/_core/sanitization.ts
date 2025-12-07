import DOMPurify from 'isomorphic-dompurify';

/**
 * Input sanitization middleware
 * Implements M5: Input Sanitization for XSS Prevention
 */

/**
 * Sanitize a single string value
 */
export function sanitizeString(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // Strip all HTML tags
    ALLOWED_ATTR: [], // Strip all attributes
    KEEP_CONTENT: true, // Keep text content
  });
}

/**
 * Recursively sanitize all string values in an object
 */
export function sanitizeInput(input: any): any {
  if (input === null || input === undefined) {
    return input;
  }

  if (typeof input === 'string') {
    return sanitizeString(input);
  }

  if (Array.isArray(input)) {
    return input.map(item => sanitizeInput(item));
  }

  if (typeof input === 'object') {
    const sanitized: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value);
    }
    
    return sanitized;
  }

  // Return other types as-is (numbers, booleans, etc.)
  return input;
}

/**
 * tRPC middleware for input sanitization
 */
export function createSanitizationMiddleware() {
  return async ({ next, input }: { next: any; input: any }) => {
    const sanitizedInput = sanitizeInput(input);
    return next({ input: sanitizedInput });
  };
}
