// apps/web/scripts/build-inline-hashes.ts
// ═══════════════════════════════════════════════════════════════
// BUILD-TIME INLINE SCRIPT HASH GENERATOR — Task #45 (CSP)
//
// Scans static pages for inline <script type="application/ld+json"> blocks,
// computes SHA-256 hashes, writes them to apps/web/lib/csp/inline-hashes.ts.
//
// SCRIPTS COVERED (5 static pages identified by route-classification.ts):
//   1. /                       → Organization schema  (homepage)
//   2. /(legal)/privacy        → WebPage schema       (privacy policy)
//   3. /(legal)/terms          → WebPage schema       (terms of service)
//   4. /(legal)/cookies        → WebPage schema       (cookie policy)
//   5. /(legal)/dpdp-notice    → WebPage schema       (DPDP notice)
//
// CONTRACT: each descriptor's `build()` MUST produce the exact text that
// appears inside the corresponding page's <script type="application/ld+json">.
// If they diverge, the runtime hash will not match the build-time hash and
// the page's inline script will be blocked under strict CSP.
//
// PROOF OF MATCH: Patches 1-5 (homepage + 4 legal pages) use an IDENTICAL
// stableJson() function definition. As long as that helper is identical
// across all 6 locations (5 pages + this script), output is deterministic.
//
// RUN:
//   - Automatic:   prebuild hook in apps/web/package.json
//                  (add `"prebuild": "tsx scripts/build-inline-hashes.ts"`)
//   - Manual:      pnpm --filter web exec tsx scripts/build-inline-hashes.ts
//
// Pattern: Astro's static CSP example, SvelteKit hash-CSP plugin.
// ═══════════════════════════════════════════════════════════════

import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
// ─────────────────────────────────────────────────────────────────────────────
// INLINED BRAND/URLS — Option F5 (Task #45).
// We cannot `import { BRAND, URLS } from '@repo/shared'` here because:
//   1. apps/web/package.json has `"type": "module"` (ESM context).
//   2. packages/shared has no `"type": "module"` (CJS, consumed as TS source).
//   3. tsx (which runs this prebuild script) uses Node's ESM loader, which does
//      not synthesize named exports from a CJS module → `SyntaxError: The
//      requested module '@repo/shared' does not provide an export named 'BRAND'`.
// Turbopack/Vitest/tsup handle this fine via their own resolvers, but tsx does
// not. The proper fix is Task #45.5: add a tsup build pipeline to @repo/shared
// producing real `dist/index.js` (ESM + CJS dual). Until then, inline the 6
// fields we use. KEEP IN SYNC with packages/shared/src/{brand,urls}.ts —
// drift here will cause SHA-256 hash mismatch and CSP-block static pages.
// ─────────────────────────────────────────────────────────────────────────────
const BRAND = {
  name: 'Datun',
  legalName: 'Datun Health Private Limited',
  description:
    'AI-powered healthcare platform for India, beginning with dental care and expanding across medical verticals.',
} as const;

const URLS = {
  websiteHttps: 'https://datunai.com',
  social: {
    instagram: 'https://instagram.com/datun.ai',
    linkedin: 'https://linkedin.com/company/datunai',
  },
} as const;

// __dirname equivalent for ESM (this script may be run via tsx which uses ESM)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Output file path — must match the import in next.config.ts. */
const OUTPUT_FILE = resolve(__dirname, '..', 'lib', 'csp', 'inline-hashes.ts');

/**
 * Stable JSON.stringify — sorted object keys ensure deterministic output.
 *
 * IDENTITY INVARIANT: this function MUST be byte-identical to the
 * stableJson() function inlined at the top of every static page that
 * contains an inline JSON-LD <script>. If you change one, change all.
 */
function stableJson(value: unknown): string {
  return JSON.stringify(value, (_key, val) => {
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      const sorted: Record<string, unknown> = {};
      for (const k of Object.keys(val as Record<string, unknown>).sort()) {
        sorted[k] = (val as Record<string, unknown>)[k];
      }
      return sorted;
    }
    return val;
  });
}

/**
 * One inline script that appears on a static page.
 * `id` is human-readable (used in generated file comments).
 * `build()` returns the EXACT text the browser will see as script.textContent.
 */
interface ScriptDescriptor {
  id: string;
  build(): string;
}

/**
 * All inline JSON-LD scripts on static pages.
 *
 * When a new static page with inline JSON-LD is added:
 *   1. Add a descriptor here.
 *   2. Re-run this script (pnpm --filter web run build:hashes).
 *   3. The new hash will be included in `inline-hashes.ts`.
 *
 * Static-page detection lives in apps/web/lib/csp/route-classification.ts —
 * keep both in sync.
 */
const SCRIPTS: readonly ScriptDescriptor[] = [
  {
    id: 'homepage:organization',
    build: () =>
      stableJson({
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: BRAND.name,
        legalName: BRAND.legalName,
        url: URLS.websiteHttps,
        description: BRAND.description,
        sameAs: [URLS.social.instagram, URLS.social.linkedin],
      }),
  },
  {
    id: 'legal:privacy:webpage',
    build: () =>
      stableJson({
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'Privacy Policy',
        description: `How ${BRAND.name} collects, uses, and protects your personal and health data.`,
        url: 'https://datunai.com/privacy',
        inLanguage: 'en',
        publisher: {
          '@type': 'Organization',
          name: BRAND.legalName,
          url: 'https://datunai.com',
        },
        dateModified: '2026-04-23',
      }),
  },
  {
    id: 'legal:terms:webpage',
    build: () =>
      stableJson({
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'Terms of Service',
        description: `Terms governing the use of ${BRAND.name}, an AI-powered dental health platform.`,
        url: 'https://datunai.com/terms',
        inLanguage: 'en',
        publisher: {
          '@type': 'Organization',
          name: BRAND.legalName,
          url: 'https://datunai.com',
        },
        dateModified: '2026-04-23',
      }),
  },
  {
    id: 'legal:cookies:webpage',
    build: () =>
      stableJson({
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'Cookie Policy',
        description: `How ${BRAND.name} uses cookies and similar technologies.`,
        url: 'https://datunai.com/cookies',
        inLanguage: 'en',
        publisher: {
          '@type': 'Organization',
          name: BRAND.legalName,
          url: 'https://datunai.com',
        },
        dateModified: '2026-04-23',
      }),
  },
  {
    id: 'legal:dpdp-notice:webpage',
    build: () =>
      stableJson({
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'DPDP Act Notice',
        description: `${BRAND.name}'s notice under the Digital Personal Data Protection Act, 2023.`,
        url: 'https://datunai.com/dpdp-notice',
        inLanguage: 'en',
        publisher: {
          '@type': 'Organization',
          name: BRAND.legalName,
          url: 'https://datunai.com',
        },
        dateModified: '2026-04-23',
      }),
  },
];

/**
 * Compute the `'sha256-<base64>'` CSP directive token for a string.
 *
 * Browser computes SHA-256 of the script's raw text content, base64-encodes
 * the digest, and matches against this list with the literal `sha256-` prefix.
 */
function hashCspSha256(content: string): string {
  const digest = createHash('sha256').update(content, 'utf8').digest('base64');
  return `sha256-${digest}`;
}

async function main(): Promise<void> {
  const entries = SCRIPTS.map((s) => ({
    id: s.id,
    hash: hashCspSha256(s.build()),
  }));

  // De-dupe by hash (e.g., if two pages had identical JSON-LD).
  const seen = new Set<string>();
  const unique: typeof entries = [];
  for (const e of entries) {
    if (seen.has(e.hash)) continue;
    seen.add(e.hash);
    unique.push(e);
  }

  // Pretty-printed array literal preserving sha256- prefix.
  const arrayLiteral = '[\n' + unique.map((e) => `  // ${e.id}\n  '${e.hash}',`).join('\n') + '\n]';

  const fileContent = `// apps/web/lib/csp/inline-hashes.ts
// AUTO-GENERATED by scripts/build-inline-hashes.ts. DO NOT EDIT BY HAND.
// Regenerate via: pnpm --filter web run build:hashes
// Last generated: ${new Date().toISOString()}

/**
 * Whitelisted SHA-256 hashes of inline <script type="application/ld+json">
 * blocks on static pages. Each hash is added to the static-route CSP's
 * script-src directive (apps/web/next.config.ts and apps/web/lib/csp/policy.ts).
 *
 * The browser computes SHA-256 of each inline script's text content and
 * allows execution only if the result matches one of these hashes.
 */
export const INLINE_SCRIPT_HASHES: readonly string[] = ${arrayLiteral};

export const __INLINE_HASHES_MANAGED_BY__ = 'scripts/build-inline-hashes.ts' as const;
`;

  await writeFile(OUTPUT_FILE, fileContent, 'utf8');
  console.log(`[build-inline-hashes] Wrote ${unique.length} hash(es) to ${OUTPUT_FILE}`);

  // Self-check: re-read and ensure parseable.
  const reread = await readFile(OUTPUT_FILE, 'utf8');
  if (!reread.includes('INLINE_SCRIPT_HASHES')) {
    throw new Error('build-inline-hashes: output file failed self-check');
  }
}

main().catch((err) => {
  console.error('[build-inline-hashes] FAILED:', err);
  process.exit(1);
});
