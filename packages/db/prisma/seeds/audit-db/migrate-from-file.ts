import { PrismaClient } from '@prisma/client';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { AuditWriter } from './audit-writer';

interface FileRow {
  timestamp: string;
  modelName: string;
  recordId: string;
  fieldsMasked: readonly string[];
  fieldsKept: readonly string[];
  fieldsNullified: readonly string[];
  complianceProfile: string;
}

export async function migrateFileAuditToDb(
  auditDir = './seeds/audit-logs',
): Promise<{ migrated: number; skipped: number }> {
  const prisma = new PrismaClient();
  const writer = new AuditWriter(prisma);
  let migrated = 0,
    skipped = 0;
  try {
    const files = await readdir(auditDir).catch(() => [] as string[]);
    for (const file of files.filter((f) => f.endsWith('.jsonl'))) {
      const content = await readFile(path.join(auditDir, file), 'utf8');
      for (const line of content.split('\n').filter(Boolean)) {
        const lineHash = createHash('sha256').update(line).digest('hex').slice(0, 32);
        const exists = await prisma.seedAuditLog.findFirst({
          where: { rowHash: { startsWith: lineHash } },
        });
        if (exists) {
          skipped++;
          continue;
        }
        const row = JSON.parse(line) as FileRow;
        await writer.write({
          runId: `migrated-${file.replace('.jsonl', '')}`,
          module: `anonymization.${row.modelName}`,
          action: 'completed',
          payload: { ...row, sourceFile: file, lineHash },
        });
        migrated++;
      }
    }
  } finally {
    await prisma.$disconnect();
  }
  return { migrated, skipped };
}

if (require.main === module) migrateFileAuditToDb().then(console.log);
