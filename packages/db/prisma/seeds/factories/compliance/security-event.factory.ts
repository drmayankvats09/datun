// ═══════════════════════════════════════════════════════════════
// SECURITY EVENT FACTORY — Failed logins, suspicious access, IP changes
// Source: SOC 2 Type II requirements + OWASP Top 10
// ═══════════════════════════════════════════════════════════════

import { defineFactory } from '../core';

type SecurityEventType =
  | 'FAILED_LOGIN'
  | 'SUCCESSFUL_LOGIN_NEW_DEVICE'
  | 'PASSWORD_RESET_REQUESTED'
  | 'PASSWORD_CHANGED'
  | 'EMAIL_CHANGED'
  | 'PHONE_CHANGED'
  | 'ROLE_ELEVATED'
  | 'BULK_DATA_EXPORT'
  | 'API_KEY_GENERATED'
  | 'API_KEY_REVOKED'
  | 'SUSPICIOUS_IP_ACCESS'
  | 'GEOFENCE_VIOLATION'
  | 'TOR_EXIT_NODE'
  | 'BRUTE_FORCE_ATTEMPT'
  | 'SQL_INJECTION_ATTEMPT'
  | 'XSS_ATTEMPT'
  | 'RATE_LIMIT_EXCEEDED'
  | 'PRIVILEGED_ACTION'
  | 'DATA_DELETION_REQUEST'
  | 'CSRF_TOKEN_MISMATCH'
  | 'JWT_REPLAY_ATTEMPT';

type Severity = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

interface SecurityEventOutput {
  readonly id: string;
  readonly eventType: SecurityEventType;
  readonly severity: Severity;
  readonly userId: string | null;
  readonly sessionId: string | null;
  readonly ipAddress: string;
  readonly geoCountry: string;
  readonly geoCity: string | null;
  readonly userAgent: string;
  readonly deviceFingerprint: string;
  readonly description: string;
  readonly metadata: object;
  readonly riskScore: number;
  readonly autoMitigated: boolean;
  readonly mitigationAction: string | null;
  readonly investigatedBy: string | null;
  readonly investigatedAt: Date | null;
  readonly resolution: string | null;
  readonly notifiedSecurityTeam: boolean;
  readonly notifiedUser: boolean;
  readonly occurredAt: Date;
  readonly createdAt: Date;
}

interface SecurityEventTransient {
  readonly userId?: string | null;
  readonly forceEventType?: SecurityEventType;
  readonly forceSeverity?: Severity;
}

const SEVERITY_BY_EVENT: Record<SecurityEventType, Severity> = {
  FAILED_LOGIN: 'LOW',
  SUCCESSFUL_LOGIN_NEW_DEVICE: 'INFO',
  PASSWORD_RESET_REQUESTED: 'LOW',
  PASSWORD_CHANGED: 'INFO',
  EMAIL_CHANGED: 'MEDIUM',
  PHONE_CHANGED: 'MEDIUM',
  ROLE_ELEVATED: 'HIGH',
  BULK_DATA_EXPORT: 'MEDIUM',
  API_KEY_GENERATED: 'LOW',
  API_KEY_REVOKED: 'INFO',
  SUSPICIOUS_IP_ACCESS: 'HIGH',
  GEOFENCE_VIOLATION: 'MEDIUM',
  TOR_EXIT_NODE: 'HIGH',
  BRUTE_FORCE_ATTEMPT: 'CRITICAL',
  SQL_INJECTION_ATTEMPT: 'CRITICAL',
  XSS_ATTEMPT: 'HIGH',
  RATE_LIMIT_EXCEEDED: 'LOW',
  PRIVILEGED_ACTION: 'MEDIUM',
  DATA_DELETION_REQUEST: 'MEDIUM',
  CSRF_TOKEN_MISMATCH: 'HIGH',
  JWT_REPLAY_ATTEMPT: 'CRITICAL',
};

export const securityEventFactory = defineFactory<SecurityEventOutput, SecurityEventTransient>({
  name: 'audit-log' as 'audit-log',
  defaultTransient: {},

  build: ({ sequence, faker, transient }) => {
    const eventType =
      transient.forceEventType ??
      faker.helpers.weightedArrayElement([
        { weight: 30, value: 'FAILED_LOGIN' as const },
        { weight: 15, value: 'SUCCESSFUL_LOGIN_NEW_DEVICE' as const },
        { weight: 12, value: 'PASSWORD_RESET_REQUESTED' as const },
        { weight: 8, value: 'PASSWORD_CHANGED' as const },
        { weight: 7, value: 'RATE_LIMIT_EXCEEDED' as const },
        { weight: 5, value: 'SUSPICIOUS_IP_ACCESS' as const },
        { weight: 4, value: 'BULK_DATA_EXPORT' as const },
        { weight: 3, value: 'GEOFENCE_VIOLATION' as const },
        { weight: 3, value: 'BRUTE_FORCE_ATTEMPT' as const },
        { weight: 3, value: 'PRIVILEGED_ACTION' as const },
        { weight: 2, value: 'EMAIL_CHANGED' as const },
        { weight: 2, value: 'PHONE_CHANGED' as const },
        { weight: 2, value: 'API_KEY_GENERATED' as const },
        { weight: 1, value: 'TOR_EXIT_NODE' as const },
        { weight: 1, value: 'XSS_ATTEMPT' as const },
        { weight: 1, value: 'CSRF_TOKEN_MISMATCH' as const },
        { weight: 1, value: 'SQL_INJECTION_ATTEMPT' as const },
      ]);

    const severity = transient.forceSeverity ?? SEVERITY_BY_EVENT[eventType];
    const occurredAt = faker.date.recent({ days: 90 });

    return {
      id: `secevt-${String(sequence).padStart(12, '0')}`,
      eventType,
      severity,
      userId: transient.userId ?? null,
      sessionId: faker.string.uuid(),
      ipAddress: faker.internet.ipv4(),
      geoCountry: faker.helpers.weightedArrayElement([
        { weight: 70, value: 'IN' },
        { weight: 10, value: 'US' },
        { weight: 5, value: 'AE' },
        { weight: 5, value: 'SG' },
        { weight: 4, value: 'GB' },
        { weight: 3, value: 'CA' },
        { weight: 3, value: 'AU' },
      ]),
      geoCity: faker.location.city(),
      userAgent: faker.internet.userAgent(),
      deviceFingerprint: faker.string.alphanumeric(32),
      description: `${eventType.replace(/_/g, ' ').toLowerCase()} from ${faker.location.city()}`,
      metadata: {
        attemptCount:
          eventType === 'BRUTE_FORCE_ATTEMPT' ? faker.number.int({ min: 5, max: 50 }) : 1,
        targetEndpoint: faker.helpers.arrayElement([
          '/api/auth/login',
          '/api/patient/export',
          '/api/admin/users',
        ]),
      },
      riskScore:
        severity === 'CRITICAL'
          ? faker.number.int({ min: 80, max: 100 })
          : severity === 'HIGH'
            ? faker.number.int({ min: 60, max: 80 })
            : severity === 'MEDIUM'
              ? faker.number.int({ min: 40, max: 60 })
              : severity === 'LOW'
                ? faker.number.int({ min: 20, max: 40 })
                : faker.number.int({ min: 0, max: 20 }),
      autoMitigated: severity === 'CRITICAL' || severity === 'HIGH',
      mitigationAction: severity === 'CRITICAL' ? 'Account locked, security team notified' : null,
      investigatedBy:
        severity === 'CRITICAL' || severity === 'HIGH'
          ? `admin-${faker.number.int({ min: 1, max: 5 })}`
          : null,
      investigatedAt:
        severity === 'CRITICAL' || severity === 'HIGH' ? faker.date.recent({ days: 7 }) : null,
      resolution: severity === 'CRITICAL' ? 'False positive — confirmed legitimate user' : null,
      notifiedSecurityTeam: severity === 'CRITICAL' || severity === 'HIGH',
      notifiedUser: [
        'SUCCESSFUL_LOGIN_NEW_DEVICE',
        'PASSWORD_CHANGED',
        'EMAIL_CHANGED',
        'PHONE_CHANGED',
      ].includes(eventType),
      occurredAt,
      createdAt: occurredAt,
    };
  },

  persist: async (event) => event,
});
