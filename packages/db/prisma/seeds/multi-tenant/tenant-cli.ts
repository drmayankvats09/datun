import { Command } from 'commander';
import { PrismaClient } from '@prisma/client';
import { runTenantOrchestrator } from './tenant-orchestrator';
import { validateTenantContext } from './tenant-context';
import { ALL_STRATEGIES } from '../strategies';

export function registerTenantCommand(program: Command): void {
  program
    .command('tenant')
    .description('Run seed scoped to a single tenant (clinic)')
    .requiredOption('--clinic-id <id>', 'tenant clinicId (slug)')
    .requiredOption('--clinic-slug <slug>', 'tenant clinicSlug')
    .requiredOption('--scenario <name>', 'minimal|demo|load-test|full')
    .option('--locale <locale>', 'default locale', 'hindi')
    .option('--timezone <tz>', 'timezone', 'Asia/Kolkata')
    .option('--city <city>', 'city name', 'Delhi')
    .option('--master-seed <n>', 'deterministic seed', (v) => Number(v), 42)
    .action(async (opts) => {
      const tenant = validateTenantContext({
        clinicId: opts.clinicId,
        clinicSlug: opts.clinicSlug,
        defaultLocale: opts.locale,
        timezone: opts.timezone,
        cityName: opts.city,
      });
      if (
        !(opts.scenario in ALL_STRATEGIES) &&
        !['minimal', 'demo', 'load-test', 'full'].includes(opts.scenario)
      ) {
        throw new Error(`Unknown scenario: ${opts.scenario}`);
      }
      const prisma = new PrismaClient();
      try {
        const result = await runTenantOrchestrator({
          prisma,
          tenant,
          scenario: opts.scenario,
          masterSeed: opts.masterSeed,
        });
        console.log(JSON.stringify(result, null, 2));
        process.exit(result.status === 'COMPLETED' ? 0 : 1);
      } finally {
        await prisma.$disconnect();
      }
    });
}
