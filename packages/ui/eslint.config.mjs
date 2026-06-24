import { config } from '@repo/eslint-config/react-internal';

/**
 * @repo/ui is the Datun design-system primitive layer. Its widgets implement
 * WAI-ARIA keyboard/focus behaviour in JS handlers (roving focus, type-ahead,
 * Esc-to-close, light-dismiss) and use the canonical role-on-semantic-element
 * patterns (ul[role="listbox"] / li[role="option"], menu items, overlay scrims).
 * The static jsx-a11y rules below can't see the JS-level keyboard wiring and flag
 * these correct patterns as false positives. Functional a11y for the library is
 * validated by the design system's axe-core + per-component checklist process
 * (Design System Part 13). Accessible-NAME rules stay ON (control/label/role-
 * required-props are enforced and fixed in code).
 *
 * @type {import("eslint").Linter.Config[]}
 */
export default [
  ...config,
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'jsx-a11y/no-static-element-interactions': 'off',
      'jsx-a11y/no-noninteractive-element-interactions': 'off',
      'jsx-a11y/click-events-have-key-events': 'off',
      'jsx-a11y/no-noninteractive-element-to-interactive-role': 'off',
      // tabpanel/roving-focus need tabIndex on role-bearing elements (WAI-ARIA tabs).
      'jsx-a11y/no-noninteractive-tabindex': 'off',
      // Allow intentional `_`-prefixed discards and rest-sibling omissions
      // (e.g. `const { interactive: _i, ...rest } = props`). Real unused vars
      // still surface (they remain warnings → fail under --max-warnings 0).
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { ignoreRestSiblings: true, argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
];
