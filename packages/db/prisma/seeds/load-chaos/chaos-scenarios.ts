// ═══════════════════════════════════════════════════════════════
// CHAOS SCENARIOS — failure-mode injection orchestration
// Source: chaostoolkit.org/drivers/k6 + LitmusChaos pattern
// ═══════════════════════════════════════════════════════════════

export type ChaosFault =
  | 'AI_TIMEOUT'
  | 'AI_OVERLOAD'
  | 'AI_RATE_LIMIT'
  | 'AI_INVALID_RESPONSE'
  | 'DB_DOWN'
  | 'DB_SLOW'
  | 'DB_CONNECTION_POOL_EXHAUSTED'
  | 'WHATSAPP_DOWN'
  | 'WHATSAPP_TEMPLATE_REJECTED'
  | 'NETWORK_LATENCY_500MS'
  | 'NETWORK_PACKET_LOSS_5PCT'
  | 'PROMPT_INJECTION'
  | 'JAILBREAK_ATTEMPT'
  | 'MEMORY_PRESSURE'
  | 'CPU_THROTTLE'
  | 'CLOCK_SKEW'
  | 'DISK_FULL'
  | 'CDN_DOWN'
  | 'AUTH0_DOWN'
  | 'PAYMENT_GATEWAY_DOWN'
  | 'EMAIL_QUEUE_FULL';

export interface ChaosScenarioSpec {
  readonly name: string;
  readonly fault: ChaosFault;
  readonly targetService: string;
  readonly durationSeconds: number;
  readonly intensityPercent: number;
  readonly expectedOutcome:
    | 'GRACEFUL_FALLBACK'
    | 'CIRCUIT_BREAKER_OPEN'
    | 'BLOCKED_BY_SAFETY'
    | 'ESCALATED_TO_HUMAN'
    | 'DEGRADED_RESPONSE';
  readonly probes: readonly { name: string; sql: string; threshold: number }[];
}

export const STANDARD_CHAOS_SCENARIOS: readonly ChaosScenarioSpec[] = [
  {
    name: 'ai-timeout-graceful-fallback',
    fault: 'AI_TIMEOUT',
    targetService: 'anthropic-api',
    durationSeconds: 60,
    intensityPercent: 100,
    expectedOutcome: 'GRACEFUL_FALLBACK',
    probes: [
      {
        name: 'gpt4-fallback-used',
        sql: `SELECT count(*) FROM "AICostEvent" WHERE provider='openai-gpt4' AND "createdAt">NOW()-interval '2 min'`,
        threshold: 1,
      },
    ],
  },
  {
    name: 'db-pool-exhausted-circuit-breaker',
    fault: 'DB_CONNECTION_POOL_EXHAUSTED',
    targetService: 'postgres',
    durationSeconds: 30,
    intensityPercent: 100,
    expectedOutcome: 'CIRCUIT_BREAKER_OPEN',
    probes: [
      {
        name: 'circuit-state',
        sql: `SELECT count(*) FROM "JobLog" WHERE "level"='error' AND "msg" LIKE '%circuit%' AND "createdAt">NOW()-interval '2 min'`,
        threshold: 1,
      },
    ],
  },
  {
    name: 'whatsapp-template-rejected',
    fault: 'WHATSAPP_TEMPLATE_REJECTED',
    targetService: 'whatsapp-cloud-api',
    durationSeconds: 60,
    intensityPercent: 100,
    expectedOutcome: 'GRACEFUL_FALLBACK',
    probes: [
      {
        name: 'fallback-internal-alert-sent',
        sql: `SELECT count(*) FROM "WhatsappMessage" WHERE "templateName"='internal_alert' AND "createdAt">NOW()-interval '2 min'`,
        threshold: 1,
      },
    ],
  },
  {
    name: 'prompt-injection-blocked',
    fault: 'PROMPT_INJECTION',
    targetService: 'consultation-ai',
    durationSeconds: 60,
    intensityPercent: 100,
    expectedOutcome: 'BLOCKED_BY_SAFETY',
    probes: [
      {
        name: 'safety-block-recorded',
        sql: `SELECT count(*) FROM "SecurityEvent" WHERE "eventType"='PROMPT_INJECTION_BLOCKED' AND "createdAt">NOW()-interval '2 min'`,
        threshold: 1,
      },
    ],
  },
  {
    name: 'auth0-down-otp-fallback',
    fault: 'AUTH0_DOWN',
    targetService: 'auth0',
    durationSeconds: 60,
    intensityPercent: 100,
    expectedOutcome: 'GRACEFUL_FALLBACK',
    probes: [
      {
        name: 'otp-login-used',
        sql: `SELECT count(*) FROM "User" WHERE "lastLoginMethod"='OTP' AND "lastLogin">NOW()-interval '2 min'`,
        threshold: 1,
      },
    ],
  },
];

export function generateChaosReport(
  scenarioName: string,
  probeResults: readonly { name: string; passed: boolean }[],
): { passed: boolean; details: readonly { probe: string; passed: boolean }[] } {
  const allPassed = probeResults.every((r) => r.passed);
  return {
    passed: allPassed,
    details: probeResults.map((r) => ({ probe: r.name, passed: r.passed })),
  };
}
