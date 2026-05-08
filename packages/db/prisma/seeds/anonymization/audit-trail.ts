// ═══════════════════════════════════════════════════════════════
// AUDIT TRAIL — append-only log of every anonymization action
// DPDP §10 + HIPAA §164.312(b) compliance
// ═══════════════════════════════════════════════════════════════

import { promises as fs } from 'node:fs';
import path from 'node:path';

export interface AuditEntry {
  readonly timestamp: string;
  readonly modelName: string;
  readonly recordId: string;
  readonly fieldsMasked: readonly string[];
  readonly fieldsKept: readonly string[];
  readonly fieldsNullified: readonly string[];
  readonly undetectedPiiHighConfidence: readonly string[];
  readonly complianceProfile: string;
  readonly operatorId?: string;
  readonly purpose?: string;
}

const AUDIT_DIR = process.env.SEED_AUDIT_DIR ?? './seeds/audit-logs';
const AUDIT_FILE = path.join(
  AUDIT_DIR,
  `anonymization-${new Date().toISOString().slice(0, 10)}.jsonl`,
);

export async function writeAuditEntry(entry: AuditEntry): Promise<void> {
  await fs.mkdir(AUDIT_DIR, { recursive: true });
  await fs.appendFile(AUDIT_FILE, `${JSON.stringify(entry)}\n`);
}

export async function readAuditEntriesForDate(date: string): Promise<readonly AuditEntry[]> {
  const filepath = path.join(AUDIT_DIR, `anonymization-${date}.jsonl`);
  try {
    const content = await fs.readFile(filepath, 'utf-8');
    return content
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line) as AuditEntry);
  } catch {
    return [];
  }
}
