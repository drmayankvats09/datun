// ═══════════════════════════════════════════════════════════════
// PROMPT VERSION REGISTRY
// Every consultation stores promptVersion + workflowVersion.
// When prompts change, create system.v2.ts and update CURRENT here.
// Old versions stay for reference + training data correlation.
// ═══════════════════════════════════════════════════════════════

export const SYSTEM_PROMPT_VERSION = '2.1.0';
export const PHOTO_PROMPT_VERSION = '2.1.0';
export const WORKFLOW_VERSION = '2.1.0';

// Re-export active prompt builders
export { buildSystemPrompt } from './system.v1.js';
export { buildPhotoSystemPrompt } from './photo.v1.js';
