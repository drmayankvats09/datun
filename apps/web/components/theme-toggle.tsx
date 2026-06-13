'use client';

// ═══════════════════════════════════════════════════════════════
// THEME TOGGLE — Task #54 final form (supersedes the Phase 1 edit)
//
// Two accessibility layers live here:
//   1. SSR placeholder (Phase 1): aria-hidden + tabIndex={-1} —
//      jsx-a11y/no-aria-hidden-on-focusable requires that anything
//      hidden from the accessibility tree be PROVABLY unfocusable;
//      `disabled` alone is not that guarantee across every
//      browser/AT pairing. Keyboard users can never land on a
//      control screen readers cannot see ("ghost stop").
//   2. i18n labels (Phase 3): the accessible name now comes from
//      common.theme.* — present in all 10 locale bundles — so a
//      Tamil screen-reader user hears the action in Tamil, not in
//      English. SC 3.1.2 in spirit: UI controls speak the page's
//      language.
//
// E2E note: the dark-theme audit in public-pages.a11y.spec.ts
// deliberately engages dark via next-themes' storage key rather
// than clicking this button by label — so this label change (and
// any future translation tweak) can never break that spec.
// ═══════════════════════════════════════════════════════════════

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const t = useTranslations('common.theme');

  useEffect(() => {
    setMounted(true);
  }, []);

  // SSR: render disabled placeholder (avoids hydration mismatch).
  // tabIndex={-1} → explicitly unfocusable, so aria-hidden is
  // provably safe (see header, layer 1).
  if (!mounted) {
    return (
      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9"
        disabled
        aria-hidden="true"
        tabIndex={-1}
      >
        <span className="h-4 w-4" />
      </Button>
    );
  }

  const isDark = theme === 'dark';

  return (
    <Button
      variant="outline"
      size="icon"
      className="h-9 w-9"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? t('switchToLight') : t('switchToDark')}
    >
      {isDark ? (
        <Sun className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Moon className="h-4 w-4" aria-hidden="true" />
      )}
    </Button>
  );
}
