// ═══════════════════════════════════════════════════════════════
// CORE BARREL — Foundation exports for all factories (B-2 v2)
// ═══════════════════════════════════════════════════════════════

// Type contracts
export type {
  AfterBuildHook,
  AfterCreateHook,
  DeepPartial,
  FactoryBuildContext,
  FactoryDefinition,
  FactoryName,
  FakerInstance,
  KnownFactoryName,
  SequenceFn,
  TransientParams,
} from './factory.types';

export { KNOWN_FACTORY_NAMES } from './factory.types';

// Sequence + determinism
export {
  deriveFactorySeed,
  nextSequence,
  peekSequence,
  resetSequences,
  sequenceManager,
  snapshotSequences,
} from './sequence';

// Base factory builder
export { defineFactory } from './base-factory';
export type { BuilderFn, DefineFactoryOptions, PersistFn } from './base-factory';

// JSON narrowing helpers
export { narrowAllJsonFields, prismaInput, toJsonInput, toNullableJsonInput } from './json-helpers';
export type { JsonInput, NullableJsonInput } from './json-helpers';

// Error codes + structured errors
export { SEED_ERROR_CODES, SeedError, seedError } from './error-codes';
export type { SeedErrorCode, SeedErrorContext } from './error-codes';
