// ═══════════════════════════════════════════════════════════════
// DR DRILL — quarterly rehearsal: simulate prod outage → restore → verify
// ═══════════════════════════════════════════════════════════════
import { drRestore } from './dr-restore';
import { PrismaClient } from '@prisma/client';

export interface DrDrillReport {
  dryRun: boolean;
  snapshotKey: string;
  rtoSeconds: number;
  rtoTargetSeconds: number;
  rtoMet: boolean;
  rowsVerified: number;
  passed: boolean;
}

export async function runDrDrill(opts: {
  dryRun: boolean;
  bucket: string;
  targetUrl: string;
  rtoTarget: number;
}): Promise<DrDrillReport> {
  if (opts.dryRun) {
    return {
      dryRun: true,
      snapshotKey: 'dry-run',
      rtoSeconds: 0,
      rtoTargetSeconds: opts.rtoTarget,
      rtoMet: true,
      rowsVerified: 0,
      passed: true,
    };
  }
  const restore = await drRestore({
    bucket: opts.bucket,
    prefix: 'snapshots/',
    targetDatabaseUrl: opts.targetUrl,
    truncateFirst: true,
  });
  const prisma = new PrismaClient({ datasources: { db: { url: opts.targetUrl } } });
  let rowsVerified = 0;
  try {
    rowsVerified = await prisma.clinic.count();
  } finally {
    await prisma.$disconnect();
  }
  const rtoMet = restore.rtoSeconds <= opts.rtoTarget;
  return {
    dryRun: false,
    snapshotKey: restore.snapshotKey,
    rtoSeconds: restore.rtoSeconds,
    rtoTargetSeconds: opts.rtoTarget,
    rtoMet,
    rowsVerified,
    passed: rtoMet && rowsVerified > 0,
  };
}
