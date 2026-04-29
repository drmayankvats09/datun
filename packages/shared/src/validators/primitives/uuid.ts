// ═══════════════════════════════════════════════════════════════
// UUID PRIMITIVE — UUID v4 format validation
// Used by: route params (:id), consultationStartSchema,
//          appointmentSchema, clinicSchema — anywhere an entity ID appears
//
// Security: Prevents path traversal ("../../../etc/passwd") and
//           SQL injection ("'; DROP TABLE users; --") in URL params.
//
// Pattern: Stripe resource IDs, Linear issue IDs.
// ═══════════════════════════════════════════════════════════════

import { z } from 'zod';

/** UUID v4 regex — 8-4-4-4-12 hex chars with version 4 marker */
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * UUID v4 field — entity identifier.
 *
 * @example
 * ```ts
 * uuidField.parse("550e8400-e29b-41d4-a716-446655440000"); // ✅
 * uuidField.parse("not-a-uuid");                            // ❌
 * uuidField.parse("'; DROP TABLE users; --");               // ❌
 * uuidField.parse("../../../etc/passwd");                   // ❌
 * ```
 */
export const uuidField = z.string().regex(UUID_V4_REGEX, 'Must be a valid UUID v4');

/**
 * Generic string ID — for cases where IDs are not UUID
 * (e.g., consultation clientUuid from frontend, cuid, etc.)
 */
export const stringIdField = z
  .string()
  .min(1, 'ID is required')
  .max(64, 'ID must not exceed 64 characters')
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    'ID must contain only alphanumeric characters, hyphens, and underscores',
  );

/** UUID type */
export type UUID = z.infer<typeof uuidField>;
