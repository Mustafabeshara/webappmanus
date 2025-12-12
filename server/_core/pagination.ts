/**
 * Pagination Utilities
 *
 * Provides standardized pagination for all list endpoints.
 * Supports cursor-based and offset-based pagination.
 */

import { z } from "zod";
import { PAGINATION } from "@shared/constants";

/**
 * Input schema for offset-based pagination
 */
export const paginationInput = z.object({
  page: z.number().int().min(1).default(1),
  limit: z
    .number()
    .int()
    .min(1)
    .max(PAGINATION.MAX_LIMIT)
    .default(PAGINATION.DEFAULT_LIMIT),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

/**
 * Input schema for cursor-based pagination
 */
export const cursorPaginationInput = z.object({
  cursor: z.string().nullish(),
  limit: z
    .number()
    .int()
    .min(1)
    .max(PAGINATION.MAX_LIMIT)
    .default(PAGINATION.DEFAULT_LIMIT),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type PaginationInput = z.infer<typeof paginationInput>;
export type CursorPaginationInput = z.infer<typeof cursorPaginationInput>;

/**
 * Paginated response structure
 */
export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

/**
 * Cursor-based paginated response structure
 */
export interface CursorPaginatedResponse<T> {
  items: T[];
  pagination: {
    nextCursor: string | null;
    prevCursor: string | null;
    hasMore: boolean;
    limit: number;
  };
}

/**
 * Calculate pagination metadata
 */
export function calculatePagination(
  page: number,
  limit: number,
  totalItems: number
): PaginatedResponse<never>["pagination"] {
  const totalPages = Math.ceil(totalItems / limit);
  return {
    page,
    limit,
    totalItems,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

/**
 * Get SQL LIMIT and OFFSET for pagination
 */
export function getPaginationOffsets(input: PaginationInput): {
  offset: number;
  limit: number;
} {
  const page = input.page ?? 1;
  const limit = Math.min(input.limit ?? PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT);
  const offset = (page - 1) * limit;
  return { offset, limit };
}

/**
 * Create a paginated response
 */
export function createPaginatedResponse<T>(
  items: T[],
  page: number,
  limit: number,
  totalItems: number
): PaginatedResponse<T> {
  return {
    items,
    pagination: calculatePagination(page, limit, totalItems),
  };
}

/**
 * Create a cursor-based paginated response
 */
export function createCursorPaginatedResponse<T extends { id: string | number }>(
  items: T[],
  limit: number,
  getCursor: (item: T) => string = (item) => String(item.id)
): CursorPaginatedResponse<T> {
  const hasMore = items.length > limit;
  const paginatedItems = hasMore ? items.slice(0, limit) : items;

  return {
    items: paginatedItems,
    pagination: {
      nextCursor: hasMore ? getCursor(paginatedItems[paginatedItems.length - 1]) : null,
      prevCursor: paginatedItems.length > 0 ? getCursor(paginatedItems[0]) : null,
      hasMore,
      limit,
    },
  };
}

/**
 * Parse cursor for cursor-based pagination
 */
export function parseCursor(cursor: string | null | undefined): {
  id: string | null;
  timestamp: number | null;
} {
  if (!cursor) {
    return { id: null, timestamp: null };
  }

  try {
    const decoded = Buffer.from(cursor, "base64").toString("utf-8");
    const [id, timestamp] = decoded.split(":");
    return {
      id: id || null,
      timestamp: timestamp ? parseInt(timestamp, 10) : null,
    };
  } catch {
    return { id: cursor, timestamp: null };
  }
}

/**
 * Create cursor from item
 */
export function createCursor(id: string | number, timestamp?: Date | number): string {
  const ts = timestamp instanceof Date ? timestamp.getTime() : timestamp;
  const data = ts ? `${id}:${ts}` : String(id);
  return Buffer.from(data).toString("base64");
}

/**
 * Helper to apply sorting to Drizzle queries
 */
export function getSortOrder(sortOrder: "asc" | "desc" = "desc") {
  return sortOrder === "asc" ? "asc" : "desc";
}

/**
 * Validate and sanitize pagination input
 */
export function sanitizePaginationInput(input: Partial<PaginationInput>): PaginationInput {
  return {
    page: Math.max(1, input.page ?? 1),
    limit: Math.min(Math.max(1, input.limit ?? PAGINATION.DEFAULT_LIMIT), PAGINATION.MAX_LIMIT),
    sortBy: input.sortBy,
    sortOrder: input.sortOrder ?? "desc",
  };
}

/**
 * Calculate total pages from total items and limit
 */
export function getTotalPages(totalItems: number, limit: number): number {
  return Math.ceil(totalItems / limit);
}

/**
 * Check if there are more pages
 */
export function hasMorePages(
  currentPage: number,
  totalItems: number,
  limit: number
): boolean {
  return currentPage < getTotalPages(totalItems, limit);
}
