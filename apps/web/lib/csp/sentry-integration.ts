// apps/web/lib/csp/sentry-integration.ts
// ═══════════════════════════════════════════════════════════════
// SENTRY INTEGRATION FOR CSP VIOLATIONS
//
// Sentry's `@sentry/nextjs` client automatically captures CSP violations
// as ReportingObserver events. This file provides:
//
//   1. A severity classifier — directive → criticality tag.
//   2. A `beforeSend` enrichment hook — adds tags + filters noise.
//
// SEVERITY MAPPING:
//   - script-src violation     → CRITICAL (likely XSS attempt)
//   - script-src-elem          → CRITICAL
//   - connect-src              → HIGH (data exfiltration attempt)
//   - frame-src / frame-ancestors → HIGH (clickjacking)
//   - object-src               → HIGH (plugin abuse)
//   - style-src                → MEDIUM (visual defacement)
//   - img-src / font-src / media-src → LOW (mostly bot noise)
//
// NOISE FILTER:
//   Browser extensions inject scripts that violate our CSP. We don't want
//   Sentry alerts for these. Filter pattern: `blocked-uri` matching
//   `chrome-extension://`, `moz-extension://`, `safari-extension://`.
//
// Pattern: Sentry official "CSP integration" guide (2025-Q4 update).
// ═══════════════════════════════════════════════════════════════

import type { ErrorEvent, EventHint } from '@sentry/nextjs';

/** Severity classification used for Sentry tagging. */
export type CspSeverity = 'critical' | 'high' | 'medium' | 'low';

/** Patterns indicating the report came from a browser extension (filtered out). */
const EXTENSION_URI_PATTERNS = [
  /^chrome-extension:\/\//i,
  /^moz-extension:\/\//i,
  /^safari-extension:\/\//i,
  /^webkit-masked-url:\/\//i,
  /^edge:\/\//i,
];

/** Effective-directive → severity mapping (CSP Level 3 directive names). */
const DIRECTIVE_SEVERITY: Record<string, CspSeverity> = {
  'script-src': 'critical',
  'script-src-elem': 'critical',
  'script-src-attr': 'critical',
  'connect-src': 'high',
  'frame-src': 'high',
  'frame-ancestors': 'high',
  'object-src': 'high',
  'form-action': 'high',
  'base-uri': 'high',
  'style-src': 'medium',
  'style-src-elem': 'medium',
  'style-src-attr': 'medium',
  'img-src': 'low',
  'font-src': 'low',
  'media-src': 'low',
  'worker-src': 'medium',
  'manifest-src': 'low',
};

/**
 * Classify a CSP violation's severity from the effective-directive.
 */
export function classifyViolationSeverity(effectiveDirective: string): CspSeverity {
  const directive = effectiveDirective.trim().split(/\s+/)[0] ?? '';
  return DIRECTIVE_SEVERITY[directive] ?? 'low';
}

/**
 * Check if a blocked-uri is from a browser extension (noise to filter).
 */
export function isExtensionUri(blockedUri: string): boolean {
  if (!blockedUri) return false;
  return EXTENSION_URI_PATTERNS.some((p) => p.test(blockedUri));
}

/**
 * Sentry `beforeSend` enrichment for CSP violation events.
 *
 * - Drops events from browser extensions (noise).
 * - Tags events with severity (`csp.severity`).
 * - Tags events with directive (`csp.directive`).
 *
 * @param event - The Sentry ErrorEvent being prepared.
 * @param hint - The Sentry hint (contains the original exception/violation).
 * @returns Enriched event, or `null` to drop the event.
 */
export function enrichCspEvent(event: ErrorEvent, hint?: EventHint): ErrorEvent | null {
  const message = event.message ?? '';
  const isCspEvent =
    message.includes('CSP') ||
    message.includes('Content Security Policy') ||
    event.tags?.csp === 'true' ||
    Boolean(event.extra?.['blocked-uri']);

  if (!isCspEvent) {
    return event;
  }

  const extra = event.extra ?? {};
  const blockedUri = String(extra['blocked-uri'] ?? '');
  const effectiveDirective = String(
    extra['effective-directive'] ?? extra['violated-directive'] ?? '',
  );

  // Drop extension noise.
  if (isExtensionUri(blockedUri)) {
    return null;
  }

  const severity = classifyViolationSeverity(effectiveDirective);

  event.tags = {
    ...(event.tags ?? {}),
    csp: 'true',
    'csp.severity': severity,
    'csp.directive': effectiveDirective || 'unknown',
  };

  // Promote critical violations to error level (default is warning).
  if (severity === 'critical') {
    event.level = 'error';
  } else if (severity === 'high') {
    event.level = 'warning';
  } else {
    event.level = 'info';
  }

  void hint; // Reserved for future enrichment hooks.

  return event;
}
