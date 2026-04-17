// ═══════════════════════════════════════════════════════════════
// AUTH PROVIDER FACTORY — Returns configured auth provider
// To switch from Auth0 to own auth: change this one file.
// ═══════════════════════════════════════════════════════════════

import type { AuthProvider } from './types.js';
import { Auth0Provider } from './auth0.provider.js';

let instance: AuthProvider | null = null;

export function getAuthProvider(): AuthProvider {
  if (!instance) {
    // Future: switch based on env.AUTH_PROVIDER
    instance = new Auth0Provider();
  }
  return instance;
}

export type { AuthProvider } from './types.js';
