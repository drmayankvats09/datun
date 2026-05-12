// ═══════════════════════════════════════════════════════════════
// TYPE-SAFE TRANSLATIONS — Build-time check for missing keys
// Task #44 Phase 3 — admin namespace registered
// ═══════════════════════════════════════════════════════════════

import type en_common from './messages/en/common.json';
import type en_auth from './messages/en/auth.json';
import type en_consultation from './messages/en/consultation.json';
import type en_legal from './messages/en/legal.json';
import type en_errors from './messages/en/errors.json';
import type en_glossary from './messages/en/glossary.json';
import type en_admin from './messages/en/admin.json';

type Messages = {
  common: typeof en_common;
  auth: typeof en_auth;
  consultation: typeof en_consultation;
  legal: typeof en_legal;
  errors: typeof en_errors;
  glossary: typeof en_glossary;
  admin: typeof en_admin;
};

declare module 'next-intl' {
  interface AppConfig {
    Messages: Messages;
  }
}
