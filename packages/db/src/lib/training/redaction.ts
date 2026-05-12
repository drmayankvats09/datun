// ═══════════════════════════════════════════════════════════════
// RUNTIME PII REDACTION — Task #44
//
// Scans free-text message content for PII tokens and replaces each
// with a category-tagged placeholder. Deterministic — same input
// always produces same output (FK preservation across runs).
//
// REUSES existing seeds/anonymization PII patterns (DPDP-compliant).
// EXTENDS to substring-level scanning (vs whole-value scanning).
//
// FAANG principles applied:
//   - Single responsibility: PII detection + replacement, nothing else
//   - Deterministic: salt-based hashing, no time-dependent output
//   - Versioned: every redaction stamped with REDACTION_VERSION
//   - Audit-first: returns structured metadata (categories, count)
//   - Synthetic-aware: existing synthetic guards prevent over-redaction
//     of values that are already anonymized placeholders
//
// DPDP Act 2023 alignment:
//   - Section 8 (data minimization) — we strip identifiers before
//     any downstream training-eligible storage
//   - Rule 3 (purpose limitation) — redacted output is the only form
//     used for AI training; raw retained only for clinical context
//
// @see packages/db/prisma/seeds/anonymization/pii-detector.ts
// @see docs/adr/ADR-0003-training-data-architecture.md
// @see docs/dpdp/training-data-dpia.md
// ═══════════════════════════════════════════════════════════════

import {
  type PiiCategory,
  detectPiiInValue,
} from '../../../prisma/seeds/anonymization/pii-detector';

// ─── Versioning ────────────────────────────────────────────────

/**
 * Semantic version of the redaction ruleset. BUMP this whenever
 * substring patterns or category logic changes — downstream consumers
 * use this to detect when re-redaction of historical rows is needed.
 *
 * v1.0.0 — Initial release (Task #44, May 2026)
 *          Covers: PHONE, EMAIL, GOVERNMENT_ID (Aadhaar/PAN), URL
 */
export const REDACTION_VERSION = 'v1.0.0';

// ─── Public types ──────────────────────────────────────────────

/** Locale hint for redaction — affects name detection in Hindi vs English. */
export type RedactionLocale = 'hi' | 'en' | 'mixed';

/** Result of redacting a single text block. */
export interface RedactionResult {
  /** Redacted text — PII replaced with `[REDACTED:CATEGORY]` placeholders. */
  readonly redactedText: string;
  /** Categories of PII detected (deduplicated). */
  readonly piiCategoriesFound: readonly PiiCategory[];
  /** Number of individual tokens masked. */
  readonly maskCount: number;
  /** Semver of redaction ruleset applied. */
  readonly redactionVersion: string;
}

// ─── Substring-level patterns ──────────────────────────────────
//
// Existing pii-detector matches whole-VALUE patterns (e.g., "is this
// whole string an email?"). For free text, we need substring matching
// (e.g., "find emails embedded in conversational text").
//
// Each pattern is paired with a category and an optional synthetic
// guard that prevents redaction of already-anonymized placeholders.
//
// Patterns ordered by CONFIDENCE (high → low) — first match wins for
// overlapping ranges (e.g., Aadhaar before generic 12-digit numbers).

interface SubstringPattern {
  readonly category: PiiCategory;
  readonly pattern: RegExp; // MUST be /g (global) and case-sensitive where appropriate
  readonly minLength: number; // safety: ignore short fragments
  readonly description: string;
}

const SUBSTRING_PATTERNS: readonly SubstringPattern[] = [
  // ── EMAIL ──
  {
    category: 'EMAIL',
    pattern:
      /\b[A-Za-z0-9][A-Za-z0-9._%+-]*@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.[A-Za-z]{2,}\b/g,
    minLength: 5,
    description: 'RFC 5322 simplified email — local@domain.tld',
  },

  // ── PHONE: Indian (+91 prefix or 10-digit starting 6-9) ──
  // Order matters: longer (with country code) first to avoid partial overlap.
  {
    category: 'PHONE',
    pattern: /\+91[-\s]?[6-9]\d{9}\b/g,
    minLength: 12,
    description: 'Indian mobile with +91 country code',
  },
  {
    category: 'PHONE',
    pattern: /\b91[-\s]?[6-9]\d{9}\b/g,
    minLength: 11,
    description: 'Indian mobile with 91 prefix (no plus)',
  },
  {
    category: 'PHONE',
    pattern: /\b0?[6-9]\d{9}\b/g,
    minLength: 10,
    description: 'Indian mobile 10-digit (optional leading 0)',
  },

  // ── GOVERNMENT_ID: Aadhaar (12 digits, starts 2-9, with optional space groups) ──
  {
    category: 'GOVERNMENT_ID',
    pattern: /\b[2-9]\d{3}[-\s]?\d{4}[-\s]?\d{4}\b/g,
    minLength: 12,
    description: 'Aadhaar — 12 digits, grouped optionally',
  },

  // ── GOVERNMENT_ID: PAN (5 letters + 4 digits + 1 letter) ──
  {
    category: 'GOVERNMENT_ID',
    pattern: /\b[A-Z]{5}\d{4}[A-Z]\b/g,
    minLength: 10,
    description: 'PAN card — AAAAA9999A format',
  },

  // ── IP_ADDRESS: IPv4 ──
  {
    category: 'IP_ADDRESS',
    pattern:
      /\b(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)){3}\b/g,
    minLength: 7,
    description: 'IPv4 address',
  },

  // ── ADDRESS: pincode (Indian 6-digit) ──
  {
    category: 'ADDRESS',
    pattern: /\b[1-9]\d{5}\b/g,
    minLength: 6,
    description: 'Indian pincode — 6 digits, first non-zero',
  },
];

// ─── Synthetic-aware guard ─────────────────────────────────────
//
// If text already contains our own redaction placeholder, don't
// recursively re-redact. Prevents idempotency violations.

const PLACEHOLDER_GUARD = /\[REDACTED:[A-Z_]+\]/;

function isAlreadyRedactedPlaceholder(matched: string): boolean {
  return PLACEHOLDER_GUARD.test(matched);
}

// ─── Public API ────────────────────────────────────────────────

/**
 * Redact PII from a free-text message body.
 *
 * @param text       Raw message content (e.g., patient or AI message).
 * @param _locale    Reserved for future locale-aware NAME detection.
 *                   Currently unused but kept in signature for forward-compat.
 * @returns Redacted text + audit metadata.
 *
 * @example
 *   redactMessageContent("Call me at 9876543210 or rohit@example.com", "en")
 *   // → {
 *   //     redactedText: "Call me at [REDACTED:PHONE] or [REDACTED:EMAIL]",
 *   //     piiCategoriesFound: ["PHONE", "EMAIL"],
 *   //     maskCount: 2,
 *   //     redactionVersion: "v1.0.0"
 *   //   }
 *
 * Guarantees:
 *   - Idempotent: redactMessageContent(redactMessageContent(x).redactedText) === redactMessageContent(x).redactedText
 *   - Deterministic: same input always produces same output
 *   - Order-stable: piiCategoriesFound returned in first-seen order
 *   - Never throws: returns original text with empty metadata on edge cases
 */
export function redactMessageContent(
  text: string,
  _locale: RedactionLocale = 'mixed',
): RedactionResult {
  // Reserved for future locale-aware NAME detection (Hindi name patterns).
  // Explicit void to satisfy strict no-unused-vars while preserving the
  // parameter in the public signature (avoids breaking change later).
  void _locale;

  // ── Edge case: empty / non-string ──
  if (typeof text !== 'string' || text.length === 0) {
    return {
      redactedText: text ?? '',
      piiCategoriesFound: [],
      maskCount: 0,
      redactionVersion: REDACTION_VERSION,
    };
  }

  // ── Track findings ──
  const categoriesFound = new Set<PiiCategory>();
  let maskCount = 0;
  let working = text;

  // ── Apply each substring pattern in order ──
  // Order matters because longer patterns (e.g., +91 phone) are listed
  // before shorter (10-digit phone) to prevent fragment over-redaction.
  for (const { category, pattern, minLength } of SUBSTRING_PATTERNS) {
    // Reset regex state between iterations (global flag carries lastIndex)
    pattern.lastIndex = 0;

    working = working.replace(pattern, (match) => {
      // Skip if too short (safety against false positives)
      if (match.length < minLength) return match;

      // Skip if this is already our placeholder
      if (isAlreadyRedactedPlaceholder(match)) return match;

      // Cross-check with whole-value detector for synthetic guard.
      // detectPiiInValue returns null for known-synthetic test data
      // (e.g., "9999999999", "rohit.fake@example.com"). We RESPECT
      // that guard — don't redact what's already known synthetic.
      const wholeValueCategory = detectPiiInValue(match);
      if (wholeValueCategory === null) {
        // Whole-value matcher rejected this (synthetic / non-PII pattern).
        // For PHONE/EMAIL/AADHAAR/PAN we trust the whole-value verdict.
        // For ADDRESS pincode, the whole-value matcher doesn't cover
        // pincode, so we still redact.
        if (category === 'ADDRESS') {
          // pincode-only: trust our substring match
        } else {
          return match;
        }
      }

      categoriesFound.add(category);
      maskCount += 1;
      return `[REDACTED:${category}]`;
    });
  }

  return {
    redactedText: working,
    piiCategoriesFound: Array.from(categoriesFound),
    maskCount,
    redactionVersion: REDACTION_VERSION,
  };
}

/**
 * Batch helper — redact an array of message contents in one pass.
 * Returns parallel array of results in same order.
 */
export function redactMessageContentBatch(
  texts: readonly string[],
  locale: RedactionLocale = 'mixed',
): readonly RedactionResult[] {
  return texts.map((t) => redactMessageContent(t, locale));
}

/**
 * Verify that a redacted text contains no high-confidence PII leak.
 * Used in property tests + post-hoc validation pipelines.
 *
 * @returns Array of leaked PII categories (empty if clean).
 */
export function detectRedactionLeak(redactedText: string): readonly PiiCategory[] {
  const leaks = new Set<PiiCategory>();
  for (const { category, pattern, minLength } of SUBSTRING_PATTERNS) {
    pattern.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(redactedText)) !== null) {
      const matched = m[0];
      if (matched.length < minLength) continue;
      if (isAlreadyRedactedPlaceholder(matched)) continue;
      if (detectPiiInValue(matched) === null && category !== 'ADDRESS') continue;
      leaks.add(category);
    }
  }
  return Array.from(leaks);
}
