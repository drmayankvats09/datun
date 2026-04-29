// ═══════════════════════════════════════════════════════════════
// PAGINATION PRIMITIVE — Cursor/offset pagination fields
// Used by: consultation list, clinic leads, appointment list,
//          admin user search, analytics queries
//
// Supports both offset (page/limit) and cursor pagination.
// FAANG pattern: cursor for infinite scroll, offset for tables.
//
// Pattern: Stripe list API, GitHub API pagination.
// ═══════════════════════════════════════════════════════════════

import { z } from 'zod';

/** Pagination limits — prevent abuse */
export const PAGINATION_LIMITS = {
  defaultPage: 1,
  defaultLimit: 20,
  maxLimit: 100,
} as const;

/**
 * Offset pagination — page + limit.
 * Used in dashboard tables, admin panels.
 *
 * @example
 * ```ts
 * // GET /api/consultations?page=2&limit=20
 * offsetPaginationSchema.parse({ page: 2, limit: 20 }); // ✅
 * offsetPaginationSchema.parse({});                      // ✅ { page: 1, limit: 20 }
 * offsetPaginationSchema.parse({ limit: 500 });          // ❌ max 100
 * ```
 */
export const offsetPaginationSchema = z.object({
  page: z.coerce
    .number()
    .int('Page must be an integer')
    .min(1, 'Page must be at least 1')
    .default(PAGINATION_LIMITS.defaultPage),
  limit: z.coerce
    .number()
    .int('Limit must be an integer')
    .min(1, 'Limit must be at least 1')
    .max(PAGINATION_LIMITS.maxLimit, `Limit must not exceed ${PAGINATION_LIMITS.maxLimit}`)
    .default(PAGINATION_LIMITS.defaultLimit),
});

/**
 * Cursor pagination — cursor + limit.
 * Used in infinite scroll (consultation history, chat messages).
 */
export const cursorPaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(PAGINATION_LIMITS.maxLimit)
    .default(PAGINATION_LIMITS.defaultLimit),
});

/**
 * Sort order — ascending or descending.
 * Used with pagination for ordered results.
 */
export const sortOrderField = z.enum(['asc', 'desc']).default('desc');

/** Pagination types */
export type OffsetPagination = z.infer<typeof offsetPaginationSchema>;
export type CursorPagination = z.infer<typeof cursorPaginationSchema>;
export type SortOrder = z.infer<typeof sortOrderField>;
