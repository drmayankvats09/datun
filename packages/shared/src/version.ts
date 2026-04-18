// ═══════════════════════════════════════════════════════════════
// VERSION — Centralized version strings
// Update here for releases. Prompt versions are separate —
// they track clinical prompt iterations, not code releases.
// ═══════════════════════════════════════════════════════════════

/** API release version — shown in /health, Sentry, boot log */
export const API_VERSION = '2.1.0';

/** System prompt version — stored per consultation for training data correlation */
export const SYSTEM_PROMPT_VERSION = '2.1.0';

/** Photo prompt version */
export const PHOTO_PROMPT_VERSION = '2.1.0';

/** Workflow version — tracks consultation flow logic changes */
export const WORKFLOW_VERSION = '2.1.0';
