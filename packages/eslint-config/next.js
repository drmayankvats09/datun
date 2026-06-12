import js from '@eslint/js';
import { globalIgnores } from 'eslint/config';
import eslintConfigPrettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';
import pluginReactHooks from 'eslint-plugin-react-hooks';
import pluginReact from 'eslint-plugin-react';
import globals from 'globals';
import pluginNext from '@next/eslint-plugin-next';
import { config as baseConfig } from './base.js';
import { a11yConfig } from './a11y.js';

/**
 * A custom ESLint configuration for libraries that use Next.js.
 *
 * TASK #54 ADDITION (WCAG 2.2 AA)
 *   `a11yConfig` (./a11y.js) is spread LAST so its jsx-a11y rules
 *   win any ordering disputes with the framework presets above.
 *   Every Next.js workspace that extends this config — apps/web
 *   today, apps/clinics on the day it is scaffolded (Tasks #76–99)
 *   — inherits the full WCAG 2.2 static-analysis layer with zero
 *   per-app wiring. Full rule rationale, the two documented
 *   exceptions, and the only-warn/--max-warnings-0 interlock live
 *   in ./a11y.js — read that header before touching severities.
 *
 * @type {import("eslint").Linter.Config[]}
 * */
export const nextJsConfig = [
  ...baseConfig,
  js.configs.recommended,
  eslintConfigPrettier,
  ...tseslint.configs.recommended,
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ]),
  {
    ...pluginReact.configs.flat.recommended,
    languageOptions: {
      ...pluginReact.configs.flat.recommended.languageOptions,
      globals: {
        ...globals.serviceworker,
      },
    },
  },
  {
    plugins: {
      '@next/next': pluginNext,
    },
    rules: {
      ...pluginNext.configs.recommended.rules,
      ...pluginNext.configs['core-web-vitals'].rules,
    },
  },
  {
    plugins: {
      'react-hooks': pluginReactHooks,
    },
    settings: { react: { version: 'detect' } },
    rules: {
      ...pluginReactHooks.configs.recommended.rules,
      // React scope no longer necessary with new JSX transform.
      'react/react-in-jsx-scope': 'off',
    },
  },
  // ── Task #54: WCAG 2.2 AA static-analysis layer (always last) ──
  ...a11yConfig,
];
