import type { Command } from 'commander';
import { PrismaClient } from '@prisma/client';
import { ALL_MODULES } from '../../modules';
import { validateRegistryKeyFlow, topologicalSort } from '../../modules/core/dependency-graph';
import { scanPrismaSchema } from '../../anonymization/schema-aware-masker';
import { compareToGolden } from '../../e2e-harness/golden-fixtures';

export function registerValidateCommand(program: Command): void {
  const v = program.command('validate').description('Run validation checks');

  v.command('dag')
    .description('Validate module DAG and registry-key flow')
    .action(() => {
      try {
        topologicalSort(ALL_MODULES);
        const flow = validateRegistryKeyFlow(ALL_MODULES);
        if (flow.valid) {
          console.log(`✓ DAG valid (${ALL_MODULES.length} modules)`);
        } else {
          console.error('✗ Registry-key flow violations:');
          for (const e of flow.errors) console.error(`  - ${e}`);
          process.exit(1);
        }
      } catch (e) {
        console.error(`✗ DAG invalid: ${e instanceof Error ? e.message : String(e)}`);
        process.exit(1);
      }
    });

  v.command('schema-pii')
    .description('Auto-scan Prisma schema for unmapped PII fields')
    .action(async () => {
      const prisma = new PrismaClient();
      try {
        const scan = await scanPrismaSchema(prisma);
        console.log(`Scanned ${scan.modelsScanned} models, ${scan.totalFields} fields`);
        console.log(`PII fields detected: ${scan.piiFieldsDetected}`);
        console.log(`Suggested rules: ${scan.suggestedRules.length}`);
        if (scan.unmappedHighConfidencePii.length > 0) {
          console.warn('⚠ Unmapped high-confidence PII:');
          for (const u of scan.unmappedHighConfidencePii) console.warn(`  - ${u.model}.${u.field}`);
        }
      } finally {
        await prisma.$disconnect();
      }
    });

  v.command('golden <name>')
    .description('Compare current DB to a golden fixture')
    .action(async (name: string) => {
      const prisma = new PrismaClient();
      try {
        const cmp = await compareToGolden(prisma, name);
        if (cmp.matches) {
          console.log(`✓ Golden fixture "${name}" matches`);
        } else {
          console.error(`✗ Golden mismatch:`);
          for (const d of cmp.diffs)
            console.error(`  ${d.table}: expected=${d.expected}, actual=${d.actual}`);
          process.exit(1);
        }
      } finally {
        await prisma.$disconnect();
      }
    });
}
