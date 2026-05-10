// ═══════════════════════════════════════════════════════════════
// JSON HELPERS — Prisma read/write type narrowing (B-2 v2)
//
// THE PROBLEM:
//   Prisma's read type (JsonValue) and write type (InputJsonValue) are
//   asymmetric. Read allows null; write requires Prisma.JsonNull or
//   Prisma.DbNull sentinels.
//
//   Factory builders return objects shaped like the read type. Persist
//   functions need write-shape input. Without conversion, every persist
//   boundary throws ~150 TypeScript errors.
//
// THE SOLUTION:
//   - toJsonInput(value)         : for non-nullable Json fields
//   - toNullableJsonInput(value) : for nullable Json? fields
//   - prismaInput<T>(value)      : structural cast escape hatch
//
// Pattern source: Canonical Prisma 7 helper from prisma/prisma#28697 (Nov 2025).
// Verified Nov 2025 — still the recommended pattern for v6.x and v7.x.
// ═══════════════════════════════════════════════════════════════

import { Prisma } from '@prisma/client';

// ───────────────────────────────────────────────────────────────
// PUBLIC TYPES
// ───────────────────────────────────────────────────────────────

/** Prisma input type for non-nullable Json fields. */
export type JsonInput = Prisma.InputJsonValue | typeof Prisma.JsonNull;

/** Prisma input type for nullable Json? fields. */
export type NullableJsonInput =
  | Prisma.InputJsonValue
  | typeof Prisma.JsonNull
  | typeof Prisma.DbNull;

// ───────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ───────────────────────────────────────────────────────────────

/**
 * Narrow a value to Prisma's `InputJsonValue` for non-nullable Json fields.
 *
 * Maps:
 *   undefined / null → Prisma.JsonNull (literal JSON null in column)
 *   any value        → InputJsonValue (passes through)
 *
 * Use for fields declared `field Json` (non-nullable) in schema.prisma.
 *
 * @example
 *   await prisma.user.create({
 *     data: {
 *       email: 'foo@example.com',
 *       metadata: toJsonInput(builtUser.metadata),  // ← Json field
 *     },
 *   });
 */
export function toJsonInput(value: unknown): JsonInput {
  if (value === null || value === undefined) return Prisma.JsonNull;
  return value as Prisma.InputJsonValue;
}

/**
 * Narrow a value to Prisma's nullable JSON input for `Json?` fields.
 *
 * Maps:
 *   undefined → Prisma.DbNull   (SQL NULL — column is unset)
 *   null      → Prisma.JsonNull (literal JSON null stored in column)
 *   any value → InputJsonValue  (passes through)
 *
 * Use for fields declared `field Json?` (nullable) in schema.prisma.
 *
 * The undefined-vs-null distinction matters:
 *   - DbNull   queries with `IS NULL` will match.
 *   - JsonNull queries with `equals: Prisma.JsonNull` will match.
 *
 * @example
 *   await prisma.patient.create({
 *     data: {
 *       userId,
 *       allergies: toNullableJsonInput(builtPatient.allergies),  // ← Json? field
 *     },
 *   });
 */
export function toNullableJsonInput(value: unknown): NullableJsonInput {
  if (value === undefined) return Prisma.DbNull;
  if (value === null) return Prisma.JsonNull;
  return value as Prisma.InputJsonValue;
}

/**
 * Strict structural cast for the Prisma persist boundary.
 *
 * Use when factory output type and Prisma input type are structurally
 * compatible but TypeScript can't infer it (most common: JsonValue →
 * InputJsonValue, or read-shape → write-shape with relation IDs).
 *
 * **Safety:** Prisma runtime-validates the data via its own schema engine.
 * The cast doesn't reduce runtime safety; it only suppresses compile-time
 * type-mismatch errors that arise from Prisma's read/write asymmetry.
 *
 * **Anti-pattern:** Do NOT use this for fields where you'd genuinely
 * benefit from compile-time validation (e.g., `userId: string` →
 * `userId: number` is a real bug, not a Prisma type asymmetry).
 *
 * @example
 *   persist: async (patient, prisma) => {
 *     const created = await prisma.patient.create({
 *       data: prismaInput<Prisma.PatientUncheckedCreateInput>(patient),
 *     });
 *     return created as unknown as typeof patient;
 *   };
 */
export function prismaInput<TPrismaInput>(value: unknown): TPrismaInput {
  return value as unknown as TPrismaInput;
}

/**
 * Recursively narrow ALL JSON-valued fields in an object to InputJsonValue.
 *
 * Walks the object and converts:
 *   - undefined → Prisma.DbNull
 *   - null      → Prisma.JsonNull
 *   - leaves all other values intact
 *
 * Use when you don't know which fields are JSON ahead of time, or when
 * you want a one-shot conversion before passing to Prisma.
 *
 * **Caveat:** This narrows EVERY null/undefined, including non-JSON
 * fields like `expiresAt: Date | null`. Don't use this for objects with
 * mixed nullable scalar fields. For surgical narrowing, use `toJsonInput`
 * or `toNullableJsonInput` per field.
 *
 * @internal — exported for testing; prefer per-field helpers in factories.
 */
export function narrowAllJsonFields<T extends object>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map((item) => narrowAllJsonFields(item)) as unknown as T;

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
      result[key] = Prisma.DbNull;
    } else if (value === null) {
      result[key] = Prisma.JsonNull;
    } else if (typeof value === 'object' && !(value instanceof Date)) {
      result[key] = narrowAllJsonFields(value as object);
    } else {
      result[key] = value;
    }
  }
  return result as T;
}
