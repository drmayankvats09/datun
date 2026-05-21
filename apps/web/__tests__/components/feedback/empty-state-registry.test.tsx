// ═══════════════════════════════════════════════════════════════
// EMPTY STATE REGISTRY — Contract tests
//
// What this file guarantees:
//   • The registry exposes exactly 12 variants (Task #51 spec).
//   • Every variant has the four required descriptor fields:
//       icon, titleKey, descriptionKey, tone.
//   • Celebratory variants (`noNotifications`, `noViolations`) do
//     NOT define an action — that is the visual contract that
//     turns them into "positive" feedback surfaces.
//   • Every other variant DOES define an action.
//   • The `ALL_EMPTY_STATE_VARIANTS` list is in sync with the
//     `EMPTY_STATE_REGISTRY` object (no drift between sources).
//   • The `getEmptyStateDescriptor` helper throws an explicit,
//     debuggable error for unknown variants.
//   • The `isEmptyStateVariant` type guard returns the correct
//     boolean for valid and invalid inputs.
//
// Why this file matters (regression coverage):
//   The registry is the spinal cord of every empty-state surface
//   shipping in Task #51 and the next ~70 tasks. If a future PR
//   accidentally removes a variant, mistypes a key path, or breaks
//   the celebratory-vs-actionable invariant, the corresponding UI
//   would silently fail at runtime. CI must catch that here.
// ═══════════════════════════════════════════════════════════════

import { describe, expect, it } from 'vitest';

import {
  ALL_EMPTY_STATE_VARIANTS,
  EMPTY_STATE_REGISTRY,
  getEmptyStateDescriptor,
  isEmptyStateVariant,
  type EmptyStateTone,
  type EmptyStateVariant,
} from '../../../components/feedback/empty-state-registry';

// ─────────────────────────────────────────────────────────────────
// CONSTANTS — kept in sync with the registry's `as const` shape.
// If the spec ever grows beyond 12 variants, update both numbers.
// ─────────────────────────────────────────────────────────────────

const EXPECTED_VARIANT_COUNT = 12;
const CELEBRATORY_VARIANTS: ReadonlySet<EmptyStateVariant> = new Set([
  'noNotifications',
  'noViolations',
]);
const VALID_TONES: ReadonlySet<EmptyStateTone> = new Set([
  'neutral',
  'positive',
  'warning',
  'restrictive',
]);

describe('EMPTY_STATE_REGISTRY', () => {
  it(`registers exactly ${EXPECTED_VARIANT_COUNT} variants`, () => {
    expect(Object.keys(EMPTY_STATE_REGISTRY)).toHaveLength(EXPECTED_VARIANT_COUNT);
    expect(ALL_EMPTY_STATE_VARIANTS).toHaveLength(EXPECTED_VARIANT_COUNT);
  });

  it('keeps ALL_EMPTY_STATE_VARIANTS in sync with the registry keys', () => {
    const registryKeys = new Set(Object.keys(EMPTY_STATE_REGISTRY) as EmptyStateVariant[]);
    const listKeys = new Set(ALL_EMPTY_STATE_VARIANTS);
    expect(registryKeys).toEqual(listKeys);
  });

  describe('descriptor shape — every variant', () => {
    for (const variant of ALL_EMPTY_STATE_VARIANTS) {
      describe(variant, () => {
        const descriptor = EMPTY_STATE_REGISTRY[variant];

        it('has an icon component', () => {
          expect(descriptor.icon).toBeDefined();
          // Lucide icons are forward-ref function components.
          expect(typeof descriptor.icon).toBe('object');
        });

        it('has a translation-ready titleKey', () => {
          expect(typeof descriptor.titleKey).toBe('string');
          expect(descriptor.titleKey).toMatch(/^emptyStates\..+\.title$/);
        });

        it('has a translation-ready descriptionKey', () => {
          expect(typeof descriptor.descriptionKey).toBe('string');
          expect(descriptor.descriptionKey).toMatch(/^emptyStates\..+\.description$/);
        });

        it('has a valid tone', () => {
          expect(VALID_TONES.has(descriptor.tone)).toBe(true);
        });
      });
    }
  });

  describe('action presence — celebratory vs actionable contract', () => {
    for (const variant of ALL_EMPTY_STATE_VARIANTS) {
      const descriptor = EMPTY_STATE_REGISTRY[variant];

      if (CELEBRATORY_VARIANTS.has(variant)) {
        it(`${variant} (celebratory) has NO actionKey`, () => {
          expect(descriptor.actionKey).toBeUndefined();
        });
      } else {
        it(`${variant} (actionable) has an actionKey`, () => {
          expect(typeof descriptor.actionKey).toBe('string');
          expect(descriptor.actionKey).toMatch(/^emptyStates\..+\.action$/);
        });
      }
    }
  });
});

describe('getEmptyStateDescriptor', () => {
  it('returns the matching descriptor for a known variant', () => {
    const descriptor = getEmptyStateDescriptor('noConsultations');
    expect(descriptor.titleKey).toBe('emptyStates.noConsultations.title');
    expect(descriptor.descriptionKey).toBe('emptyStates.noConsultations.description');
    expect(descriptor.actionKey).toBe('emptyStates.noConsultations.action');
    expect(descriptor.tone).toBe('neutral');
  });

  it('throws a debuggable error for unknown variants', () => {
    expect(() =>
      // The cast deliberately bypasses the union check — we are
      // exercising the runtime guard, not the static one.
      getEmptyStateDescriptor('thisVariantDoesNotExist' as EmptyStateVariant),
    ).toThrowError(/Unknown variant "thisVariantDoesNotExist"/);
  });
});

describe('isEmptyStateVariant — runtime type guard', () => {
  it('returns true for every registered variant string', () => {
    for (const variant of ALL_EMPTY_STATE_VARIANTS) {
      expect(isEmptyStateVariant(variant)).toBe(true);
    }
  });

  it('returns false for unknown strings', () => {
    expect(isEmptyStateVariant('noSuchVariant')).toBe(false);
    expect(isEmptyStateVariant('')).toBe(false);
  });

  it('returns false for non-string inputs', () => {
    expect(isEmptyStateVariant(42)).toBe(false);
    expect(isEmptyStateVariant(null)).toBe(false);
    expect(isEmptyStateVariant(undefined)).toBe(false);
    expect(isEmptyStateVariant({})).toBe(false);
    expect(isEmptyStateVariant([])).toBe(false);
    expect(isEmptyStateVariant(true)).toBe(false);
  });
});
