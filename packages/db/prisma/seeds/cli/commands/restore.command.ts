import type { Command } from 'commander';
import { PrismaClient } from '@prisma/client';
import { SnapshotEngineV2 } from '../../modules/runtime/snapshot-engine';

export function registerRestoreCommand(program: Command): void {
  program
    .command('restore')
    .description('Restore a snapshot')
    .requiredOption('-n, --name <name>', 'Snapshot name')
    .option('--truncate-first', 'Truncate target tables before restore', false)
    .action(async (opts) => {
      const prisma = new PrismaClient();
      try {
        const engine = new SnapshotEngineV2(prisma);
        const meta = await engine.restore(opts.name, { truncateFirst: opts.truncateFirst });
        console.log(
          `✓ Restored ${meta.snapshotName} (${Object.keys(meta.recordCounts).length} tables)`,
        );
      } finally {
        await prisma.$disconnect();
      }
    });
}
