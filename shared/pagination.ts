import { z } from "zod";

/**
 * Pagination Schema and Types
 * Shared between client and server for type-safe pagination
 */

// Default pagination values
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/**
 * Pagination input schema for API requests
 */
export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasMore: boolean;
  };
}

/**
 * Calculate pagination offset from page and pageSize
 */
export function calculateOffset(page: number, pageSize: number): number {
  return (page - 1) * pageSize;
}

/**
 * Create a paginated response from data and total count
 */
export function createPaginatedResponse<T>(
  data: T[],
  totalCount: number,
  page: number,
  pageSize: number
): PaginatedResponse<T> {
  const totalPages = Math.ceil(totalCount / pageSize);
  return {
    data,
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages,
      hasMore: page < totalPages,
    },
  };
}

/**
 * Optional pagination schema - allows queries without pagination params
 */
export const optionalPaginationSchema = z.object({
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(MAX_PAGE_SIZE).optional(),
});

export type OptionalPaginationInput = z.infer<typeof optionalPaginationSchema>;
