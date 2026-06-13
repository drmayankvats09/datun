// ═══════════════════════════════════════════════════════════════
// PUBLIC PAGES AXE SWEEP — Task #54 (WCAG 2.2 AA, every PR)
// apps/web/e2e/a11y/public-pages.a11y.spec.ts
//
// The blanket audit: every patient-reachable page that exists today
// gets a full axe-core scan against the five-tag WCAG bar defined
// in axe.fixture.ts. Runs in BOTH Playwright projects (desktop +
// Pixel 7), so each PR produces 9 routes × 2 viewports = 18
// independent page audits with attached JSON evidence.
//
// ROUTE LIST MAINTENANCE CONTRACT
//   When a task ships a new public route, ADD IT HERE IN THE SAME
//   PR — that is what "verified every PR" means in the task spec.
//   Known future joiners (from Datun_v2 task list):
//     #55 homepage v2 (replaces coming-soon — same '/' entry)
//     #56 /consult (chat) · #66 emergency surface
//   /accessibility joined in this task's own final commit — the
//   statement page is audit-gated by the suite it describes.
//   Authenticated surfaces join once seeded test sessions exist
//   (post-#58 auth E2E groundwork) — tracked, not forgotten.
//
// WHY domcontentloaded + #main-content (not networkidle):
//   The app streams + hydrates; PostHog/Sentry keep sockets alive,
//   so 'networkidle' is a flake factory. Visibility of the page's
//   own skip-target (#main-content, mounted by PageShell — or the
//   <main> landmark on routes with custom layouts) is the honest
//   "page is ready for a user" signal.
// ═══════════════════════════════════════════════════════════════

import { test, expect } from './axe.fixture';

/**
 * Every public route, with the locale-prefix-free path that
 * localePrefix: 'as-needed' + DEFAULT_LOCALE 'en' serves.
 * (routing.ts verified 2026-06-12.)
 */
const PUBLIC_ROUTES: ReadonlyArray<{
  path: string;
  name: string;
  /** Freeze timers before load — see the /offline note. */
  freezeClock?: true;
}> = [
  { path: '/', name: 'home (coming-soon)' },
  { path: '/login', name: 'login' },
  { path: '/signup', name: 'signup' },
  { path: '/forgot-password', name: 'forgot password' },
  { path: '/privacy', name: 'privacy policy' },
  { path: '/terms', name: 'terms of service' },
  { path: '/cookies', name: 'cookie policy' },
  { path: '/dpdp-notice', name: 'DPDP notice' },
  { path: '/accessibility', name: 'accessibility statement' },
  // r3→r4 saga: OfflineRetryButton auto-reloads ~1s after mount when
  // online (good real-user UX) — it kept destroying the page mid-axe.
  // r3 tried cutting the network post-load; that crashed hydration
  // into the error boundary (Next fallback has no <title> — axe
  // receipts in the r4 report). r4 answer: freeze the page clock
  // BEFORE navigation — the reload setTimeout simply never fires,
  // the page stays online, fully hydrated, and perfectly still.
  { path: '/offline', name: 'offline fallback', freezeClock: true },
];

test.describe('WCAG 2.2 AA — public page sweep', () => {
  for (const route of PUBLIC_ROUTES) {
    test(`${route.name} (${route.path}) has no axe violations`, async ({
      page,
      assertNoA11yViolations,
    }) => {
      if (route.freezeClock) {
        await page.clock.install();
      }

      await page.goto(route.path, { waitUntil: 'domcontentloaded' });

      // "Ready" = the page's own content landmark is on screen.
      // PageShell mounts #main-content; legal/auth layouts mount
      // <main> — .first() + or() covers every current layout shape.
      await expect(page.locator('#main-content').or(page.locator('main')).first()).toBeVisible();

      await assertNoA11yViolations('full-page');
    });
  }

  test('home page in dark theme has no axe violations', async ({
    page,
    assertNoA11yViolations,
  }) => {
    // Dark mode is a first-class theme (next-themes, Task tokens in
    // globals.css) — its contrast math is DIFFERENT from light and
    // must earn its own audit.
    //
    // Engagement mechanics (verified against [locale]/layout.tsx):
    // ThemeProvider ships defaultTheme="light" — so an OS-level
    // colorScheme emulation would NOT flip the class (system pref
    // only applies when the stored choice is 'system'). Seeding
    // next-themes' storage key before load is the path a returning
    // dark-mode user actually takes, is deterministic, and — unlike
    // clicking the toggle by its label — survives the Phase 3
    // theme-toggle i18n change untouched.
    await page.addInitScript(() => {
      window.localStorage.setItem('theme', 'dark');
    });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#main-content').or(page.locator('main')).first()).toBeVisible();

    // Belt-and-braces: confirm dark actually engaged before we
    // certify its contrast (guards against a future defaultTheme
    // regression silently turning this into a duplicate light scan).
    await expect(page.locator('html')).toHaveClass(/dark/);

    await assertNoA11yViolations('full-page-dark');
  });
});
