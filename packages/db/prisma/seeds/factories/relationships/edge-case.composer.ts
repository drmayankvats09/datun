// ═══════════════════════════════════════════════════════════════
// COMPOSER: Edge Case Scenario
// One call → patient + consultation matching one of 15 edge cases
// from data/scenarios/edge-cases. Used for chaos testing (Task #110).
// ═══════════════════════════════════════════════════════════════

import type { PrismaClient } from '@prisma/client';
import { EDGE_CASE_SCENARIOS, type EdgeCaseScenario } from '../../data/scenarios/edge-cases';
import { createPatientWithUser } from './patient-with-user.composer';
import { createFullConsultation, type FullConsultationTree } from './full-consultation.composer';

export interface EdgeCaseRun {
  readonly scenario: EdgeCaseScenario;
  readonly tree: FullConsultationTree;
}

/** Run a specific edge case scenario by ID */
export async function runEdgeCaseScenario(
  prisma: PrismaClient,
  scenarioId: string,
  ctx: { clinicId?: string | null; doctorId?: string | null },
): Promise<EdgeCaseRun> {
  const scenario = EDGE_CASE_SCENARIOS.find((s) => s.id === scenarioId);
  if (!scenario) throw new Error(`Edge case scenario not found: ${scenarioId}`);

  // Find archetype matching scenario or pick first applicable
  const { user: _user, patient } = await createPatientWithUser(prisma, {
    homeClinicId: ctx.clinicId ?? undefined,
  });

  const tree = await createFullConsultation(prisma, {
    patient,
    clinicId: ctx.clinicId,
    doctorId: ctx.doctorId,
    forceIcd10: scenario.icd10,
    forceUrgency: scenario.urgency,
    forceStatus: 'COMPLETED',
  });

  return { scenario, tree };
}

/** Run ALL 15 edge cases (chaos test entry) */
export async function runAllEdgeCases(
  prisma: PrismaClient,
  ctx: { clinicId?: string | null; doctorId?: string | null },
): Promise<readonly EdgeCaseRun[]> {
  const results: EdgeCaseRun[] = [];
  for (const scenario of EDGE_CASE_SCENARIOS) {
    results.push(await runEdgeCaseScenario(prisma, scenario.id, ctx));
  }
  return results;
}
