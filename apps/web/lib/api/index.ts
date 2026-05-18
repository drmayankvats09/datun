// apps/web/lib/api/index.ts
// ═══════════════════════════════════════════════════════════════
// API LAYER — Barrel export
//
// Public surface of the API client layer. Components and hooks
// should import from `@/lib/api`, NEVER from sub-paths, so we
// can reorganise internals without touching consumer code.
//
// Allowed:    import { api, ApiError, isApiError } from '@/lib/api'
// Forbidden:  import { api } from '@/lib/api/api-client'
//             import { ApiError } from '@/lib/api/api-error'
//
// Phase 3 ESLint rule (planned): `no-restricted-imports` blocks
// `@/lib/api/*` sub-paths, enforces the public surface.
// ═══════════════════════════════════════════════════════════════

export { authFetch, type AuthFetchOptions } from './auth-fetch';
export {
  ApiError,
  NetworkError,
  isApiError,
  isNetworkError,
  type ApiErrorOptions,
} from './api-error';
export { api, type Api, type ApiCallContext } from './api-client';
export { ENDPOINTS } from './endpoints';
