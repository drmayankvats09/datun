import { describe, it, expect } from 'vitest';
import {
  ALL_MODULES,
  TOTAL_MODULE_COUNT,
  MODULE_COUNT_BY_CATEGORY,
} from '../../../../prisma/seeds/modules';
import {
  topologicalSort,
  validateRegistryKeyFlow,
  groupByDependencyLevel,
} from '../../../../prisma/seeds/modules/core/dependency-graph';
import { buildManifest } from '../../../../prisma/seeds/modules/core/manifest';

describe('Wave 4 v2 — End-to-End Module Topology', () => {
  it('all modules topologically sortable', () => {
    expect(() => topologicalSort(ALL_MODULES)).not.toThrow();
  });

  it('TOTAL_MODULE_COUNT >= 60', () => {
    expect(TOTAL_MODULE_COUNT).toBeGreaterThanOrEqual(60);
  });

  it('manifest builds successfully', () => {
    const manifest = buildManifest(ALL_MODULES);
    expect(manifest.totalModules).toBe(TOTAL_MODULE_COUNT);
    expect(manifest.parallelizableLevels).toBeGreaterThan(3);
  });

  it('registry key flow is valid', () => {
    const result = validateRegistryKeyFlow(ALL_MODULES);
    if (!result.valid) console.error('Registry key errors:', result.errors);
    expect(result.valid).toBe(true);
  });

  it('dependency levels properly stratified', () => {
    const levels = groupByDependencyLevel(ALL_MODULES);
    expect(levels.length).toBeGreaterThan(3);
    // Reference modules should be at level 0 (no dependencies)
    const level0 = levels[0]!;
    expect(level0.some((m) => m.category === 'reference')).toBe(true);
  });

  it('every module has unique name', () => {
    const names = ALL_MODULES.map((m) => m.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('every module has valid semver version', () => {
    for (const m of ALL_MODULES) {
      expect(m.version).toMatch(/^\d+\.\d+\.\d+$/);
    }
  });

  it('all categories represented', () => {
    expect(MODULE_COUNT_BY_CATEGORY.reference).toBeGreaterThan(0);
    expect(MODULE_COUNT_BY_CATEGORY.identity).toBeGreaterThan(0);
    expect(MODULE_COUNT_BY_CATEGORY.organization).toBeGreaterThan(0);
    expect(MODULE_COUNT_BY_CATEGORY.people).toBeGreaterThan(0);
    expect(MODULE_COUNT_BY_CATEGORY.clinical).toBeGreaterThan(0);
    expect(MODULE_COUNT_BY_CATEGORY.operational).toBeGreaterThan(0);
    expect(MODULE_COUNT_BY_CATEGORY.compliance).toBeGreaterThan(0);
  });
});
