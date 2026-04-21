'use client';

import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function GoogleCallbackPage() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');

    if (error) {
      window.opener?.postMessage(
        { type: 'google-oauth-error', error: error },
        window.location.origin,
      );
      window.close();
      return;
    }

    if (code) {
      window.opener?.postMessage({ type: 'google-oauth-code', code: code }, window.location.origin);
      setTimeout(() => window.close(), 2000);
      return;
    }

    window.opener?.postMessage(
      { type: 'google-oauth-error', error: 'No authorization code received' },
      window.location.origin,
    );
    window.close();
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <Loader2 className="text-primary mx-auto h-8 w-8 animate-spin" />
        <p className="text-muted-foreground mt-4 text-sm">Completing sign in...</p>
      </div>
    </main>
  );
}
