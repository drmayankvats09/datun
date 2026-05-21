// ═══════════════════════════════════════════════════════════════
// GOOGLE OAUTH CALLBACK — popup-window handler
//
// Flow:
//   1. Google redirects the popup here with ?code=... or ?error=...
//   2. We validate `window.opener` and the opener's origin.
//   3. On success: postMessage the code back to the opener,
//      then auto-close within 500 ms.
//   4. On failure: postMessage the error (or render an inline
//      error UI if the opener is unreachable).
//
// SECURITY NOTE
// ─────────────
// The `useEffect` body below is security-critical: opener checks,
// origin verification, postMessage targeting. Task #51 changes
// ONLY presentation — the JS logic is preserved byte-for-byte.
//
// TASK #51 UPGRADE
// ────────────────
// The previous bare <Loader2> + "Completing sign in..." text has
// been upgraded to a Stripe / Linear-grade callback presentation:
// brand-colored icon tile with the spinner inside, a confident
// heading, and a status sentence explaining that the window will
// close automatically. The spinner pattern is intentionally
// retained — this surface is a *brief action in progress*, which
// is the one place the decision tree calls for a spinner rather
// than a skeleton.
//
// The error branch is left untouched — Task #52 (error boundaries)
// will refactor it as part of the global error-state pass.
// ═══════════════════════════════════════════════════════════════

'use client';

import { useEffect, useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';

export default function GoogleCallbackPage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const errorParam = params.get('error');

    if (!window.opener || window.opener.closed) {
      setError('Sign-in flow was interrupted. Please return to the login page and try again.');
      return;
    }

    try {
      const openerOrigin = window.opener.location.origin;
      if (openerOrigin !== window.location.origin) {
        setError('Security check failed. Please try again from the login page.');
        return;
      }
    } catch {
      setError('Security check failed. Please try again from the login page.');
      return;
    }

    if (errorParam) {
      window.opener.postMessage(
        { type: 'google-oauth-error', error: errorParam },
        window.location.origin,
      );
      window.close();
      return;
    }

    if (code) {
      window.opener.postMessage({ type: 'google-oauth-code', code }, window.location.origin);
      setTimeout(() => window.close(), 500);
      return;
    }

    window.opener.postMessage(
      { type: 'google-oauth-error', error: 'No authorization code received' },
      window.location.origin,
    );
    window.close();
  }, []);

  // ─── Error branch — left untouched; Task #52 refactors all errors
  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Sign-in Failed</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          <button
            onClick={() => {
              window.location.href = '/login';
            }}
            className="mt-6 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go to Login
          </button>
        </div>
      </main>
    );
  }

  // ─── Loading branch — upgraded presentation (Task #51) ──────────
  // Spinner is intentionally retained: this is a brief action in
  // progress (popup will close in ≤ 500 ms), which is the one
  // surface where the project decision tree calls for a spinner.
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div
        className="w-full max-w-sm space-y-5 text-center"
        role="status"
        aria-live="polite"
        aria-label="Completing sign-in"
      >
        {/* Branded icon tile with spinner inside */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
        </div>

        {/* Heading + status copy — Stripe / Linear OAuth callback tone */}
        <div className="space-y-2">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Connecting to Google
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Finalizing your sign-in. This window will close automatically.
          </p>
        </div>
      </div>
    </main>
  );
}
