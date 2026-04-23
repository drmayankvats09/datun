// ═══════════════════════════════════════════════════════════════
// TEST APP — Supertest-ready Express app instance
// Uses createApp() factory (separated in app.ts for testability).
// ═══════════════════════════════════════════════════════════════

import supertest from 'supertest';
import { createApp } from '../../app.js';

let appInstance: ReturnType<typeof createApp> | null = null;

export function getTestApp() {
  if (!appInstance) {
    appInstance = createApp();
  }
  return supertest(appInstance);
}

export function resetTestApp() {
  appInstance = null;
}
