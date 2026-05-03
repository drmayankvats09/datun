/**
 * Schema Fingerprint — deterministic SHA-256 hash of the Prisma schema state.
 *
 * Why: The fingerprint is the single source of truth for "did the schema
 * actually change?" — used by drift detection, migration audit, and the
 * /internal/migration/status endpoint.
 *
 * Two consecutive fingerprints differing without an intervening migration
 * apply means production was edited out-of-band → drift alert.
 *
 * Normalization rules (so cosmetic edits do not change the fingerprint):
 *   1. Comments stripped (// and block comments)
 *   2. Trailing whitespace removed per line
 *   3. Empty lines collapsed
 *   4. CRLF normalized to LF
 *
 * Path resolution: __dirname-relative (Node.js CommonJS global). The schema
 * file location is fixed relative to this source file, so it resolves
 * correctly regardless of process working directory (vitest, Railway build,
 * CI shadow DB, local dev — all work).
 *
 * @see docs/adr/0002-prisma-migrations-baseline.md
 */

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Default schema path resolved from this file's location.
 *
 * Layout: packages/db/src/lib/schema-fingerprint.ts → up 2 levels → packages/db/
 *         → then prisma/schema.prisma
 */
export const SCHEMA_PATH = path.resolve(__dirname, '../../prisma/schema.prisma');

/**
 * Strips comments, normalizes whitespace, and collapses empty lines so that
 * two functionally identical schemas always produce the same hash.
 */
export function normalizeSchema(raw: string): string {
  return (
    raw
      // Normalize line endings
      .replace(/\r\n/g, '\n')
      // Strip block comments
      .replace(/\/\*[\s\S]*?\*\//g, '')
      // Strip line comments
      .split('\n')
      .map((line) => {
        const idx = line.indexOf('//');
        return (idx >= 0 ? line.slice(0, idx) : line).trimEnd();
      })
      .filter((line) => line.length > 0)
      .join('\n')
  );
}

/**
 * Compute the SHA-256 hex digest of the normalized schema content.
 */
export function fingerprint(rawSchema: string): string {
  const normalized = normalizeSchema(rawSchema);
  return createHash('sha256').update(normalized, 'utf8').digest('hex');
}

/**
 * Read the current schema file from disk and return its fingerprint.
 *
 * @param schemaPath  Override the default schema path. Accepts absolute
 *                    OR relative paths. Relative paths are resolved
 *                    relative to this file's location (NOT cwd) so the
 *                    function behaves identically across runtimes.
 * @throws  If the schema file does not exist at the resolved path.
 */
export async function getCurrentSchemaFingerprint(
  schemaPath: string = SCHEMA_PATH,
): Promise<string> {
  const absolute = path.isAbsolute(schemaPath) ? schemaPath : path.resolve(__dirname, schemaPath);
  const raw = await readFile(absolute, 'utf8');
  return fingerprint(raw);
}

/**
 * Compare two fingerprints — returns true if identical.
 * Constant-time comparison prevents timing attacks (defense-in-depth even
 * though the fingerprint is not a secret).
 */
export function fingerprintsMatch(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
