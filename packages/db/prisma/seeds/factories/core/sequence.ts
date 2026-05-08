// ═══════════════════════════════════════════════════════════════
// SEQUENCE & SEED MANAGER — Deterministic ID generation (B-2 v2)
//
// Pattern: Fishery sequences + Interface Forge deterministic seeds.
//
// Why deterministic? Same master seed → same data every run.
// Critical for: snapshot tests, reproducible bug reports, CI/CD,
//               golden fixtures, k-anonymity validation.
//
// Implementation choice: FNV-1a hash (industry standard, no deps).
// Ref: http://www.isthe.com/chongo/tech/comp/fnv/
// ═══════════════════════════════════════════════════════════════

import type { FactoryName } from './factory.types';

// ───────────────────────────────────────────────────────────────
// SEQUENCE MANAGER — Singleton class
// ───────────────────────────────────────────────────────────────

/**
 * Per-factory sequence counter.
 *
 * Each factory has its own monotonic counter starting at 1.
 * Master seed feeds into per-call seed derivation, ensuring
 * determinism across runs with the same master seed.
 */
class SequenceManager {
  private sequences = new Map<FactoryName, number>();
  private masterSeed = 0;

  /** Get next sequence for a factory (1-indexed, monotonic). */
  next(name: FactoryName): number {
    const current = this.sequences.get(name) ?? 0;
    const next = current + 1;
    this.sequences.set(name, next);
    return next;
  }

  /** Reset all sequences — call between test runs. */
  resetAll(): void {
    this.sequences.clear();
  }

  /** Reset single factory sequence. */
  reset(name: FactoryName): void {
    this.sequences.set(name, 0);
  }

  /** Set master seed — derives per-factory seeds from this. */
  setMasterSeed(seed: number): void {
    this.masterSeed = seed;
    this.resetAll();
  }

  /** Get current master seed (read-only). */
  getMasterSeed(): number {
    return this.masterSeed;
  }

  /**
   * Derive deterministic seed for a factory call.
   * Formula: (masterSeed + factoryHash + sequence * PRIME) mod MAX_SAFE_INTEGER
   * PRIME = 31 (small prime, common in hash functions).
   */
  deriveSeed(name: FactoryName, sequence: number): number {
    const factoryHash = hashString(name);
    return Math.abs((this.masterSeed + factoryHash + sequence * 31) % Number.MAX_SAFE_INTEGER);
  }

  /** Peek current sequence (without incrementing). */
  peek(name: FactoryName): number {
    return this.sequences.get(name) ?? 0;
  }

  /** Snapshot current state — for debug/telemetry. */
  snapshot(): Readonly<Record<FactoryName, number>> {
    return Object.fromEntries(this.sequences) as Record<FactoryName, number>;
  }
}

// ───────────────────────────────────────────────────────────────
// HASH UTILITY — FNV-1a (deterministic string → integer)
// ───────────────────────────────────────────────────────────────

/**
 * FNV-1a hash — deterministic, fast, no dependencies.
 * Standard 32-bit FNV-1a with offset basis and prime per the spec.
 */
function hashString(str: string): number {
  let hash = 2166136261; // FNV offset basis (32-bit)
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619); // FNV prime (32-bit)
  }
  return Math.abs(hash);
}

// ───────────────────────────────────────────────────────────────
// PUBLIC API — Singleton + free functions
// ───────────────────────────────────────────────────────────────

/** Singleton sequence manager — shared across all factories. */
export const sequenceManager = new SequenceManager();

/** Reset all sequences + set master seed (typically called from CLI). */
export function resetSequences(masterSeed = 0): void {
  sequenceManager.setMasterSeed(masterSeed);
}

/** Get next sequence for factory. */
export function nextSequence(name: FactoryName): number {
  return sequenceManager.next(name);
}

/** Derive deterministic seed for a factory call. */
export function deriveFactorySeed(name: FactoryName, sequence: number): number {
  return sequenceManager.deriveSeed(name, sequence);
}

/** Peek current sequence (read-only). */
export function peekSequence(name: FactoryName): number {
  return sequenceManager.peek(name);
}

/** Snapshot all sequences (debug/telemetry). */
export function snapshotSequences(): Readonly<Record<FactoryName, number>> {
  return sequenceManager.snapshot();
}
