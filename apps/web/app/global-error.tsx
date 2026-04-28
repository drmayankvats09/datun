'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error, {
      tags: { errorBoundary: 'global', digest: error.digest ?? 'none' },
    });
  }, [error]);

  // P4-F2: Inline styles ONLY — CSS variables unavailable (layout crashed)
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          background: '#ffffff',
          color: '#0a0f1a',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: '440px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: 'rgba(239, 68, 68, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              fontSize: '28px',
            }}
          >
            ⚠️
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Something went wrong</h1>
          <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '8px', lineHeight: 1.5 }}>
            An unexpected error occurred. Our team has been notified.
          </p>
          {error.digest && (
            <p
              style={{
                fontSize: '12px',
                color: '#9ca3af',
                marginTop: '12px',
                fontFamily: 'monospace',
              }}
            >
              Error ID: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              marginTop: '24px',
              padding: '10px 20px',
              background: '#00a896',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
          <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '16px' }}>
            Need help?{' '}
            <a
              href="mailto:dr.mayankvats09@gmail.com"
              style={{ color: '#00a896', textDecoration: 'none' }}
            >
              dr.mayankvats09@gmail.com
            </a>
          </p>
        </div>
      </body>
    </html>
  );
}
