import type { Command } from 'commander';
import { PrismaClient } from '@prisma/client';
import {
  AnonymizationEngine,
  type ComplianceProfile,
  validateKAnonymity,
} from '../../anonymization';

export function registerAnonymizeCommand(program: Command): void {
  program
    .command('anonymize')
    .description('Anonymize records in-place (DESTRUCTIVE — use on staging)')
    .requiredOption('-t, --table <name>', 'Table name')
    .requiredOption('--compliance <profile>', 'DPDP|HIPAA|GDPR|DPDP_HIPAA', 'DPDP')
    .option('--dry-run', 'Show what would be masked without applying', false)
    .option('--validate-k <k>', 'Run k-anonymity validation', '5')
    .action(async (opts) => {
      const prisma = new PrismaClient();
      try {
        const model = (
          prisma as unknown as Record<
            string,
            {
              findMany: () => Promise<Record<string, unknown>[]>;
              update: (a: object) => Promise<unknown>;
            }
          >
        )[opts.table as string];
        if (!model) {
          console.error(`Unknown table: ${opts.table}`);
          process.exit(1);
        }

        const records = await model.findMany();
        const engine = new AnonymizationEngine(opts.compliance as ComplianceProfile);
        const result = await engine.anonymizeRecords(opts.table, records, {
          writeAuditLog: !opts.dryRun,
          validateKAnonymity: true,
        });

        console.log(`Records processed: ${result.recordsProcessed}`);
        console.log(
          `Fields masked: ${result.fieldsMasked}, kept: ${result.fieldsKept}, nullified: ${result.fieldsNullified}`,
        );
        if (result.kAnonymityReport && !result.kAnonymityReport.valid) {
          console.warn(`⚠ k-anonymity violations: ${result.kAnonymityReport.violations.length}`);
        }

        if (opts.dryRun) {
          console.log('Dry-run — no changes applied');
          return;
        }

        for (const rec of result.records) {
          const id = (rec as Record<string, unknown>).id;
          if (id) await model.update({ where: { id }, data: rec });
        }
        console.log(`✓ Anonymization applied to ${opts.table}`);
      } finally {
        await prisma.$disconnect();
      }
    });
}
