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

  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-sm text-muted-foreground">Completing sign in...</p>
      </div>
    </main>
  );
}
