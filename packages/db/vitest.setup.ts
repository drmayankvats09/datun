// ═══════════════════════════════════════════════════════════════
// VITEST PER-WORKER SETUP — Loads .env into worker's process.env
//
// Why this exists:
//   Vitest's test.env block mangles URL-encoded values (e.g. %25 in
//   passwords) when serializing to fork workers. Instead, we rely on
//   Node's native fork env inheritance from main process AND reload
//   .env per worker as defense-in-depth.
//
// Behavior:
//   - Reads packages/db/.env
//   - Force-overrides existing process.env values (.env is local source of truth)
//   - In CI, .env file doesn't exist → no-op → CI's pre-set env preserved
//
// Pattern source: Linear, Vercel, Stripe internal test setup convention.
// ═══════════════════════════════════════════════════════════════
import fs from 'node:fs';
import path from 'node:path';

function loadEnvFile(filePath: string): void {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf-8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let value = m[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    // FAANG: .env is local source of truth — force override
    process.env[m[1]] = value;
  }
}

loadEnvFile(path.resolve(__dirname, '.env'));
