import { config } from '@repo/eslint-config/base';

/** @type {import("eslint").Linter.Config[]} */
export default [
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**', '*.config.mjs', '*.config.ts'],
  },
  ...config,
  {
    languageOptions: {
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
  },
  {
    rules: {
      // Server-side mein console allowed hai (Winston wraps it)
      'no-console': 'off',
      // Express middleware pattern: _req, _res, _next — underscore wale unused allowed
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
];
