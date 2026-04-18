// ═══════════════════════════════════════════════════════════════
// @repo/shared — Barrel export
// import { BRAND, COLORS, CONTACTS, URLS, API_VERSION } from '@repo/shared'
// ═══════════════════════════════════════════════════════════════

export { BRAND } from './brand.js';
export {
  API_VERSION,
  SYSTEM_PROMPT_VERSION,
  PHOTO_PROMPT_VERSION,
  WORKFLOW_VERSION,
} from './version.js';
export { CONTACTS } from './contacts.js';
export { COLORS } from './colors.js';
export { URLS } from './urls.js';
export { emailWrapper, emailFooter } from './emails.js';
