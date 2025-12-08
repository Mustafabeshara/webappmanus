/**
 * Database Error Handling
 * Provides consistent error handling for database operations.
 */

/**
 * Custom database error class for better error categorization
 */
export class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly code: DatabaseErrorCode,
    public readonly operation: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "DatabaseError";
  }
}

export type DatabaseErrorCode =
  | "CONNECTION_ERROR"
  | "NOT_FOUND"
  | "DUPLICATE_KEY"
  | "CONSTRAINT_VIOLATION"
  | "QUERY_ERROR"
  | "VALIDATION_ERROR"
  | "TIMEOUT";

/**
 * Check if error is a MySQL duplicate key error
 */
export function isDuplicateKeyError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.includes("Duplicate entry") ||
           (error as any).code === "ER_DUP_ENTRY";
  }
  return false;
}

/**
 * Check if error is a foreign key constraint error
 */
export function isConstraintError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.includes("foreign key constraint") ||
           (error as any).code === "ER_NO_REFERENCED_ROW_2" ||
           (error as any).code === "ER_ROW_IS_REFERENCED_2";
  }
  return false;
}

/**
 * Wrap database operation with consistent error handling
 */
export async function withDbErrorHandling<T>(
  operation: string,
  fn: () => Promise<T>,
  options?: { silent?: boolean }
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    // Determine error code
    let code: DatabaseErrorCode = "QUERY_ERROR";
    if (isDuplicateKeyError(error)) {
      code = "DUPLICATE_KEY";
    } else if (isConstraintError(error)) {
      code = "CONSTRAINT_VIOLATION";
    } else if (error instanceof Error && error.message.includes("timeout")) {
      code = "TIMEOUT";
    }

    const message = error instanceof Error ? error.message : String(error);

    if (!options?.silent) {
      console.error(`[Database] ${operation} failed:`, message);
    }

    throw new DatabaseError(
      `Database operation '${operation}' failed: ${message}`,
      code,
      operation,
      error
    );
  }
}

/**
 * Helper to safely execute a query that may return no results
 */
export function notFoundToNull<T>(result: T | undefined): T | null {
  return result === undefined ? null : result;
}

/**
 * Helper to get first result or null from array
 */
export function firstOrNull<T>(results: T[]): T | null {
  return results.length > 0 ? results[0] : null;
}
