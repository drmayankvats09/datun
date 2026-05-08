import type { Command } from 'commander';
import { registerEvalCommand } from '../ai-training/eval';
import { registerSynthesisCommand } from '../ai-training/synthesis';

export function registerWave7Commands(program: Command): void {
  registerEvalCommand(program);
  registerSynthesisCommand(program);
}
