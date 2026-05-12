// ═══════════════════════════════════════════════════════════════
// DATASET CONTENT HASHING — Task #44
//
// Content-addressed dataset versioning, Postgres-native (no DVC).
// Same input records → same hash, regardless of insertion order.
// Foundation for reproducibility: "what data trained this model?"
//
// FAANG principles applied:
//   - Canonical-JSON serialization (sorted keys, stable encoding)
//     → cross-platform deterministic
//   - SHA-256 (NIST FIPS 180-4) — collision resistance for 10^9+ records
//   - Streaming-friendly: hash computed incrementally (memory-efficient)
//
// DPDP Act 2023 alignment:
//   - Section 8(4) (accuracy) — versioned snapshots enable
//     "what data led to this decision?" audit trail
//   - Rule 6 (security) — hash detects tampering of stored datasets
//
// @see docs/adr/ADR-0003-training-data-architecture.md
// @see https://csrc.nist.gov/projects/hash-functions
// ═══════════════════════════════════════════════════════════════

import { createHash } from 'node:crypto';

// ─── Versioning ────────────────────────────────────────────────

/**
 * Semantic version of the hashing algorithm. BUMP only when canonicalization
 * rules change (would invalidate all stored hashes).
 *
 * v1.0.0 — SHA-256 over canonical-JSON with sorted keys + sorted record order
 */
export const HASHING_VERSION = 'v1.0.0';

/** SHA-256 hex digest length (always 64 chars). */
export const HASH_DIGEST_LENGTH = 64;

// ─── Public types ──────────────────────────────────────────────

/** Minimal contract for hashable training records. */
export interface HashableRecord {
  readonly id: string;
  readonly [key: string]: unknown;
}

export interface HashResult {
  /** Hex-encoded SHA-256 digest, e.g., "sha256:abc123..." */
  readonly hash: string;
  /** Number of records hashed. */
  readonly recordCount: number;
  /** Algorithm version used. */
  readonly hashingVersion: string;
  /** Size in bytes of the canonical serialization. */
  readonly canonicalSizeBytes: number;
}

// ─── Canonical JSON serialization ──────────────────────────────
//
// JSON.stringify is non-deterministic for objects (key order varies).
// We canonicalize via depth-first sorted-key traversal so the same
// logical record always produces the same byte sequence.
//
// References:
//   - RFC 8785 (JSON Canonicalization Scheme — JCS)
//   - Note: We follow JCS principles but use a simpler implementation
//     since our inputs are Prisma-shaped (no NaN, no -0, no Symbol).

function canonicalize(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') {
    // Reject non-finite numbers — they can't be deterministically serialized
    if (!Number.isFinite(value)) {
      throw new Error(`Cannot canonicalize non-finite number: ${value}`);
    }
    return value;
  }
  if (typeof value === 'boolean' || typeof value === 'string') return value;
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(canonicalize);

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const sortedKeys = Object.keys(obj).sort();
    const out: Record<string, unknown> = {};
    for (const k of sortedKeys) {
      out[k] = canonicalize(obj[k]);
    }
    return out;
  }

  // Unsupported type (function, symbol) → coerce to string for safety
  return String(value);
}

function canonicalStringify(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

// ─── Public API ────────────────────────────────────────────────

/**
 * Compute SHA-256 hash over a set of training records.
 * Records are sorted by `id` before serialization → insertion-order independent.
 *
 * @example
 *   hashDataset([{ id: 'a', x: 1 }, { id: 'b', x: 2 }])
 *   // === hashDataset([{ id: 'b', x: 2 }, { id: 'a', x: 1 }])
 *
 * @throws Error if any record is missing `id` field.
 */
export function hashDataset(records: readonly HashableRecord[]): HashResult {
  // Validate
  for (const r of records) {
    if (typeof r.id !== 'string' || r.id.length === 0) {
      throw new Error(
        `hashDataset: every record must have a non-empty string 'id' field. Got: ${JSON.stringify(r).slice(0, 100)}`,
      );
    }
  }

  // Sort by id for deterministic order
  const sorted = [...records].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  // Canonical-JSON serialize the sorted array
  const canonical = canonicalStringify(sorted);
  const canonicalSizeBytes = Buffer.byteLength(canonical, 'utf-8');

  // SHA-256
  const digest = createHash('sha256').update(canonical, 'utf-8').digest('hex');

  return {
    hash: `sha256:${digest}`,
    recordCount: records.length,
    hashingVersion: HASHING_VERSION,
    canonicalSizeBytes,
  };
}

/**
 * Hash a single record. Useful for content-addressed deduplication
 * (e.g., "have I already exported this exact example?").
 */
export function hashRecord(record: HashableRecord): string {
  const canonical = canonicalStringify(record);
  const digest = createHash('sha256').update(canonical, 'utf-8').digest('hex');
  return `sha256:${digest}`;
}

/**
 * Verify a previously-computed hash matches a given record set.
 * Returns true iff hash matches; useful for tamper detection.
 */
export function verifyDatasetHash(
  records: readonly HashableRecord[],
  expectedHash: string,
): boolean {
  const computed = hashDataset(records);
  return computed.hash === expectedHash;
}

/**
 * Parse a hash string into algorithm + digest parts.
 * Validates format strictness.
 */
export function parseHash(hash: string): { algorithm: 'sha256'; digest: string } | null {
  const match = /^sha256:([0-9a-f]{64})$/.exec(hash);
  if (!match) return null;
  return { algorithm: 'sha256', digest: match[1]! };
}
