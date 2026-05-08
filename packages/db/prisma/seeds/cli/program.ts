// ═══════════════════════════════════════════════════════════════
// CLI PROGRAM — Commander.js root with 8 subcommands
// Source: pkgpulse.com — Commander chosen (~500M dl, zero deps, Git-style)
// Usage: pnpm datun-seed <subcommand> [options]
// ═══════════════════════════════════════════════════════════════

import { Command } from 'commander';
import { registerSeedCommand } from './commands/seed.command';
import { registerSnapshotCommand } from './commands/snapshot.command';
import { registerRestoreCommand } from './commands/restore.command';
import { registerExportCommand } from './commands/export.command';
import { registerValidateCommand } from './commands/validate.command';
import { registerManifestCommand } from './commands/manifest.command';
import { registerAnonymizeCommand } from './commands/anonymize.command';
import { registerBenchCommand } from './commands/bench.command';

export function buildProgram(): Command {
  const program = new Command()
    .name('datun-seed')
    .description(
      'Datun seed CLI — production-grade DB seeding, anonymization, exports, and load testing',
    )
    .version('1.0.0')
    .option('--json', 'Output structured JSON to stdout (logs to stderr)', false)
    .option('--quiet', 'Suppress non-error output', false)
    .option('--verbose', 'Increase log verbosity', false);

  program.exitOverride();
  program.configureOutput({
    writeErr: (str: string) => process.stderr.write(str),
  });

  registerSeedCommand(program);
  registerSnapshotCommand(program);
  registerRestoreCommand(program);
  registerExportCommand(program);
  registerValidateCommand(program);
  registerManifestCommand(program);
  registerAnonymizeCommand(program);
  registerBenchCommand(program);

  return program;
}

export async function runCli(argv: readonly string[]): Promise<number> {
  const program = buildProgram();
  try {
    await program.parseAsync(argv as string[]);
    return 0;
  } catch (e) {
    if (e instanceof Error && 'code' in e) {
      const code = (e as Error & { code: string }).code;
      if (code === 'commander.helpDisplayed' || code === 'commander.version') return 0;
    }
    process.stderr.write(`✗ ${e instanceof Error ? e.message : String(e)}\n`);
    return 1;
  }
}
