// ═══════════════════════════════════════════════════════════════
// PROMPT VERSION REGISTRY
// Every consultation stores promptVersion + workflowVersion.
// When prompts change, create system.v2.ts and update CURRENT here.
// Old versions stay for reference + training data correlation.
// ═══════════════════════════════════════════════════════════════

// Versions from @repo/shared — single source of truth
export { SYSTEM_PROMPT_VERSION, PHOTO_PROMPT_VERSION, WORKFLOW_VERSION } from '@repo/shared';

// Re-export active prompt builders
export { buildSystemPrompt } from './system.v1.js';
export { buildPhotoSystemPrompt } from './photo.v1.js';
