// ═══════════════════════════════════════════════════════════════
// ACCESSIBLE AUTHENTICATION SPEC — Task #54 (WCAG 2.2 AA)
// apps/web/e2e/a11y/auth-flows.a11y.spec.ts
//
// WCAG 2.2 added SC 3.3.8 (Accessible Authentication — Minimum):
// logging in must not depend on a cognitive function test like
// transcribing a password by memory. The two mechanisms that
// satisfy it in practice — and that this spec locks down forever:
//
//   A. PASTE WORKS. Password managers are the assistive tech here.
//      Any onpaste-blocker, readonly trick, or keydown swallow on
//      the password field is an instant 3.3.8 failure. We perform a
//      REAL clipboard paste (permissions + ControlOrMeta+V), not a
//      fill(), because fill() would sail straight past a paste
//      blocker and certify a broken field.
//
//   B. AUTOCOMPLETE TOKENS ARE CORRECT. autocomplete="current-
//      password" / "new-password" / "email" / "tel" / "name" is
//      what lets managers and browsers do the remembering. This is
//      ALSO SC 1.3.5 (Identify Input Purpose) — two criteria, one
//      attribute. Tokens below were verified against the live
//      source (login/signup/forgot-password pages, 2026-06-12);
//      this spec freezes them against refactor drift.
//
// PLUS: the login page's PHONE tab is a distinct UI state the
// full-page sweep (default = email tab) never sees — it gets its
// own axe audit here.
//
// KNOWN GAP → Task #28 (test.fixme below): the OTP inputs
// (login page ~line 280, forgot-password ~line 108) ship
// inputMode="numeric" but NOT autocomplete="one-time-code", so
// iOS/Android SMS-code autofill can't offer the code. The fixme
// documents the exact contract #28 must satisfy; flipping fixme →
// test is part of that task's definition of done.
// ═══════════════════════════════════════════════════════════════

import { test, expect } from './axe.fixture';

test.describe('Accessible authentication (SC 3.3.8 + 1.3.5)', () => {
  test('login: password field accepts a real clipboard paste', async ({ page, context }) => {
    // Chromium honours these permission grants headlessly — this is
    // the same privileged path a password manager extension uses.
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await page.goto('/login', { waitUntil: 'domcontentloaded' });

    const secret = 'C0rrect-Horse-Battery-Staple!';
    await page.evaluate((value) => navigator.clipboard.writeText(value), secret);

    const password = page.locator('input[autocomplete="current-password"]');
    await expect(password).toBeVisible();
    await password.click();
    // ControlOrMeta → Ctrl+V on Linux CI, ⌘V if ever run on macOS.
    await page.keyboard.press('ControlOrMeta+v');

    // If ANY paste-suppression exists (onpaste preventDefault,
    // readonly toggling, keydown swallowing), the value stays empty
    // and this fails — exactly the regression we're guarding.
    await expect(password).toHaveValue(secret);
  });

  test('login: identity fields carry the correct autocomplete tokens', async ({
    page,
    assertNoA11yViolations,
  }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });

    // ── Email tab (default) ──
    const email = page.locator('input[type="email"]');
    await expect(email).toBeVisible();
    await expect(email).toHaveAttribute('autocomplete', 'email');

    const password = page.locator('input[autocomplete="current-password"]');
    await expect(password).toBeVisible();
    await expect(password).toHaveAttribute('type', 'password');

    // ── Phone tab — a UI state the page sweep never reaches ──
    await page.getByRole('tab', { name: 'Phone' }).click();
    const tel = page.locator('input[type="tel"]');
    await expect(tel).toBeVisible();
    await expect(tel).toHaveAttribute('autocomplete', 'tel');

    // Audit THIS state too: tab panels, OTP affordances, the works.
    await assertNoA11yViolations('login-phone-tab');
  });

  test('signup: every identity field is manager-fillable', async ({ page }) => {
    await page.goto('/signup', { waitUntil: 'domcontentloaded' });

    const expectations: ReadonlyArray<{
      selector: string;
      autocomplete: string;
      label: string;
    }> = [
      { selector: 'input[autocomplete="name"]', autocomplete: 'name', label: 'full name' },
      { selector: 'input[type="email"]', autocomplete: 'email', label: 'email' },
      { selector: 'input[type="tel"]', autocomplete: 'tel', label: 'phone' },
      {
        selector: 'input[autocomplete="new-password"]',
        autocomplete: 'new-password',
        label: 'password',
      },
    ];

    for (const field of expectations) {
      const input = page.locator(field.selector).first();
      await expect(input, `${field.label} field should be present`).toBeVisible();
      await expect(input).toHaveAttribute('autocomplete', field.autocomplete);
    }
  });

  test('forgot password: email step is manager-fillable', async ({ page }) => {
    await page.goto('/forgot-password', { waitUntil: 'domcontentloaded' });

    const email = page.locator('input[type="email"]');
    await expect(email).toBeVisible();
    await expect(email).toHaveAttribute('autocomplete', 'email');
    // The reset step's new-password field (verified in source at
    // ~line 128 with the correct token) only renders after a code is
    // issued — exercising it E2E needs a seeded backend session,
    // which arrives with the auth E2E groundwork around Task #58.
  });

  test.fixme('OTP inputs expose autocomplete="one-time-code" — unblocks with Task #28', async ({
    page,
  }) => {
    // CONTRACT FOR TASK #28 (SMS OTP UX):
    //   login page OTP input  (~line 280)  → autocomplete="one-time-code"
    //   forgot-password code  (~line 108)  → autocomplete="one-time-code"
    // That token is what lets iOS Security Code AutoFill and
    // Android SMS Retriever surface the code above the keyboard —
    // for a low-literacy patient on a budget phone it is the
    // difference between one tap and transcribing six digits
    // (the exact burden SC 3.3.8 exists to remove).
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.getByRole('tab', { name: 'Phone' }).click();
    // Intentionally strict — flip fixme → test in #28's PR:
    await expect(page.locator('input[autocomplete="one-time-code"]')).toBeAttached();
  });
});
