// ═══════════════════════════════════════════════════════════════
// INSTRUMENTATION — Next.js 15+ hook for Sentry server-side init
// Called by Next.js before any server-side code runs.
// Skipped in dev mode — server config already gates by NODE_ENV,
// but skipping the import entirely avoids any module-load overhead
// that could interfere with Turbopack.
// ═══════════════════════════════════════════════════════════════

export async function register(): Promise<void> {
  // Skip Sentry entirely in dev mode (matches client + server gates)
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  if (process.env['NEXT_RUNTIME'] === 'nodejs') {
    await import('./sentry.server.config');
  }

  if (process.env['NEXT_RUNTIME'] === 'edge') {
    await import('./sentry.edge.config');
  }
}
