// ═══════════════════════════════════════════════════════════════
// @repo/api/services/training — Barrel
// Consumed by routes (admin/labeling.router, consultation.router,
// chat.router) and worker (judge-grading.processor).
// ═══════════════════════════════════════════════════════════════

export {
  captureMessage,
  captureMessagesBatch,
  type CaptureMessageInput,
  type CaptureMessageResult,
} from './capture.service.js';

export {
  getLabelingQueue,
  submitLabel,
  getLabelingStats,
  getConflicts,
  type GetQueueParams,
  type SubmitLabelParams,
  type SubmitLabelResult,
} from './labeling.service.js';

export {
  gradeMessage,
  gradeMessagesBatch,
  DEFAULT_JUDGE_CONFIG,
  JUDGE_PROMPT_VERSION,
  JUDGE_RUBRIC_VERSION,
  type BatchGradingSummary,
} from './judge.service.js';

export { buildLabelingQueue, type BuildQueueParams } from './queue.service.js';
