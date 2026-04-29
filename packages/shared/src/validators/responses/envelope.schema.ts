// ═══════════════════════════════════════════════════════════════
// API RESPONSE ENVELOPE — Standard wrapper for all API responses
// Replaces manual ApiResponse<T> in apps/web/lib/auth.ts
//
// Pattern: Stripe API responses, Linear GraphQL responses.
// ═══════════════════════════════════════════════════════════════

import { z } from 'zod';
import type { ErrorCode } from './error-codes';

/**
 * Success response wrapper.
 * Every successful API response follows this shape.
 *
 * @example
 * ```ts
 * const response: ApiSuccessResponse<{ user: User }> = {
 *   success: true,
 *   data: { user: { id: '...', email: '...' } }
 * };
 * ```
 */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

/**
 * Error response wrapper.
 * Every failed API response follows this shape.
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, string[]>;
  };
}

/** Union type — every API response is either success or error */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Paginated response wrapper — list endpoints.
 * Used by: consultation list, clinic leads, appointments, admin search.
 */
export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

/**
 * Zod schema for pagination metadata — validates backend output.
 */
export const paginationMetaSchema = z.object({
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
  hasMore: z.boolean(),
});

export type PaginationMeta = z.infer<typeof paginationMetaSchema>;
