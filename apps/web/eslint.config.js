// ═══════════════════════════════════════════════════════════════
// ESLint flat config — apps/web
//
// COMPOSITION
//   1. Base: `@repo/eslint-config/next-js` — the shared monorepo
//      preset (TypeScript-ESLint, React, React Hooks, Next.js
//      core-web-vitals, Prettier compat).
//   2. Local plugin: `datun` — packages app-specific rules that do
//      not belong in the shared preset because they are tied to
//      this workspace's architecture (e.g. page-level loading
//      conventions, the @/components/feedback/skeletons system).
//
// TASK #51 ADDITION
//   The `datun/no-bare-loader` rule (error severity) bans
//   `<Loader2>` from any `app/**/page.tsx`, `layout.tsx`, or
//   `loading.tsx` file. See ./eslint-rules/no-bare-loader.js for
//   the full rule contract and allowlist.
//
// TASK #53 ADDITION
//   A `**/*.cjs` override gives CommonJS tool configs (currently
//   lighthouserc.cjs, which Lighthouse CI loads via `require()`)
//   Node/CommonJS language semantics and permits `require()` there.
//   These files are build tooling executed by Node — they never
//   ship to the browser, so the TypeScript/ESM import rules that
//   protect app code do not apply to them.
// ═══════════════════════════════════════════════════════════════

import { nextJsConfig } from '@repo/eslint-config/next-js';
import noBareLoader from './eslint-rules/no-bare-loader.js';

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...nextJsConfig,
  {
    // Local plugin namespaced under `datun/` so rule names never
    // collide with upstream ESLint plugins. Add new rules to this
    // plugin's `rules` object as the codebase grows.
    plugins: {
      datun: {
        rules: {
          'no-bare-loader': noBareLoader,
        },
      },
    },
    rules: {
      'datun/no-bare-loader': 'error',
    },
  },
  {
    // ── Task #53: CommonJS tool configs (lighthouserc.cjs) ──
    // `.cjs` is CommonJS by definition; Node provides require/module/
    // process/__dirname as runtime globals there. Declared inline
    // (rather than importing the `globals` package) to keep this
    // config dependency-free. `no-require-imports` is a TS/ESM app-code
    // rule — irrelevant to Node-executed tooling, so it is disabled
    // for exactly this file class and nowhere else.
    files: ['**/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        require: 'readonly',
        module: 'writable',
        process: 'readonly',
        __dirname: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    // ── Task #53.5 W2: LazyMotion strict-mode guard ──
    // motion-config-provider.tsx runs <LazyMotion strict> — rendering
    // any `motion.*` component now THROWS at runtime, and a static
    // `domAnimation`/`domMax` import drags the whole animation engine
    // (~146KB stat) back into the shared client chunk. This rule turns
    // both mistakes into lint-time errors so Prasanth (or future-us at
    // 2 AM) cannot ship them. The single legal feature import lives in
    // lib/motion/features.ts — exempted below — which LazyMotion pulls
    // via dynamic import only.
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'framer-motion',
              importNames: ['motion', 'domAnimation', 'domMax'],
              message:
                "Use `m` from 'framer-motion' — LazyMotion strict mode is ON, so `motion.*` throws at runtime. Feature bundles load ONLY via lib/motion/features.ts (Task #53.5 W2).",
            },
          ],
        },
      ],
    },
  },
  {
    // The one legal home of the static feature-bundle import.
    files: ['**/lib/motion/features.ts'],
    rules: { 'no-restricted-imports': 'off' },
  },
];
