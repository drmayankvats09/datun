import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';
import pluginReactHooks from 'eslint-plugin-react-hooks';
import pluginReact from 'eslint-plugin-react';
import globals from 'globals';
import { config as baseConfig } from './base.js';
import { a11yConfig } from './a11y.js';

/**
 * A custom ESLint configuration for libraries that use React.
 *
 * TASK #54 ADDITION (WCAG 2.2 AA)
 *   `a11yConfig` (./a11y.js) is spread LAST. packages/ui is where
 *   shared primitives are born — a labeling bug here multiplies
 *   into every surface that consumes the primitive, so the library
 *   workspace gets exactly the same WCAG 2.2 static-analysis layer
 *   as the apps. Rationale + documented exceptions: ./a11y.js.
 *
 * @type {import("eslint").Linter.Config[]} */
export const config = [
  ...baseConfig,
  js.configs.recommended,
  eslintConfigPrettier,
  ...tseslint.configs.recommended,
  pluginReact.configs.flat.recommended,
  {
    languageOptions: {
      ...pluginReact.configs.flat.recommended.languageOptions,
      globals: {
        ...globals.serviceworker,
        ...globals.browser,
      },
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
