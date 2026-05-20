// ═══════════════════════════════════════════════════════════════
// MOTION TOKENS — Contract tests
//
// These tests pin down the SHAPE of our motion tokens. If anyone
// deletes a key or changes a type, the test fails immediately.
//
// Why a contract test (and not just types)?
//   - TypeScript catches *call-site* misuse, not export-shape drift.
//   - Tests run in CI; a misconfigured tsconfig can hide type errors.
//   - 50+ files will depend on these tokens. Belt + suspenders worth it.
//
// Task #50 — Motion Design System.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import { DURATION, EASE, SPRING, DISTANCE, STAGGER, MOTION } from '@repo/shared';

describe('Motion tokens — DURATION', () => {
  it('exposes the expected duration keys in seconds', () => {
    expect(DURATION.instant).toBe(0);
    expect(DURATION.fast).toBe(0.1);
    expect(DURATION.quick).toBe(0.15);
    expect(DURATION.base).toBe(0.2);
    expect(DURATION.moderate).toBe(0.3);
    expect(DURATION.slow).toBe(0.5);
    expect(DURATION.slower).toBe(0.85);
  });

  it('all durations are non-negative finite numbers', () => {
    Object.values(DURATION).forEach((d) => {
      expect(typeof d).toBe('number');
      expect(Number.isFinite(d)).toBe(true);
      expect(d).toBeGreaterThanOrEqual(0);
    });
  });

  it('durations are monotonically non-decreasing in declared order', () => {
    const order = [
      DURATION.instant,
      DURATION.fast,
      DURATION.quick,
      DURATION.base,
      DURATION.moderate,
      DURATION.slow,
      DURATION.slower,
    ];
    for (let i = 1; i < order.length; i++) {
      expect(order[i]).toBeGreaterThanOrEqual(order[i - 1]!);
    }
  });
});

describe('Motion tokens — EASE', () => {
  const required = [
    'linear',
    'easeOut',
    'easeIn',
    'easeInOut',
    'smoothOut',
    'expoOut',
    'anticipate',
  ] as const;

  it('exposes all required easing curves', () => {
    required.forEach((key) => {
      expect(EASE[key]).toBeDefined();
    });
  });

  it('every curve is a 4-tuple cubic-bezier array', () => {
    required.forEach((key) => {
      expect(EASE[key]).toHaveLength(4);
      EASE[key].forEach((coord) => {
        expect(typeof coord).toBe('number');
      });
    });
  });

  it('control points are within Framer-acceptable range (no NaN, no Infinity)', () => {
    Object.values(EASE).forEach((curve) => {
      curve.forEach((coord) => {
        expect(Number.isFinite(coord)).toBe(true);
      });
    });
  });
});

describe('Motion tokens — SPRING', () => {
  it('all spring presets declare type "spring" with positive physics', () => {
    Object.values(SPRING).forEach((cfg) => {
      expect(cfg.type).toBe('spring');
      expect(cfg.stiffness).toBeGreaterThan(0);
      expect(cfg.damping).toBeGreaterThan(0);
      expect(cfg.mass).toBeGreaterThan(0);
    });
  });

  it('exposes the four canonical spring presets', () => {
    expect(SPRING.gentle).toBeDefined();
    expect(SPRING.responsive).toBeDefined();
    expect(SPRING.bouncy).toBeDefined();
    expect(SPRING.stiff).toBeDefined();
  });

  it('responsive spring is the Stripe / Linear default (stiffness 400, damping 30)', () => {
    expect(SPRING.responsive.stiffness).toBe(400);
    expect(SPRING.responsive.damping).toBe(30);
  });
});

describe('Motion tokens — DISTANCE', () => {
  it('exposes pixel offsets in strictly ascending order', () => {
    expect(DISTANCE.xs).toBeLessThan(DISTANCE.sm);
    expect(DISTANCE.sm).toBeLessThan(DISTANCE.md);
    expect(DISTANCE.md).toBeLessThan(DISTANCE.lg);
    expect(DISTANCE.lg).toBeLessThan(DISTANCE.xl);
  });

  it('largest entry distance ≤ 24px (motion-sickness safe)', () => {
    // Distances > 24px on entry can trigger vestibular discomfort.
    expect(DISTANCE.xl).toBeLessThanOrEqual(24);
  });

  it('all distances are positive integers', () => {
    Object.values(DISTANCE).forEach((d) => {
      expect(Number.isInteger(d)).toBe(true);
      expect(d).toBeGreaterThan(0);
    });
  });
});

describe('Motion tokens — STAGGER', () => {
  it('exposes stagger intervals between 0.02s and 0.15s', () => {
    Object.values(STAGGER).forEach((s) => {
      expect(s).toBeGreaterThan(0.02);
      expect(s).toBeLessThan(0.15);
    });
  });

  it('intervals are ordered from tight to relaxed', () => {
    expect(STAGGER.tight).toBeLessThan(STAGGER.default);
    expect(STAGGER.default).toBeLessThan(STAGGER.loose);
    expect(STAGGER.loose).toBeLessThan(STAGGER.relaxed);
  });
});

describe('Motion tokens — backward compatibility with legacy MOTION', () => {
  it('preserves MOTION.duration shape from Task #21', () => {
    expect(MOTION.duration.instant).toBe(100);
    expect(MOTION.duration.fast).toBe(150);
    expect(MOTION.duration.normal).toBe(200);
    expect(MOTION.duration.moderate).toBe(300);
    expect(MOTION.duration.slow).toBe(500);
  });

  it('preserves MOTION.css string forms', () => {
    expect(MOTION.css.instant).toBe('100ms');
    expect(MOTION.css.slow).toBe('500ms');
  });

  it('preserves MOTION.easing CSS strings', () => {
    expect(MOTION.easing.default).toContain('cubic-bezier');
    expect(MOTION.easing.easeOut).toContain('cubic-bezier');
    expect(MOTION.easing.easeIn).toContain('cubic-bezier');
    expect(MOTION.easing.spring).toContain('cubic-bezier');
  });

  it('preserves MOTION.transition presets', () => {
    expect(MOTION.transition.default).toContain('200ms');
    expect(MOTION.transition.transform).toContain('transform');
    expect(MOTION.transition.opacity).toContain('opacity');
  });
});
