// ═══════════════════════════════════════════════════════════════
// MANIFEST — Print module DAG + execution plan
// ═══════════════════════════════════════════════════════════════

import type { SeedModule } from './module.types';
import {
  groupByDependencyLevel,
  topologicalSort,
  validateRegistryKeyFlow,
} from './dependency-graph';

export interface ModuleManifest {
  readonly totalModules: number;
  readonly executionOrder: readonly {
    name: string;
    level: number;
    deps: readonly string[];
    provides: readonly string[];
    consumes: readonly string[];
  }[];
  readonly parallelizableLevels: number;
  readonly byCategory: Record<string, number>;
  readonly registryKeyFlow: { valid: boolean; errors: readonly string[] };
}

export function buildManifest(modules: readonly SeedModule[]): ModuleManifest {
  const sorted = topologicalSort(modules);
  const levels = groupByDependencyLevel(modules);
  const levelByName = new Map<string, number>();
  levels.forEach((lvl, idx) => lvl.forEach((m) => levelByName.set(m.name, idx)));

  const byCategory: Record<string, number> = {};
  for (const m of modules) byCategory[m.category] = (byCategory[m.category] ?? 0) + 1;

  return {
    totalModules: modules.length,
    executionOrder: sorted.map((m) => ({
      name: m.name,
      level: levelByName.get(m.name) ?? 0,
      deps: m.dependencies,
      provides: m.providesRegistryKeys,
      consumes: m.consumesRegistryKeys,
    })),
    parallelizableLevels: levels.length,
    byCategory,
    registryKeyFlow: validateRegistryKeyFlow(modules),
  };
}

export function printManifest(modules: readonly SeedModule[]): string {
  const m = buildManifest(modules);
  const lines = [
    'Datun Seed Module Manifest v2',
    '═══════════════════════════════════════════════════════════════',
    `Total modules: ${m.totalModules}`,
    `Parallelizable levels: ${m.parallelizableLevels}`,
    '',
    'By category:',
    ...Object.entries(m.byCategory)
      .sort()
      .map(([c, n]) => `  ${c.padEnd(15)} ${n}`),
    '',
    `Registry key flow: ${m.registryKeyFlow.valid ? '✓ VALID' : '✗ INVALID'}`,
    ...m.registryKeyFlow.errors.map((e) => `  ✗ ${e}`),
    '',
    'Execution order:',
  ];
  for (const item of m.executionOrder) {
    lines.push(
      `  L${item.level} ${item.name}${item.deps.length > 0 ? ` ← [${item.deps.join(', ')}]` : ''}`,
    );
  }
  return lines.join('\n');
}
