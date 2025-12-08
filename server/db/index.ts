/**
 * Database Module Index
 *
 * Re-exports all database functions from their domain-specific modules.
 * This maintains backward compatibility with existing imports.
 *
 * Module organization:
 * - connection.ts - Database connection singleton
 * - errors.ts - Error handling utilities
 * - users.ts - User and permission queries (to be created)
 * - tenders.ts - Tender-related queries (to be created)
 * - etc.
 *
 * Currently, all functions remain in the main db.ts file.
 * As the codebase grows, migrate functions here.
 */

export { getDb, type DbInstance } from "./connection";
export {
  DatabaseError,
  withDbErrorHandling,
  isDuplicateKeyError,
  isConstraintError,
  notFoundToNull,
  firstOrNull,
  type DatabaseErrorCode,
} from "./errors";

// Re-export everything from the main db.ts for backward compatibility
// Individual modules can be created and exported here as needed
