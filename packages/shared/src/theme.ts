// ═══════════════════════════════════════════════════════════════
// THEME — Semantic color tokens for light and dark modes
// These map to CSS custom properties in the web app.
// Used directly in email/PDF templates via theme.light/dark selectors.
// Pattern: shadcn/ui theming, Radix UI color system.
// ═══════════════════════════════════════════════════════════════

export const THEME = {
  light: {
    /** Page background */
    background: '#ffffff',
    /** Primary text */
    foreground: '#0a0f1a',
    /** Card/surface background */
    card: '#ffffff',
    cardForeground: '#0a0f1a',
    /** Muted/secondary surfaces */
    muted: '#f4f4f5',
    mutedForeground: '#71717a',
    /** Primary brand — teal */
    primary: '#12c4b2',
    primaryForeground: '#ffffff',
    /** Secondary */
    secondary: '#f4f4f5',
    secondaryForeground: '#18181b',
    /** Borders */
    border: '#e4e4e7',
    /** Input borders */
    input: '#e4e4e7',
    /** Focus ring */
    ring: '#12c4b2',
    /** Semantic states */
    success: '#22c55e',
    successForeground: '#ffffff',
    warning: '#f59e0b',
    warningForeground: '#ffffff',
    error: '#ef4444',
    errorForeground: '#ffffff',
    info: '#0a9e8f',
    infoForeground: '#ffffff',
  },

  dark: {
    background: '#0a0f1a',
    foreground: '#fafafa',
    card: '#111827',
    cardForeground: '#fafafa',
    muted: '#1e293b',
    mutedForeground: '#94a3b8',
    primary: '#12c4b2',
    primaryForeground: '#0a0f1a',
    secondary: '#1e293b',
    secondaryForeground: '#fafafa',
    border: '#1e2a3a',
    input: '#1e2a3a',
    ring: '#12c4b2',
    success: '#22c55e',
    successForeground: '#0a0f1a',
    warning: '#f59e0b',
    warningForeground: '#0a0f1a',
    error: '#ef4444',
    errorForeground: '#ffffff',
    info: '#0a9e8f',
    infoForeground: '#ffffff',
  },
} as const;

export type ThemeMode = keyof typeof THEME;
export type ThemeTokens = typeof THEME.light;
