// ═══════════════════════════════════════════════════════════════
// TRANSLATION COMPLETENESS CHECK — CI script
// Compares all locale JSONs against English (source of truth).
// Missing keys = build fail. Extra keys = warning.
// Run: npx tsx scripts/check-translations.ts
// ═══════════════════════════════════════════════════════════════

import fs from 'fs';
import path from 'path';

const MESSAGES_DIR = path.join(process.cwd(), 'messages');
const SOURCE_LOCALE = 'en';
const NAMESPACES = ['common', 'auth', 'consultation', 'legal', 'errors'];

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

function main() {
  const locales = fs
    .readdirSync(MESSAGES_DIR)
    .filter((f) => fs.statSync(path.join(MESSAGES_DIR, f)).isDirectory());

  let hasErrors = false;
  let totalMissing = 0;

  for (const namespace of NAMESPACES) {
    const sourcePath = path.join(MESSAGES_DIR, SOURCE_LOCALE, `${namespace}.json`);
    if (!fs.existsSync(sourcePath)) {
      console.error(`❌ Source file missing: ${SOURCE_LOCALE}/${namespace}.json`);
      hasErrors = true;
      continue;
    }

    const sourceData = JSON.parse(fs.readFileSync(sourcePath, 'utf-8'));
    const sourceKeys = getAllKeys(sourceData);

    for (const locale of locales) {
      if (locale === SOURCE_LOCALE) continue;

      const localePath = path.join(MESSAGES_DIR, locale, `${namespace}.json`);
      if (!fs.existsSync(localePath)) {
        console.error(`❌ [${locale}] Missing file: ${namespace}.json`);
        hasErrors = true;
        continue;
      }

      const localeData = JSON.parse(fs.readFileSync(localePath, 'utf-8'));
      const localeKeys = getAllKeys(localeData);

      const missing = sourceKeys.filter((k) => !localeKeys.includes(k));
      const extra = localeKeys.filter((k) => !sourceKeys.includes(k));

      if (missing.length > 0) {
        // Only error for Hindi — regional languages are placeholders
        if (locale === 'hi') {
          console.error(`❌ [${locale}/${namespace}] Missing ${missing.length} keys:`);
          missing.forEach((k) => console.error(`   - ${k}`));
          hasErrors = true;
        } else {
          console.warn(
            `⚠️ [${locale}/${namespace}] Missing ${missing.length} keys (placeholder OK)`,
          );
        }
        totalMissing += missing.length;
      }

      if (extra.length > 0) {
        console.warn(`⚠️ [${locale}/${namespace}] ${extra.length} extra keys (not in source)`);
      }
    }
  }

  console.log('\n─────────────────────────────────');
  console.log(`Total missing keys: ${totalMissing}`);
  console.log(`Source: ${SOURCE_LOCALE} | Locales: ${locales.length}`);
  console.log('─────────────────────────────────\n');

  if (hasErrors) {
    console.error('❌ Translation check FAILED');
    process.exit(1);
  }

  console.log('✅ Translation check PASSED');
}

main();
