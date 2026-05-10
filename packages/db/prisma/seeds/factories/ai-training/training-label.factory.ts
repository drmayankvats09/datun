// ═══════════════════════════════════════════════════════════════
// TRAINING LABEL FACTORY — Human-in-loop quality scores
// Used by Task #131 (admin labeling UI). Each consultation message
// can have 1+ labels applied for AI fine-tuning data prep.
// ═══════════════════════════════════════════════════════════════

import type { PrismaClient, TrainingLabel } from '@prisma/client';
import { defineFactory } from '../core';
import {
  OUTCOME_TAGS,
  TRAINING_QUALITY_RUBRIC,
  type OutcomeTag,
} from '../../data/training-quality-rubric';

interface TrainingLabelTransient {
  readonly consultationId: string;
  readonly messageId?: string | null;
  readonly labelerUserId: string;
}

export const trainingLabelFactory = defineFactory<TrainingLabel, TrainingLabelTransient>({
  name: 'training-label',
  defaultTransient: { consultationId: '', labelerUserId: '' },

  build: ({ sequence, faker, transient }) => {
    if (!transient.consultationId)
      throw new Error('[training-label.factory] consultationId required');
    if (!transient.labelerUserId)
      throw new Error('[training-label.factory] labelerUserId required');

    // Pick scores per dimension from rubric
    // TRAINING_QUALITY_RUBRIC is `readonly QualityScore[]` (an array, not a wrapper object)
    const scoresByDimension = TRAINING_QUALITY_RUBRIC.map((dim) => ({
      dimension: dim.name,
      score: faker.number.int({ min: dim.minScore, max: dim.maxScore }),
      maxScore: dim.maxScore,
    }));

    const totalScore = scoresByDimension.reduce((s, d) => s + d.score, 0);
    const maxTotalScore = scoresByDimension.reduce((s, d) => s + d.maxScore, 0);

    const outcomeTags: OutcomeTag[] = faker.helpers.arrayElements(OUTCOME_TAGS, { min: 1, max: 3 });

    return {
      id: `label-${String(sequence).padStart(10, '0')}`,
      consultationId: transient.consultationId,
      messageId: transient.messageId ?? null,
      labelerUserId: transient.labelerUserId,
      labelerType: 'human',

      // Scores (denormalized JSON)
      scoresByDimension: JSON.stringify(scoresByDimension),
      totalScore,
      maxTotalScore,
      qualityPercentage: Math.round((totalScore / maxTotalScore) * 100),

      // Tags
      outcomeTags: JSON.stringify(outcomeTags),
      flaggedForReview: faker.datatype.boolean({ probability: 0.05 }),
      flagReason: null,

      // Notes
      labelerNotes: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.3 }) ?? null,

      // Audit
      labeledAt: faker.date.recent({ days: 60 }),
      reviewedBy: null,
      reviewedAt: null,

      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as TrainingLabel;
  },

  persist: async (label, prisma) => {
    return prisma.trainingLabel.upsert({
      where: { id: label.id },
      create: label,
      update: { updatedAt: new Date() },
    });
  },
});
