#!/usr/bin/env node
import { runCli } from './program';
import { program } from 'commander';

runCli(process.argv.slice(2))
  .then((code) => process.exit(code))
  .catch((e) => {
    console.error(`Fatal: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  });

export * from './program';

import { registerWave6Commands } from './wave6-commands';
// after other registrations:
registerWave6Commands(program);
