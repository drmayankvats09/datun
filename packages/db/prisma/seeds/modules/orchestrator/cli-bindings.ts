// ═══════════════════════════════════════════════════════════════
// CLI BINDINGS — turns flags into orchestrator config
// Usage: pnpm tsx packages/db/prisma/seeds/seed.ts --scenario=demo --dry-run
// ═══════════════════════════════════════════════════════════════

import type { Environment, ModuleCategory } from '../core/module.types';
import type { RunMainOrchestratorOptions } from './main-orchestrator';

export interface ParsedCliArgs {
  readonly scenario?: 'minimal' | 'demo' | 'load-test' | 'full';
  readonly env?: Environment;
  readonly masterSeed?: number;
  readonly includeCategories?: readonly ModuleCategory[];
  readonly excludeCategories?: readonly ModuleCategory[];
  readonly includeModuleNames?: readonly string[];
  readonly excludeModuleNames?: readonly string[];
  readonly resumeFromRunId?: string;
  readonly dryRun: boolean;
  readonly parallelExec: boolean;
  readonly stopOnError: boolean;
  readonly compensateOnFailure: boolean;
  readonly printManifestFirst: boolean;
}

export function parseCliArgs(argv: readonly string[]): ParsedCliArgs {
  const get = (key: string): string | undefined => {
    const arg = argv.find((a) => a.startsWith(`--${key}=`));
    return arg ? arg.split('=')[1] : undefined;
  };
  const flag = (key: string): boolean => argv.includes(`--${key}`);

  return {
    scenario: get('scenario') as ParsedCliArgs['scenario'],
    env: get('env') as Environment,
    masterSeed: get('seed') ? parseInt(get('seed')!, 10) : undefined,
    includeCategories: get('include-categories')?.split(',') as
      | readonly ModuleCategory[]
      | undefined,
    excludeCategories: get('exclude-categories')?.split(',') as
      | readonly ModuleCategory[]
      | undefined,
    includeModuleNames: get('include-modules')?.split(','),
    excludeModuleNames: get('exclude-modules')?.split(','),
    resumeFromRunId: get('resume'),
    dryRun: flag('dry-run'),
    parallelExec: flag('parallel'),
    stopOnError: !flag('continue-on-error'),
    compensateOnFailure: !flag('no-compensate'),
    printManifestFirst: flag('manifest'),
  };
}

export function argsToOrchestratorOptions(
  args: ParsedCliArgs,
  prisma: import('@prisma/client').PrismaClient,
): RunMainOrchestratorOptions {
  return {
    prisma,
    env: args.env ?? (process.env.NODE_ENV as Environment) ?? 'development',
    scenario: args.scenario ?? 'demo',
    masterSeed: args.masterSeed,
    includeCategories: args.includeCategories,
    excludeCategories: args.excludeCategories,
    includeModuleNames: args.includeModuleNames,
    excludeModuleNames: args.excludeModuleNames,
    resumeFromRunId: args.resumeFromRunId,
    dryRun: args.dryRun,
    parallelExec: args.parallelExec,
    stopOnError: args.stopOnError,
    compensateOnFailure: args.compensateOnFailure,
    printManifestFirst: args.printManifestFirst,
  };
}
