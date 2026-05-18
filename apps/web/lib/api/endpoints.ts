// apps/web/lib/api/endpoints.ts
// ═══════════════════════════════════════════════════════════════
// API ENDPOINT PATHS — Task #47 Phase 1
//
// Single source of truth for backend URL paths. Every method in
// api-client.ts references a constant here, NEVER a string literal.
//
// Conventions:
//   - All paths absolute from API_BASE, starting with /api/...
//   - String for static paths, function for parametric paths
//   - All parametric IDs wrapped in `encodeURIComponent` so values
//     with URL-unsafe characters (rare, but possible with custom
//     ID schemes) cannot break routing or open injection vectors
//   - Grouped by domain to mirror api-client.ts namespaces
//
// Why a separate file (instead of inlining in api-client.ts):
//   - Tests can mock by path without importing client internals
//   - React Native (Task #67) reuses this file unmodified when we
//     promote api-client to `@repo/api-client`
//   - One diff updates the entire app when backend renames a route
//
// Aligned with existing backend mounts:
//   app.use('/api', authRouter)         → /api/auth/*
//   app.use('/api', consultationRouter) → /api/consultations/*
//   app.use('/api', chatRouter)         → /api/chat/*
//   app.use('/api', mediaRouter)        → /api/media/*
//   app.use('/api/admin', adminRouter)  → /api/admin/*
// ═══════════════════════════════════════════════════════════════

export const ENDPOINTS = {
  // ── Auth ──────────────────────────────────────────────────
  auth: {
    me: '/api/auth/me',
    refresh: '/api/auth/refresh',
    logout: '/api/auth/logout',
    emailLogin: '/api/auth/email/login',
    emailSignup: '/api/auth/email/signup',
    sendOtp: '/api/auth/otp/send',
    verifyOtp: '/api/auth/otp/verify',
    googleExchange: '/api/auth/google/exchange',
    forgotPassword: '/api/auth/password/forgot',
    resetPassword: '/api/auth/password/reset',
  },

  // ── Users ─────────────────────────────────────────────────
  users: {
    me: '/api/users/me',
    profile: '/api/users/me/profile',
    consultations: '/api/users/me/consultations',
  },

  // ── Consultations ─────────────────────────────────────────
  consultations: {
    list: '/api/consultations',
    create: '/api/consultations',
    detail: (id: string) => `/api/consultations/${encodeURIComponent(id)}`,
    sendMessage: (id: string) => `/api/consultations/${encodeURIComponent(id)}/messages`,
    complete: (id: string) => `/api/consultations/${encodeURIComponent(id)}/complete`,
    pdf: (id: string) => `/api/consultations/${encodeURIComponent(id)}/pdf`,
  },

  // ── Chat streaming ────────────────────────────────────────
  chat: {
    stream: '/api/chat/stream',
  },

  // ── Media (Task #46 deployed) ─────────────────────────────
  media: {
    uploadIntent: '/api/media/upload-intent',
    confirm: (id: string) => `/api/media/${encodeURIComponent(id)}/confirm`,
    asset: (id: string) => `/api/media/${encodeURIComponent(id)}`,
  },

  // ── Clinics (Task #57 / #59) ──────────────────────────────
  clinics: {
    list: '/api/clinics',
    search: '/api/clinics/search',
    detail: (id: string) => `/api/clinics/${encodeURIComponent(id)}`,
  },

  // ── Appointments (Task #59 / #157) ────────────────────────
  appointments: {
    list: '/api/appointments',
    create: '/api/appointments',
    detail: (id: string) => `/api/appointments/${encodeURIComponent(id)}`,
    cancel: (id: string) => `/api/appointments/${encodeURIComponent(id)}/cancel`,
  },

  // ── Notifications ─────────────────────────────────────────
  notifications: {
    list: '/api/notifications',
    markRead: (id: string) => `/api/notifications/${encodeURIComponent(id)}/read`,
    markAllRead: '/api/notifications/read-all',
  },

  // ── Prescriptions (Task #58) ──────────────────────────────
  prescriptions: {
    list: '/api/prescriptions',
    detail: (id: string) => `/api/prescriptions/${encodeURIComponent(id)}`,
  },

  // ── Health Score (Task #32) ───────────────────────────────
  healthScore: {
    current: '/api/health-score',
    history: '/api/health-score/history',
  },

  // ── Feature Flags (Task #49) ──────────────────────────────
  flags: {
    list: '/api/flags',
  },

  // ── Admin / Labeling (Task #44 — replacing training-api.ts) ──
  admin: {
    labeling: {
      queue: '/api/admin/labeling/queue',
      submit: '/api/admin/labeling/submit',
      stats: '/api/admin/labeling/stats',
      conflicts: '/api/admin/labeling/conflicts',
      judgeGrade: '/api/admin/labeling/judge/grade',
    },
  },
} as const;
