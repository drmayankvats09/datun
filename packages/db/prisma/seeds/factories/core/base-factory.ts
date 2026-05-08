// ═══════════════════════════════════════════════════════════════
// BASE FACTORY — Reusable builder for all factories (B-2 v2)
//
// Combines:
//   - Fishery (build/create)              — public API surface
//   - Interface Forge (deterministic)     — reproducible randomness
//   - Stripe-style (override-first)       — DX (overrides come first)
//   - Faker.js v9 multi-locale            — en_IN → en → base
//
// All 47+ factories use this base. Single source of truth for:
//   - Faker instance creation
//   - Sequence + seed derivation
//   - Override deep-merge
//   - afterBuild / afterCreate hook orchestration
//
// FAANG-grade decisions (B-2 v2):
//   - TransientParams = `object` constraint (not Record<string, unknown>)
//     Reason: TS issue #15300 — interfaces don't satisfy index signatures.
//   - persist receives the BUILT output as-is — JSON narrowing happens
//     INSIDE each factory's persist function via toJsonInput helpers.
//   - createOne does NOT increment sequence again for afterCreate context
//     (was a bug in v1 — caused seed drift).
// ═══════════════════════════════════════════════════════════════

import { en, en_IN, base, Faker } from '@faker-js/faker';
import type { PrismaClient } from '@prisma/client';
import type {
  AfterBuildHook,
  AfterCreateHook,
  DeepPartial,
  FactoryBuildContext,
  FactoryDefinition,
  FactoryName,
  TransientParams,
} from './factory.types';
import { deriveFactorySeed, nextSequence, peekSequence } from './sequence';
import { prismaInput } from '.';

// ───────────────────────────────────────────────────────────────
// TYPES — Builder + persist function signatures
// ───────────────────────────────────────────────────────────────

/**
 * Factory builder function — receives context, returns output.
 * Pure function: no side effects, no DB access.
 */
export type BuilderFn<TOutput, TTransient extends TransientParams = TransientParams> = (
  context: FactoryBuildContext<TTransient>,
) => TOutput;

/**
 * Persistence function — receives built output, persists to DB, returns persisted.
 *
 * **Contract:**
 *   - Apply `toJsonInput` / `toNullableJsonInput` to JSON fields here.
 *   - Apply `prismaInput<T>(...)` cast at the `data:` boundary if the
 *     output type and Prisma input type differ structurally (common
 *     for relation IDs: factory uses `userId: string` but Prisma uses
 *     `user: { connect: { id } }`).
 *   - Return the persisted object (typically Prisma's create() return value).
 */
export type PersistFn<TOutput> = (output: TOutput, prisma: PrismaClient) => Promise<TOutput>;

// ───────────────────────────────────────────────────────────────
// FACTORY DEFINITION OPTIONS — DI bag
// ───────────────────────────────────────────────────────────────

/**
 * Options passed to `defineFactory` — what each factory file specifies.
 */
export interface DefineFactoryOptions<
  TOutput,
  TTransient extends TransientParams = TransientParams,
> {
  readonly name: FactoryName;
  readonly build: BuilderFn<TOutput, TTransient>;
  readonly persist: PersistFn<TOutput>;
  readonly defaultTransient?: TTransient;
  readonly afterBuild?: AfterBuildHook<TOutput>;
  readonly afterCreate?: AfterCreateHook<TOutput>;
}

// ───────────────────────────────────────────────────────────────
// DEEP MERGE — Used for override application
// ───────────────────────────────────────────────────────────────

/**
 * Deep merge — recursively merges `source` into `target`.
 *
 * Rules:
 *   - Arrays from source REPLACE target arrays (no concat).
 *   - Objects merge recursively.
 *   - Primitives + Dates from source REPLACE target.
 *   - `undefined` in source is IGNORED (target value preserved).
 *
 * Pattern: Lodash `merge` semantics with strict undefined handling.
 */
function deepMerge<T>(target: T, source: DeepPartial<T> | undefined): T {
  if (!source) return target;
  if (Array.isArray(source)) return source as unknown as T;
  if (typeof target !== 'object' || target === null) return (source as unknown as T) ?? target;
  if (target instanceof Date) return (source as unknown as T) ?? target;

  const result = { ...target } as unknown as Record<string, unknown>;
  const src = source as Record<string, unknown>;

  for (const key of Object.keys(src)) {
    const srcVal = src[key];
    const tgtVal = result[key];

    if (srcVal === undefined) continue; // preserve target

    if (
      srcVal !== null &&
      typeof srcVal === 'object' &&
      !Array.isArray(srcVal) &&
      !(srcVal instanceof Date) &&
      tgtVal !== null &&
      typeof tgtVal === 'object' &&
      !Array.isArray(tgtVal) &&
      !(tgtVal instanceof Date)
    ) {
      result[key] = deepMerge(tgtVal, srcVal as DeepPartial<unknown>);
    } else {
      result[key] = srcVal;
    }
  }

  return result as T;
}

// ───────────────────────────────────────────────────────────────
// FAKER INSTANCE CREATION — Deterministic, scoped per call
// ───────────────────────────────────────────────────────────────

/**
 * Create a scoped Faker instance with deterministic seed.
 *
 * Locale chain: en_IN → en → base
 *   - en_IN: Indian-context names, addresses, phone numbers
 *   - en   : Falls back to general English data when en_IN gaps
 *   - base : Faker's universal fallbacks (lorem ipsum, etc.)
 *
 * Source: https://fakerjs.dev/guide/localization.html
 */
function createFaker(seed: number): Faker {
  const f = new Faker({ locale: [en_IN, en, base] });
  f.seed(seed);
  return f;
}

// ───────────────────────────────────────────────────────────────
// PUBLIC API — defineFactory()
// ───────────────────────────────────────────────────────────────

/**
 * Define a factory.
 *
 * Returns a `FactoryDefinition` with build/buildList/create/createList methods.
 * Each call to build() or create() advances the per-factory sequence counter
 * and creates a new deterministic Faker instance.
 *
 * @example
 *   export const userFactory = defineFactory<User, UserTransient>({
 *     name: KNOWN_FACTORY_NAMES.USER,
 *     defaultTransient: { password: 'Password123!' },
 *     build: ({ sequence, faker, transient }) => ({
 *       id: faker.string.uuid(),
 *       email: `user-${sequence}@example.com`,
 *       passwordHash: bcrypt.hashSync(transient.password!, 10),
 *       // ... rest
 *     }),
 *     persist: async (user, prisma) => {
 *       const created = await prisma.user.create({
 *         data: prismaInput<Prisma.UserUncheckedCreateInput>(user),
 *       });
 *       return created as unknown as typeof user;
 *     },
 *   });
 */
export function defineFactory<TOutput, TTransient extends TransientParams = TransientParams>(
  options: DefineFactoryOptions<TOutput, TTransient>,
): FactoryDefinition<TOutput, TTransient> {
  const {
    name,
    build: buildFn,
    persist,
    defaultTransient = {} as unknown as TTransient,
    afterBuild,
    afterCreate,
  } = options;

  /** Build a single object (no DB). */
  function buildOne(overrides?: DeepPartial<TOutput>, transient?: Partial<TTransient>): TOutput {
    const sequence = nextSequence(name);
    const seed = deriveFactorySeed(name, sequence);
    const faker = createFaker(seed);

    const context: FactoryBuildContext<TTransient> = {
      sequence,
      faker,
      seed,
      transient: { ...defaultTransient, ...transient } as unknown as TTransient,
    };

    let output = buildFn(context);

    if (overrides) {
      output = deepMerge(output, overrides);
    }

    if (afterBuild) {
      output = afterBuild(output, context);
    }

    return output;
  }

  /** Build N objects. */
  function buildList(
    count: number,
    overrides?: DeepPartial<TOutput>,
    transient?: Partial<TTransient>,
  ): readonly TOutput[] {
    return Array.from({ length: count }, () => buildOne(overrides, transient));
  }

  /** Build + persist a single object. */
  async function createOne(
    prisma: PrismaClient,
    overrides?: DeepPartial<TOutput>,
    transient?: Partial<TTransient>,
  ): Promise<TOutput> {
    const built = buildOne(overrides, transient);
    const persisted = await persist(built, prisma);

    if (afterCreate) {
      // Reuse the same sequence (peek, not next) — avoid drift.
      const sequence = peekSequence(name);
      const seed = deriveFactorySeed(name, sequence);
      const faker = createFaker(seed);

      await afterCreate(
        persisted,
        {
          sequence,
          faker,
          seed,
          transient: { ...defaultTransient, ...transient } as unknown as TTransient,
        },
        prisma,
      );
    }

    return persisted;
  }

  /** Build + persist N objects. */
  async function createList(
    prisma: PrismaClient,
    count: number,
    overrides?: DeepPartial<TOutput>,
    transient?: Partial<TTransient>,
  ): Promise<readonly TOutput[]> {
    const results: TOutput[] = [];
    for (let i = 0; i < count; i++) {
      results.push(await createOne(prisma, overrides, transient));
    }
    return results;
  }

  return {
    name,
    build: buildOne,
    buildList,
    create: createOne,
    createList,
  };
}
