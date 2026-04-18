// ═══════════════════════════════════════════════════════════════
// Z-INDEX — Layering system to prevent stacking context chaos
// Pattern: Strict scale. Never use arbitrary z-index values.
// Rule: If you need z-index, pick from this scale. No exceptions.
// ═══════════════════════════════════════════════════════════════

export const Z_INDEX = {
  /** Behind everything — backgrounds, decorative elements */
  behind: -1,

  /** Base layer — page content */
  base: 0,

  /** Slightly above — sticky table headers, inline popovers */
  raised: 10,

  /** Navigation — sticky header, sidebar */
  nav: 100,

  /** Dropdown menus, popovers, tooltips */
  dropdown: 200,

  /** Overlay/backdrop — behind modals */
  overlay: 300,

  /** Modal dialogs, drawers, sheets */
  modal: 400,

  /** Toast notifications, snackbars */
  toast: 500,

  /** Command palette, global search */
  command: 600,

  /** Maximum — dev tools, debug overlays */
  max: 9999,
} as const;
