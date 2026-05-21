// ═══════════════════════════════════════════════════════════════
// I18N COVERAGE — emptyStates namespace across every locale
//
// What this file guarantees:
//   • Every supported locale has an `emptyStates` namespace in
//     its `common.json` file.
//   • Every locale carries an entry for every variant defined in
//     `ALL_EMPTY_STATE_VARIANTS` (the registry's source of truth).
//   • Every variant has non-empty `title` and `description`
//     strings — empty/whitespace-only values fail the test.
//   • Action key presence follows the registry's celebratory-vs-
//     actionable contract: celebratory variants must NOT carry an
//     `action`, every other variant MUST.
//
// Why this file matters (regression coverage):
//   The empty-state registry resolves copy through next-intl. A
//   missing key throws at runtime — which means a translator
//   forgetting one variant in one locale will silently break the
//   UI for users who switch to that locale. CI must catch the
//   omission before deploy.
//
// Implementation notes:
//   • We read every locale file directly via `node:fs` rather
//     than `next-intl` to keep the test framework-agnostic and
//     to avoid the mocked-translator surface set up in setup.ts.
//   • `import.meta.url` resolves the messages directory from this
//     test file's location, so the test is portable regardless of
//     where Vitest is invoked from.
// ═══════════════════════════════════════════════════════════════

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  ALL_EMPTY_STATE_VARIANTS,
  type EmptyStateVariant,
} from '../../../components/feedback/empty-state-registry';

// ─────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// This file lives at apps/web/__tests__/components/feedback/<file>.
// The messages directory sits at apps/web/messages/.
const MESSAGES_DIR = resolve(__dirname, '..', '..', '..', 'messages');

const SUPPORTED_LOCALES = ['en', 'hi', 'bn', 'gu', 'kn', 'ml', 'mr', 'pa', 'ta', 'te'] as const;

const CELEBRATORY_VARIANTS: ReadonlySet<EmptyStateVariant> = new Set([
  'noNotifications',
  'noViolations',
]);

// ─────────────────────────────────────────────────────────────────
// TYPES — minimal slice we care about. The full common.json shape
// is intentionally not modelled here; we want to be tolerant to
// new namespaces being added alongside emptyStates.
// ─────────────────────────────────────────────────────────────────

interface EmptyStateEntry {
  title?: unknown;
  description?: unknown;
  action?: unknown;
}

interface CommonJson {
  emptyStates?: Record<string, EmptyStateEntry>;
  [key: string]: unknown;
}

function loadLocale(locale: string): CommonJson {
  const path = resolve(MESSAGES_DIR, locale, 'common.json');
  const raw = readFileSync(path, 'utf-8');
  return JSON.parse(raw) as CommonJson;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

// ─────────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────────

describe('i18n coverage — emptyStates namespace', () => {
  for (const locale of SUPPORTED_LOCALES) {
    describe(`locale: ${locale}`, () => {
      const messages = loadLocale(locale);

      it('has an emptyStates namespace', () => {
        expect(messages.emptyStates).toBeDefined();
        expect(typeof messages.emptyStates).toBe('object');
        expect(messages.emptyStates).not.toBeNull();
      });

      for (const variant of ALL_EMPTY_STATE_VARIANTS) {
        describe(`variant: ${variant}`, () => {
          it('exists', () => {
            const entry = messages.emptyStates?.[variant];
            expect(entry).toBeDefined();
            expect(typeof entry).toBe('object');
          });

          it('has a non-empty title', () => {
            const entry = messages.emptyStates?.[variant];
            expect(isNonEmptyString(entry?.title)).toBe(true);
          });

          it('has a non-empty description', () => {
            const entry = messages.emptyStates?.[variant];
            expect(isNonEmptyString(entry?.description)).toBe(true);
          });

          if (CELEBRATORY_VARIANTS.has(variant)) {
            it('does NOT define an action (celebratory contract)', () => {
              const entry = messages.emptyStates?.[variant];
              expect(entry?.action).toBeUndefined();
            });
          } else {
            it('has a non-empty action (actionable contract)', () => {
              const entry = messages.emptyStates?.[variant];
              expect(isNonEmptyString(entry?.action)).toBe(true);
            });
          }
        });
      }
    });
  }
});
