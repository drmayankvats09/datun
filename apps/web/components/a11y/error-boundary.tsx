// ═══════════════════════════════════════════════════════════════
// ERROR BOUNDARY — React crash recovery
// Catches render errors, shows friendly UI instead of white screen.
// Logs to Sentry (future). Pattern: Every FAANG React app.
// Note: Must be class component — React hooks can't catch render errors.
// ═══════════════════════════════════════════════════════════════

'use client';

import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Custom fallback UI */
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // Future: Sentry.captureException(error, { extra: info });
    console.error('[ErrorBoundary] Caught:', error, info.componentStack);
  }

  override render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex min-h-[300px] flex-col items-center justify-center px-6 py-12 text-center">
          <div className="bg-destructive/10 mb-4 flex h-14 w-14 items-center justify-center rounded-full text-2xl">
            ⚠️
          </div>
          <h2 className="text-foreground text-lg font-semibold">Something went wrong</h2>
          <p className="text-muted-foreground mt-2 max-w-sm text-sm">
            An unexpected error occurred. Please try refreshing the page.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="bg-primary text-primary-foreground hover:bg-primary/90 mt-6 rounded-lg px-5 py-2.5 text-sm font-medium transition-colors"
          >
            Refresh page
          </button>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <pre className="bg-muted text-destructive mt-4 max-w-lg overflow-auto rounded-lg p-4 text-left text-xs">
              {this.state.error.message}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
