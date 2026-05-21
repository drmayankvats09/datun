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
];
