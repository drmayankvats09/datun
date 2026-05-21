// ═══════════════════════════════════════════════════════════════
// no-bare-loader — custom ESLint rule (Task #51, refined)
//
// PURPOSE
// ───────
// Disallow `<Loader2>` (and any future bare-spinner identifiers)
// at the route / page / layout level. Every page-level loading
// state must use a layout-faithful skeleton instead.
//
// The decision tree (see docs/architecture/loading-states.md):
//   • Action in progress (button click, OAuth popup) → spinner OK
//   • Initial route load / data fetch                 → SKELETON
//   • Empty data state                                → EmptyState
//
// SCOPE — files this rule examines
//   This rule fires only inside files that match one of:
//     • app/**/page.tsx
//     • app/**/layout.tsx
//     • app/**/loading.tsx
//
// JSX-CONTEXT ALLOWLIST (refined)
//   Even inside a page-level file, a spinner is the correct
//   pattern when it lives inside a Button (or button-like) JSX
//   element — that is the "action in progress" branch of the
//   decision tree. We walk the JSX ancestor chain and skip the
//   report if any ancestor is a Button-like element.
//
//   Recognised button-like identifiers:
//     • Button, LoadingButton, IconButton, SubmitButton
//     • The native lowercase `button` HTML element
//
//   This refinement was added after Task #51's verification pass
//   surfaced three legitimate in-Button spinners on /login,
//   /signup, and /admin/flags. The earlier rule flagged them as
//   violations; the new rule correctly allows them.
//
// FILE-LEVEL ALLOWLIST
//   One page-level file is exempt from JSX inspection altogether:
//     • app/auth/google/callback/page.tsx — OAuth popup, where
//       the entire page body is the action surface.
//
// AUTHORING NOTE
//   Pure ESM, no TypeScript compilation step — the apps/web
//   package is `"type": "module"`, so `eslint.config.js` can
//   import this file directly.
// ═══════════════════════════════════════════════════════════════

/**
 * @fileoverview Disallow bare <Loader2> spinners at the page,
 *               layout, and route-loading levels. Use a skeleton
 *               from @/components/feedback/skeletons instead.
 *               Spinners inside Button-like elements are allowed
 *               (action context per the decision tree).
 */

/** Identifiers we treat as "bare spinner" components. */
const SPINNER_IDENTIFIERS = new Set(['Loader2']);

/** JSX ancestors that signal an action context — spinner allowed. */
const BUTTON_LIKE_IDENTIFIERS = new Set([
  'Button',
  'LoadingButton',
  'IconButton',
  'SubmitButton',
  'button', // native HTML
]);

/** Files this rule INSPECTS (page / layout / loading surfaces). */
const PAGE_LEVEL_PATTERNS = [
  /[/\\]app[/\\].+[/\\]page\.tsx$/,
  /[/\\]app[/\\].+[/\\]layout\.tsx$/,
  /[/\\]app[/\\].+[/\\]loading\.tsx$/,
];

/** Files explicitly allowed to use a bare spinner at page level. */
const EXPLICIT_ALLOWLIST = [
  // OAuth popup callback — entire body is an action surface.
  /[/\\]app[/\\]auth[/\\]google[/\\]callback[/\\]page\.tsx$/,
];

/**
 * Returns true when the given JSXOpeningElement node sits inside
 * a Button-like JSX element anywhere in its ancestor chain.
 *
 * @param {import('eslint').Rule.Node} node
 * @returns {boolean}
 */
function isInsideButtonLikeAncestor(node) {
  let parent = node.parent;
  while (parent) {
    if (
      parent.type === 'JSXElement' &&
      parent.openingElement &&
      parent.openingElement.name &&
      parent.openingElement.name.type === 'JSXIdentifier' &&
      BUTTON_LIKE_IDENTIFIERS.has(parent.openingElement.name.name)
    ) {
      return true;
    }
    parent = parent.parent;
  }
  return false;
}

/** @type {import('eslint').Rule.RuleModule} */
const noBareLoaderRule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow bare spinner components (Loader2) on page-level loading. ' +
        'Use a skeleton from @/components/feedback/skeletons instead. ' +
        'Spinners inside Button-like elements are allowed (action context).',
      recommended: true,
    },
    schema: [],
    messages: {
      noBareLoader:
        'Bare <{{name}}> spinner is not allowed on page-level loading. ' +
        'Replace with a layout-faithful skeleton from ' +
        '@/components/feedback/skeletons, or wrap inside a <Button> ' +
        'if this is an action context. See ' +
        'docs/architecture/loading-states.md for the decision tree.',
    },
  },

  create(context) {
    const filename =
      typeof context.filename === 'string'
        ? context.filename
        : typeof context.getFilename === 'function'
          ? context.getFilename()
          : '';

    // Short-circuit: only inspect page/layout/loading files.
    const isPageLevel = PAGE_LEVEL_PATTERNS.some((re) => re.test(filename));
    if (!isPageLevel) {
      return {};
    }

    // Short-circuit: skip files on the explicit allowlist.
    const isAllowed = EXPLICIT_ALLOWLIST.some((re) => re.test(filename));
    if (isAllowed) {
      return {};
    }

    return {
      JSXOpeningElement(node) {
        // We only care about identifier-named elements (e.g.
        // <Loader2 />), not member expressions (<Foo.Bar />).
        if (!node.name || node.name.type !== 'JSXIdentifier') {
          return;
        }

        const identifier = node.name.name;
        if (!SPINNER_IDENTIFIERS.has(identifier)) {
          return;
        }

        // Allowed when inside a Button-like ancestor (action context).
        if (isInsideButtonLikeAncestor(node)) {
          return;
        }

        context.report({
          node,
          messageId: 'noBareLoader',
          data: { name: identifier },
        });
      },
    };
  },
};

export default noBareLoaderRule;
