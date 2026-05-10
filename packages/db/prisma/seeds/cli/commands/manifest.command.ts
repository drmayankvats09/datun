import type { Command } from 'commander';
import { ALL_MODULES, MODULE_COUNT_BY_CATEGORY } from '../../modules';
import { printManifest, buildManifest } from '../../modules/core/manifest';

export function registerManifestCommand(program: Command): void {
  program
    .command('manifest')
    .description('Print the module DAG manifest')
    .action(() => {
      if ((program.opts() as { json?: boolean }).json) {
        const m = buildManifest(ALL_MODULES);
        console.log(JSON.stringify(m, null, 2));
      } else {
        console.log(printManifest(ALL_MODULES));
        console.log('');
        console.log(`By category:`);
        for (const [cat, n] of Object.entries(MODULE_COUNT_BY_CATEGORY).sort()) {
          console.log(`  ${cat.padEnd(15)} ${n}`);
        }
      }
    });
}
