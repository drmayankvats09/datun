// ═══════════════════════════════════════════════════════════════
// TRANSLATION COMPLETENESS CHECK — CI-enforced i18n quality gate
// Phase 9: Compares all locale JSONs against English (source of truth).
//
// Rules:
//   - Hindi (hi) = STRICT — missing key = CI FAIL (❌)
//   - Regional (ta,te,bn etc.) = WARN — missing key = warning (⚠️)
//   - Extra keys in ANY locale = warning (schema drift)
//   - Missing file in ANY locale = CI FAIL
//
// Run: cd apps/web && npx tsx scripts/check-translations.ts
// CI: Wired as step in .github/workflows/ci.yml
//
// Pattern: Vercel i18n CI check, Cal.com translation validation.
// ═══════════════════════════════════════════════════════════════

import fs from 'fs';
import path from 'path';

const MESSAGES_DIR = path.join(process.cwd(), 'messages');
const SOURCE_LOCALE = 'en';

// Phase 9: ALL namespaces — glossary was missing before
const NAMESPACES = ['common', 'auth', 'consultation', 'legal', 'errors', 'glossary'];

// Hindi = strict enforcement. Regional = placeholder OK (English fallback).
const STRICT_LOCALES = new Set(['hi']);

interface AuditResult {
  locale: string;
  namespace: string;
  missing: string[];
  extra: string[];
}

function getAllKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...getAllKeys(value as Record<string, unknown>, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

function main(): void {
  console.log('🌐 Translation Completeness Check\n');

  const locales = fs
    .readdirSync(MESSAGES_DIR)
    .filter((f) => fs.statSync(path.join(MESSAGES_DIR, f)).isDirectory())
    .filter((f) => f !== SOURCE_LOCALE);

  let hasErrors = false;
  let totalMissing = 0;
  let totalExtra = 0;
  const results: AuditResult[] = [];

  // ── Source validation ──
  for (const namespace of NAMESPACES) {
    const sourcePath = path.join(MESSAGES_DIR, SOURCE_LOCALE, `${namespace}.json`);
    if (!fs.existsSync(sourcePath)) {
      console.error(`❌ Source file missing: ${SOURCE_LOCALE}/${namespace}.json`);
      hasErrors = true;
      continue;
    }

    const sourceData = JSON.parse(fs.readFileSync(sourcePath, 'utf-8'));
    const sourceKeys = getAllKeys(sourceData);

    // ── Locale validation ──
    for (const locale of locales) {
      const localePath = path.join(MESSAGES_DIR, locale, `${namespace}.json`);

      if (!fs.existsSync(localePath)) {
        console.error(`❌ [${locale}] Missing file: ${namespace}.json`);
        hasErrors = true;
        results.push({ locale, namespace, missing: ['ENTIRE_FILE'], extra: [] });
        continue;
      }

      const localeData = JSON.parse(fs.readFileSync(localePath, 'utf-8'));
      const localeKeys = getAllKeys(localeData);

      const missing = sourceKeys.filter((k) => !localeKeys.includes(k));
      const extra = localeKeys.filter((k) => !sourceKeys.includes(k));

      if (missing.length > 0 || extra.length > 0) {
        results.push({ locale, namespace, missing, extra });
      }

      // Missing keys
      if (missing.length > 0) {
        const isStrict = STRICT_LOCALES.has(locale);
        if (isStrict) {
          console.error(`❌ [${locale}/${namespace}] Missing ${missing.length} keys:`);
          missing.forEach((k) => console.error(`   - ${k}`));
          hasErrors = true;
        } else {
          console.warn(
            `⚠️  [${locale}/${namespace}] Missing ${missing.length} keys (placeholder — English fallback active)`,
          );
        }
        totalMissing += missing.length;
      }

      // Extra keys (always warning — schema drift)
      if (extra.length > 0) {
        console.warn(`⚠️  [${locale}/${namespace}] ${extra.length} extra keys (not in EN source)`);
        extra.forEach((k) => console.warn(`   + ${k}`));
        totalExtra += extra.length;
      }
    }
  }

  // ── Summary ──
  console.log('\n═══════════════════════════════════════════');
  console.log('📊 Translation Audit Summary');
  console.log('═══════════════════════════════════════════');
  console.log(`   Source:        ${SOURCE_LOCALE}`);
  console.log(`   Locales:       ${locales.length} (${locales.join(', ')})`);
  console.log(`   Namespaces:    ${NAMESPACES.length} (${NAMESPACES.join(', ')})`);
  console.log(
    `   Total keys:    ${NAMESPACES.reduce((sum, ns) => {
      const p = path.join(MESSAGES_DIR, SOURCE_LOCALE, `${ns}.json`);
      if (!fs.existsSync(p)) return sum;
      return sum + getAllKeys(JSON.parse(fs.readFileSync(p, 'utf-8'))).length;
    }, 0)} (EN source)`,
  );
  console.log(`   Missing:       ${totalMissing}`);
  console.log(`   Extra:         ${totalExtra}`);
  console.log('═══════════════════════════════════════════\n');

  if (hasErrors) {
    console.error('❌ FAILED — Fix missing keys in strict locales (hi) before merging.\n');
    process.exit(1);
  }

  console.log('✅ PASSED — All strict locale translations complete.\n');
}

main();
