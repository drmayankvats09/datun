// ═══════════════════════════════════════════════════════════════
// GUARDRAIL STORE — persists every violation for audit + drift signal
// ═══════════════════════════════════════════════════════════════
import type { PrismaClient } from '@prisma/client';
import type { GuardrailResult } from './guardrail.types';

export async function logGuardrailResult(
  prisma: PrismaClient,
  consultationId: string,
  side: 'input' | 'output',
  result: GuardrailResult,
): Promise<void> {
  if (result.violations.length === 0) return;
  await Promise.all(
    result.violations.map((v) =>
      prisma.guardrailViolation
        .create({
          data: {
            consultationId,
            side,
            kind: v.kind,
            severity: v.severity,
            message: v.message,
            redactedExcerpt: v.redactedExcerpt ?? null,
          },
        })
        .catch(() => undefined),
    ),
  );
}
