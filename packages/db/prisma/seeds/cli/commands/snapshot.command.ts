import type { Command } from 'commander';
import { PrismaClient } from '@prisma/client';
import { SnapshotEngineV2 } from '../../modules/runtime/snapshot-engine';

export function registerSnapshotCommand(program: Command): void {
  program
    .command('snapshot')
    .description('Create a logical snapshot of seeded tables')
    .requiredOption('-n, --name <name>', 'Snapshot name')
    .option(
      '-t, --tables <csv>',
      'Comma-separated tables',
      'medicationSalt,clinic,doctor,patient,consultation,prescription',
    )
    .action(async (opts) => {
      const prisma = new PrismaClient();
      try {
        const engine = new SnapshotEngineV2(prisma);
        const tables = (opts.tables as string)
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean);
        const meta = await engine.save(opts.name, tables);
        console.log(`✓ Snapshot saved: ${meta.snapshotId} (${meta.sizeBytes} bytes)`);
        if ((program.opts() as { json?: boolean }).json) console.log(JSON.stringify(meta, null, 2));
      } finally {
        await prisma.$disconnect();
      }
    });

  program
    .command('list-snapshots')
    .description('List available snapshots')
    .action(async () => {
      const prisma = new PrismaClient();
      try {
        const engine = new SnapshotEngineV2(prisma);
        const list = await engine.list();
        for (const s of list) {
          console.log(
            `${s.snapshotName.padEnd(30)} ${s.snapshotId} ${s.recordCounts ? Object.keys(s.recordCounts).length : 0} tables ${s.sizeBytes} bytes`,
          );
        }
      } finally {
        await prisma.$disconnect();
      }
    });
}
