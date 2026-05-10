// ═══════════════════════════════════════════════════════════════
// DEPENDENCY GRAPH v2 — Topological + parallel-level grouping
// Algorithm: Kahn's BFS with stable ordering + cycle detection
// Source: Wikipedia + Apache Airflow DAG model
// ═══════════════════════════════════════════════════════════════

import type { ModuleName, SeedModule } from './module.types';

export class CircularDependencyError extends Error {
  constructor(public readonly cycle: readonly ModuleName[]) {
    super(`Circular dependency detected: ${cycle.join(' → ')}`);
    this.name = 'CircularDependencyError';
  }
}

export class UnknownDependencyError extends Error {
  constructor(
    public readonly moduleName: ModuleName,
    public readonly missingDep: ModuleName,
  ) {
    super(`Module "${moduleName}" depends on unknown module "${missingDep}"`);
    this.name = 'UnknownDependencyError';
  }
}

export class DuplicateModuleError extends Error {
  constructor(public readonly moduleName: ModuleName) {
    super(`Duplicate module name detected: ${moduleName}`);
    this.name = 'DuplicateModuleError';
  }
}

/** Topological sort using Kahn's algorithm */
export function topologicalSort(modules: readonly SeedModule[]): readonly SeedModule[] {
  const moduleByName = new Map<ModuleName, SeedModule>();
  for (const m of modules) {
    if (moduleByName.has(m.name)) throw new DuplicateModuleError(m.name);
    moduleByName.set(m.name, m);
  }

  for (const m of modules) {
    for (const dep of m.dependencies) {
      if (!moduleByName.has(dep)) throw new UnknownDependencyError(m.name, dep);
    }
  }

  const inDegree = new Map<ModuleName, number>();
  for (const m of modules) inDegree.set(m.name, m.dependencies.length);

  const dependents = new Map<ModuleName, ModuleName[]>();
  for (const m of modules) dependents.set(m.name, []);
  for (const m of modules) {
    for (const dep of m.dependencies) {
      dependents.get(dep)!.push(m.name);
    }
  }

  const queue: ModuleName[] = [];
  for (const [name, deg] of inDegree) {
    if (deg === 0) queue.push(name);
  }
  queue.sort();

  const sorted: SeedModule[] = [];
  while (queue.length > 0) {
    const next = queue.shift()!;
    sorted.push(moduleByName.get(next)!);
    const consumers = dependents.get(next) ?? [];
    const ready: ModuleName[] = [];
    for (const consumer of consumers) {
      const newDeg = (inDegree.get(consumer) ?? 0) - 1;
      inDegree.set(consumer, newDeg);
      if (newDeg === 0) ready.push(consumer);
    }
    ready.sort();
    queue.push(...ready);
  }

  if (sorted.length !== modules.length) {
    const remaining = modules.filter((m) => !sorted.find((s) => s.name === m.name));
    throw new CircularDependencyError(remaining.map((m) => m.name));
  }

  return sorted;
}

/** Group modules by dependency level — modules at same level can run in parallel */
export function groupByDependencyLevel(
  modules: readonly SeedModule[],
): readonly (readonly SeedModule[])[] {
  const sorted = topologicalSort(modules);
  const levels = new Map<ModuleName, number>();

  for (const m of sorted) {
    const maxDepLevel =
      m.dependencies.length === 0 ? -1 : Math.max(...m.dependencies.map((d) => levels.get(d) ?? 0));
    levels.set(m.name, maxDepLevel + 1);
  }

  const grouped = new Map<number, SeedModule[]>();
  for (const m of sorted) {
    const lvl = levels.get(m.name)!;
    const arr = grouped.get(lvl) ?? [];
    arr.push(m);
    grouped.set(lvl, arr);
  }

  return Array.from(grouped.entries())
    .sort(([a], [b]) => a - b)
    .map(([, ms]) => ms);
}

/** Validate registry key flow — every consumed key must be provided by an upstream module */
export function validateRegistryKeyFlow(modules: readonly SeedModule[]): {
  valid: boolean;
  errors: readonly string[];
} {
  const sorted = topologicalSort(modules);
  const providedKeys = new Set<string>();
  const errors: string[] = [];

  for (const m of sorted) {
    for (const consumed of m.consumesRegistryKeys) {
      if (!providedKeys.has(consumed)) {
        errors.push(`Module "${m.name}" consumes "${consumed}" but no upstream module provides it`);
      }
    }
    for (const provided of m.providesRegistryKeys) {
      providedKeys.add(provided);
    }
  }

  return { valid: errors.length === 0, errors };
}
