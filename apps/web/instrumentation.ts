// ═══════════════════════════════════════════════════════════════
// INSTRUMENTATION — Next.js 15+ hook for Sentry server-side init
// Called by Next.js before any server-side code runs.
// ═══════════════════════════════════════════════════════════════

export async function register(): Promise<void> {
  if (process.env['NEXT_RUNTIME'] === 'nodejs') {
    await import('./sentry.server.config');
  }

  if (process.env['NEXT_RUNTIME'] === 'edge') {
    await import('./sentry.edge.config');
  }
}
