// apps/api/src/__tests__/services/flag/flag-defaults.test.ts
// ═══════════════════════════════════════════════════════════════
// FLAG DEFAULTS — Registry-vs-defaults parity (Task #49)
// ─────────────────────────────────────────────────────────────────
// The defaults table is the LAST line of defence — when every other
// layer fails (DB / Redis / PostHog), the evaluator returns the
// value from `FLAG_DEFAULTS`. A missing entry would silently fall
// through to `undefined` ⇒ truthiness-based behaviour in callers ⇒
// untraceable production bugs.
//
// This test asserts:
//   1. Every key in `FLAG_KEYS` has a matching entry in `FLAG_DEFAULTS`.
//   2. Every kill-switch defaults to `false` (kill INACTIVE → system runs).
//   3. AI fallback flags default to `true` (defense-in-depth: keep the
//      fallback chain alive when the primary path is suspect).
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import { ALL_FLAG_KEYS, FLAG_KEYS } from '@repo/shared';
import {
  FLAG_DEFAULTS,
  getFlagDefault,
  getDefaultFlagMap,
} from '../../../services/flag/flag-defaults.js';

describe('flag-defaults', () => {
  describe('coverage', () => {
    it('every registry key has a default', () => {
      for (const key of ALL_FLAG_KEYS) {
        expect(FLAG_DEFAULTS).toHaveProperty(key);
        const v = (FLAG_DEFAULTS as Readonly<Record<string, boolean>>)[key];
        expect(typeof v).toBe('boolean');
      }
    });

    it('default count exactly matches registry size — no orphans', () => {
      // Catches the reverse drift: a default for a flag that
      // is no longer in the registry. Orphan defaults are dead
      // code that grow into confusing config over years.
      const defaultKeys = Object.keys(FLAG_DEFAULTS);
      expect(defaultKeys.length).toBe(ALL_FLAG_KEYS.length);
      for (const k of defaultKeys) {
        expect((ALL_FLAG_KEYS as readonly string[]).includes(k)).toBe(true);
      }
    });
  });

  describe('safety doctrine', () => {
    it('every kill switch defaults to false (kill INACTIVE)', () => {
      // KILLSWITCH_* keys are the system-of-last-resort. Defaulting
      // to true would mean "we permanently broke ourselves on first
      // boot when DB was empty" — exactly the disaster the kill
      // switch should prevent.
      expect(FLAG_DEFAULTS[FLAG_KEYS.KILLSWITCH_AI_PROVIDERS]).toBe(false);
      expect(FLAG_DEFAULTS[FLAG_KEYS.KILLSWITCH_PAYMENTS]).toBe(false);
      expect(FLAG_DEFAULTS[FLAG_KEYS.KILLSWITCH_WHATSAPP_OUTBOUND]).toBe(false);
      expect(FLAG_DEFAULTS[FLAG_KEYS.KILLSWITCH_MEDIA_UPLOAD]).toBe(false);
      expect(FLAG_DEFAULTS[FLAG_KEYS.KILLSWITCH_SIGNUP]).toBe(false);
    });

    it('AI fallback flags default to true (keep chain alive)', () => {
      expect(FLAG_DEFAULTS[FLAG_KEYS.AI_GPT_FALLBACK]).toBe(true);
      expect(FLAG_DEFAULTS[FLAG_KEYS.AI_GEMINI_FALLBACK]).toBe(true);
    });
  });

  describe('getFlagDefault', () => {
    it('returns the registered default for a known key', () => {
      expect(getFlagDefault(FLAG_KEYS.UI_DARK_MODE)).toBe(true);
      expect(getFlagDefault(FLAG_KEYS.CONSULTATION_STREAMING)).toBe(false);
    });

    it('returns false for an unknown key (defensive)', () => {
      // Unknown keys never reach this branch in practice (the
      // evaluator rejects them earlier), but the layered default
      // matters for direct callers (tests, future routes).
      expect(getFlagDefault('definitely.not-a-real-flag')).toBe(false);
    });
  });

  describe('getDefaultFlagMap', () => {
    it('returns a frozen object covering every registry key', () => {
      const map = getDefaultFlagMap();
      for (const k of ALL_FLAG_KEYS) {
        expect(map).toHaveProperty(k);
      }
      // The map MUST be immutable — accidental mutation would
      // poison the fallback path for every subsequent request.
      expect(Object.isFrozen(map)).toBe(true);
    });
  });
});
