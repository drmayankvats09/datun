import { describe, it, expect } from 'vitest';
import {
  topologicalSort,
  groupByDependencyLevel,
  validateRegistryKeyFlow,
  CircularDependencyError,
  UnknownDependencyError,
  DuplicateModuleError,
} from '../../../../prisma/seeds/modules/core/dependency-graph';
import { defineModule } from '../../../../prisma/seeds/modules/core';

describe('Dependency Graph', () => {
  it('topologically sorts simple chain', () => {
    const m1 = defineModule({
      name: 'a',
      description: '',
      category: 'reference',
      dependencies: [],
      run: async () => ({}) as never,
    });
    const m2 = defineModule({
      name: 'b',
      description: '',
      category: 'reference',
      dependencies: ['a'],
      run: async () => ({}) as never,
    });
    const m3 = defineModule({
      name: 'c',
      description: '',
      category: 'reference',
      dependencies: ['b'],
      run: async () => ({}) as never,
    });

    const sorted = topologicalSort([m3, m1, m2]);
    expect(sorted.map((m) => m.name)).toEqual(['a', 'b', 'c']);
  });

  it('detects circular dependencies', () => {
    const m1 = defineModule({
      name: 'a',
      description: '',
      category: 'reference',
      dependencies: ['b'],
      run: async () => ({}) as never,
    });
    const m2 = defineModule({
      name: 'b',
      description: '',
      category: 'reference',
      dependencies: ['a'],
      run: async () => ({}) as never,
    });

    expect(() => topologicalSort([m1, m2])).toThrow(CircularDependencyError);
  });

  it('detects unknown dependencies', () => {
    const m = defineModule({
      name: 'a',
      description: '',
      category: 'reference',
      dependencies: ['ghost'],
      run: async () => ({}) as never,
    });
    expect(() => topologicalSort([m])).toThrow(UnknownDependencyError);
  });

  it('detects duplicate module names', () => {
    const m1 = defineModule({
      name: 'dup',
      description: '',
      category: 'reference',
      dependencies: [],
      run: async () => ({}) as never,
    });
    const m2 = defineModule({
      name: 'dup',
      description: '',
      category: 'reference',
      dependencies: [],
      run: async () => ({}) as never,
    });
    expect(() => topologicalSort([m1, m2])).toThrow(DuplicateModuleError);
  });

  it('groups by dependency level for parallel execution', () => {
    const m1 = defineModule({
      name: 'a',
      description: '',
      category: 'reference',
      dependencies: [],
      run: async () => ({}) as never,
    });
    const m2 = defineModule({
      name: 'b',
      description: '',
      category: 'reference',
      dependencies: [],
      run: async () => ({}) as never,
    });
    const m3 = defineModule({
      name: 'c',
      description: '',
      category: 'reference',
      dependencies: ['a', 'b'],
      run: async () => ({}) as never,
    });

    const levels = groupByDependencyLevel([m1, m2, m3]);
    expect(levels).toHaveLength(2);
    expect(levels[0]!.map((m) => m.name).sort()).toEqual(['a', 'b']);
    expect(levels[1]!.map((m) => m.name)).toEqual(['c']);
  });

  it('validates registry key flow', () => {
    const m1 = defineModule({
      name: 'a',
      description: '',
      category: 'reference',
      dependencies: [],
      providesRegistryKeys: ['key1'],
      run: async () => ({}) as never,
    });
    const m2 = defineModule({
      name: 'b',
      description: '',
      category: 'reference',
      dependencies: ['a'],
      consumesRegistryKeys: ['key1'],
      run: async () => ({}) as never,
    });
    const m3 = defineModule({
      name: 'c',
      description: '',
      category: 'reference',
      dependencies: [],
      consumesRegistryKeys: ['missing-key'],
      run: async () => ({}) as never,
    });

    const valid = validateRegistryKeyFlow([m1, m2]);
    expect(valid.valid).toBe(true);

    const invalid = validateRegistryKeyFlow([m1, m2, m3]);
    expect(invalid.valid).toBe(false);
    expect(invalid.errors[0]).toContain('missing-key');
  });
});
