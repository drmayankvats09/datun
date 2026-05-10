// ═══════════════════════════════════════════════════════════════
// STATISTICAL DISTRIBUTIONS — Realistic data shapes
//
// Real-world data is NEVER uniform. Communication intervals,
// patient activity, consultation timing all follow power laws.
// Source: Newman 2005 "Power laws, Pareto distributions and Zipf's law"
//         arxiv.org/pdf/cond-mat/0412004
// ═══════════════════════════════════════════════════════════════

/**
 * Pareto distribution — heavy-tailed power law.
 * 80/20 rule: 80% of values cluster in 20% of range.
 * Use case: most patients are recent, few are very old.
 */
export function paretoSample(seed: number, alpha: number = 1.16, xMin: number = 1): number {
  // Defensive guards: NaN/Infinity inputs from upstream randomization → safe fallback.
  // FAANG pattern: math libraries MUST handle non-finite inputs gracefully. Property-based
  // tests (fast-check) generate edge cases including NaN — production seeds also can hit
  // these via misconfigured archetypes or bad telemetry inputs.
  if (!Number.isFinite(seed)) return Number.isFinite(xMin) && xMin > 0 ? xMin : 1;
  if (!Number.isFinite(alpha) || alpha <= 0) alpha = 1.16;
  if (!Number.isFinite(xMin) || xMin <= 0) xMin = 1;

  const u = pseudoRandom(seed);
  // Guard against u === 1 (would cause division by zero); clamp into (0, 1)
  const safeU = Math.min(0.999999, Math.max(0.000001, u));
  const result = xMin / Math.pow(1 - safeU, 1 / alpha);

  // Final invariant guard: result must be >= xMin (mathematical property of Pareto)
  return Number.isFinite(result) ? Math.max(result, xMin) : xMin;
}

/**
 * Exponential distribution — memoryless, used for inter-arrival times.
 * Use case: time between consultation messages, between appointments.
 */
export function exponentialSample(seed: number, lambda: number = 1): number {
  // Defensive guards: NaN/Infinity → 0 (zero-time interval is statistically valid).
  // FAANG pattern: same as Pareto — survival function math requires finite, positive inputs.
  if (!Number.isFinite(seed)) return 0;
  if (!Number.isFinite(lambda) || lambda <= 0) lambda = 1;

  const u = pseudoRandom(seed);
  // Guard against u === 1 (log(0) = -Infinity); clamp safely
  const safeU = Math.min(0.999999, Math.max(0.000001, u));
  const result = -Math.log(1 - safeU) / lambda;

  // Final invariant: result must be >= 0 (exponential is non-negative)
  return Number.isFinite(result) && result >= 0 ? result : 0;
}

/**
 * Log-normal distribution — used for consultation durations, AI costs.
 * Most consultations are short, few are very long.
 */
export function logNormalSample(seed: number, mu: number = 0, sigma: number = 1): number {
  const u1 = pseudoRandom(seed);
  const u2 = pseudoRandom(seed + 1);
  // Box-Muller transform
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return Math.exp(mu + sigma * z);
}

/**
 * Zipf distribution — used for ranking-like data (popular conditions, common medications).
 */
export function zipfSample(n: number, s: number, seed: number): number {
  const harmonic = Array.from({ length: n }, (_, i) => 1 / Math.pow(i + 1, s));
  const total = harmonic.reduce((sum, h) => sum + h, 0);
  const target = pseudoRandom(seed) * total;
  let cumulative = 0;
  for (let i = 0; i < n; i++) {
    cumulative += harmonic[i]!;
    if (cumulative >= target) return i + 1;
  }
  return n;
}

/**
 * Power-law sample for "days ago" — most recent events more frequent.
 * 60% in last 30 days, 25% in last 90, 15% older — real Datun usage pattern.
 */
export function realisticDaysAgo(seed: number, maxDays: number = 365): number {
  const sample = paretoSample(seed, 1.5, 1);
  return Math.min(Math.floor(sample), maxDays);
}

/**
 * Generate timestamp following Pareto distribution.
 * Used for: consultation.startedAt, appointment.scheduledAt history,
 * audit-log.timestamp, message.sentAt.
 */
export function realisticTimestamp(seed: number, maxDaysAgo: number = 365): Date {
  const daysAgo = realisticDaysAgo(seed, maxDaysAgo);
  const hoursOffset = Math.floor(pseudoRandom(seed + 1) * 24);
  const minutesOffset = Math.floor(pseudoRandom(seed + 2) * 60);
  const secondsOffset = Math.floor(pseudoRandom(seed + 3) * 60);

  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hoursOffset, minutesOffset, secondsOffset, 0);
  return date;
}

/**
 * Indian clinic peak hours: 10am-1pm + 5pm-8pm = 60% of bookings.
 */
export function realisticClinicHour(seed: number): number {
  const u = pseudoRandom(seed);
  if (u < 0.3) return 10 + Math.floor(pseudoRandom(seed + 1) * 4); // 10am-2pm
  if (u < 0.6) return 17 + Math.floor(pseudoRandom(seed + 1) * 4); // 5pm-9pm
  if (u < 0.85) return 14 + Math.floor(pseudoRandom(seed + 1) * 3); // 2pm-5pm afternoon
  return 9 + Math.floor(pseudoRandom(seed + 1) * 12); // outliers
}

/**
 * Indian festival surge multiplier. Diwali/Eid/Ganesh Chaturthi see traffic spikes.
 */
export function festivalSurgeFactor(date: Date): number {
  const month = date.getMonth();
  const day = date.getDate();

  // Approximate festival ranges (lunar calendar so dates shift annually)
  if (month === 10 && day >= 1 && day <= 7) return 1.8; // Diwali week (Nov)
  if (month === 8 && day >= 15 && day <= 25) return 1.3; // Ganesh Chaturthi (Sep)
  if (month === 2 && day >= 1 && day <= 10) return 1.4; // Holi (Mar)
  if (month === 5 && day >= 1 && day <= 7) return 1.2; // Eid (variable)

  // Saturday/Sunday boost
  const dayOfWeek = date.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) return 1.3;

  return 1.0;
}

/**
 * Deterministic pseudo-random — given same seed, same output.
 * Uses Mulberry32 algorithm (fast + good distribution).
 */
function pseudoRandom(seed: number): number {
  let t = (seed | 0) + 0x6d2b79f5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/**
 * Weighted choice from array of {weight, value} — used for
 * realistic categorical distributions (urgency, status, etc.).
 */
export function weightedChoice<T>(
  options: ReadonlyArray<{ weight: number; value: T }>,
  seed: number,
): T {
  const totalWeight = options.reduce((sum, o) => sum + o.weight, 0);
  const target = pseudoRandom(seed) * totalWeight;
  let cumulative = 0;
  for (const opt of options) {
    cumulative += opt.weight;
    if (cumulative >= target) return opt.value;
  }
  return options[options.length - 1]!.value;
}

/**
 * Realistic AI consultation duration (minutes).
 * Log-normal: most 5-15 min, few 30-60 min, rare 90+.
 * Source: Wave 1 Datun analytics.
 */
export function realisticConsultationDurationMinutes(seed: number): number {
  // Log-normal with mu=2.3 (e^2.3 ≈ 10 min), sigma=0.6
  return Math.max(2, Math.min(120, Math.round(logNormalSample(seed, 2.3, 0.6))));
}

/**
 * Realistic AI token count for input.
 * Log-normal: most 500-2000, few 5000+, rare 10000+.
 */
export function realisticAiInputTokens(seed: number): number {
  return Math.max(100, Math.min(20000, Math.round(logNormalSample(seed, 7.0, 0.8))));
}

/**
 * Realistic AI cost in USD given input/output tokens.
 * Claude Sonnet 4 pricing: $3/M input, $15/M output (approx).
 */
export function realisticAiCost(inputTokens: number, outputTokens: number): number {
  return (inputTokens * 3) / 1_000_000 + (outputTokens * 15) / 1_000_000;
}
