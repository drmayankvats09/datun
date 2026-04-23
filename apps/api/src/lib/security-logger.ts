// ═══════════════════════════════════════════════════════════════
// SECURITY LOGGER — Auth events + rate limit + suspicious activity
// Every auth event logged → Better Stack keyword alert on patterns.
// DPDP Act requires audit trail of access to medical data.
//
// Pattern: Google Cloud Audit Logs, AWS CloudTrail.
// ═══════════════════════════════════════════════════════════════

import { logger } from './logger.js';
import { Sentry } from './sentry.js';

type SecurityEvent =
  | 'auth.login.success'
  | 'auth.login.failed'
  | 'auth.signup.success'
  | 'auth.logout'
  | 'auth.token.refresh'
  | 'auth.token.expired'
  | 'auth.otp.requested'
  | 'auth.otp.verified'
  | 'auth.otp.failed'
  | 'auth.google.success'
  | 'auth.google.failed'
  | 'auth.password.changed'
  | 'auth.password.reset.requested'
  | 'rate_limit.hit'
  | 'rate_limit.blocked'
  | 'suspicious.brute_force'
  | 'suspicious.invalid_token'
  | 'data.consultation.created'
  | 'data.consultation.accessed'
  | 'data.user.profile.updated'
  | 'data.user.deleted';

interface SecurityEventData {
  event: SecurityEvent;
  userId?: string;
  email?: string;
  ip?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
}

/**
 * Log a security event to Winston (→ Better Stack).
 * Better Stack keyword alerts on patterns like "auth.login.failed".
 */
export function logSecurityEvent(data: SecurityEventData): void {
  const severity = getSeverity(data.event);

  const logData = {
    security: true,
    event: data.event,
    userId: data.userId ?? 'anonymous',
    email: data.email ?? 'unknown',
    ip: data.ip ?? 'unknown',
    userAgent: data.userAgent,
    ...data.details,
    timestamp: new Date().toISOString(),
  };

  switch (severity) {
    case 'critical':
      logger.error(`[SECURITY] ${data.event}`, logData);
      Sentry.captureMessage(`Security: ${data.event}`, {
        level: 'error',
        extra: logData,
      });
      break;
    case 'warning':
      logger.warn(`[SECURITY] ${data.event}`, logData);
      break;
    default:
      logger.info(`[SECURITY] ${data.event}`, logData);
  }
}

function getSeverity(event: SecurityEvent): 'critical' | 'warning' | 'info' {
  const critical: SecurityEvent[] = [
    'suspicious.brute_force',
    'suspicious.invalid_token',
    'rate_limit.blocked',
    'data.user.deleted',
  ];
  const warning: SecurityEvent[] = [
    'auth.login.failed',
    'auth.otp.failed',
    'auth.google.failed',
    'auth.token.expired',
    'rate_limit.hit',
  ];

  if (critical.includes(event)) return 'critical';
  if (warning.includes(event)) return 'warning';
  return 'info';
}
