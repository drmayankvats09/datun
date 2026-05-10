// ═══════════════════════════════════════════════════════════════
// DEMO SEED ENTRY — minimal demo dataset for local dev
// Re-exports from strategies/demo.strategy for backward-compat
// ═══════════════════════════════════════════════════════════════
export { demoStrategy } from '../strategies/demo.strategy';

import { demoStrategy } from '../strategies/demo.strategy';

/** Sugar: returns the demo strategy descriptor */
export const getDemoStrategy = (): typeof demoStrategy => demoStrategy;

/** Demo metadata used by `pnpm seed --strategy demo` */
export const DEMO_METADATA = {
  name: 'demo',
  description: '20 consultations, 5 clinics, 12 doctors, 100 patients — demo-ready dataset',
  durationEstimateSeconds: 30,
  diskFootprintMB: 5,
  recordsApprox: 350,
} as const;
