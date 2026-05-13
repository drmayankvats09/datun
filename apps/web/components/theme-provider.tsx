// apps/web/components/theme-provider.tsx
// ═══════════════════════════════════════════════════════════════
// THEME PROVIDER — next-themes wrapper with CSP nonce forwarding
//
// next-themes injects an inline <script> into the document head on first
// render to prevent flash-of-wrong-theme. Under strict CSP, that script
// requires a nonce or it will be blocked.
//
// next-themes v0.4.6+ accepts a `nonce` prop and forwards it to the
// generated <script> tag automatically.
//
// Pattern: next-themes README "Content Security Policy" section,
//          Next.js 16 strict-CSP guide.
// ═══════════════════════════════════════════════════════════════

'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';

type ThemeProviderProps = React.ComponentProps<typeof NextThemesProvider>;

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  // `nonce` is part of next-themes' props (forwarded to the inline script).
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
