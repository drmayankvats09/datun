// ═══════════════════════════════════════════════════════════════
// COUNT UP — Component tests
//
// Verifies:
//   1. Renders an aria-live region (assistive tech announces final
//      value).
//   2. Initial render shows formatted zero (Indian numbering by
//      default).
//   3. Reduced motion: jumps straight to the target value on mount.
//   4. Custom `format` callback is used when provided.
//   5. Custom `locale` produces the right Intl grouping.
//   6. `onComplete` fires under reduced motion (synchronously).
//   7. `className` is forwarded.
//
// What we DON'T assert: the actual frame-by-frame animation progress
// through values. jsdom has no real requestAnimationFrame paint
// pipeline; testing that property would be brittle. Reduced-motion
// path gives us deterministic coverage of the final-value contract.
//
// Task #50 — Motion Design System.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// ── Hoisted spy ──
const { motionLevelSpy } = vi.hoisted(() => ({
  motionLevelSpy: vi.fn(),
}));

vi.mock('@/hooks', () => ({
  useMotionLevel: motionLevelSpy,
}));

import { CountUp } from '@/components/motion/count-up';

const fullMotion = {
  level: 'full' as const,
  reason: 'full' as const,
  isFull: true,
  isReduced: false,
};

const reducedMotion = {
  level: 'reduced' as const,
  reason: 'user_pref' as const,
  isFull: false,
  isReduced: true,
};

describe('CountUp — ARIA & rendering', () => {
  beforeEach(() => {
    motionLevelSpy.mockReset();
    motionLevelSpy.mockReturnValue(fullMotion);
  });

  it('renders an aria-live polite region', () => {
    render(<CountUp value={100} />);
    const region = screen.getByText(/^0$|^100$/);
    // aria-live attribute lives on the rendered span; assert via parent.
    const parent = region.parentElement ?? region;
    // The motion.span itself is the live region.
    expect(region.getAttribute('aria-live') || parent.getAttribute('aria-live')).toBe('polite');
  });

  it('marks the live region as aria-atomic="true"', () => {
    const { container } = render(<CountUp value={1} />);
    const span = container.querySelector('[aria-live]');
    expect(span?.getAttribute('aria-atomic')).toBe('true');
  });

  it('applies className to the live region', () => {
    const { container } = render(<CountUp value={1} className="text-3xl font-bold" />);
    const span = container.querySelector('[aria-live]');
    expect(span?.className).toContain('text-3xl');
    expect(span?.className).toContain('font-bold');
  });
});

describe('CountUp — reduced motion', () => {
  beforeEach(() => {
    motionLevelSpy.mockReset();
    motionLevelSpy.mockReturnValue(reducedMotion);
  });

  it('renders the target value immediately (no animation)', () => {
    render(<CountUp value={72} />);
    // Indian numbering for 72 is just "72".
    expect(screen.getByText('72')).toBeInTheDocument();
  });

  it('renders a large value with Indian grouping by default', () => {
    render(<CountUp value={123456} />);
    // 'en-IN' formats 123456 as "1,23,456".
    expect(screen.getByText('1,23,456')).toBeInTheDocument();
  });

  it('renders zero correctly', () => {
    render(<CountUp value={0} />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('respects a custom locale (en-US grouping)', () => {
    render(<CountUp value={1234567} locale="en-US" />);
    // 'en-US' formats 1234567 as "1,234,567".
    expect(screen.getByText('1,234,567')).toBeInTheDocument();
  });

  it('uses a custom format function when provided', () => {
    const format = (n: number) => `${n}%`;
    render(<CountUp value={87} format={format} />);
    expect(screen.getByText('87%')).toBeInTheDocument();
  });

  it('fires onComplete under reduced motion (synchronous end)', () => {
    const onComplete = vi.fn();
    render(<CountUp value={50} onComplete={onComplete} />);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});

describe('CountUp — full motion', () => {
  beforeEach(() => {
    motionLevelSpy.mockReset();
    motionLevelSpy.mockReturnValue(fullMotion);
  });

  it('renders an initial value of 0 before the animation runs', () => {
    // First synchronous render is before useEffect schedules the
    // animation, so we should see the formatted starting value.
    render(<CountUp value={1000} />);
    // 'en-IN' formats 0 as "0".
    expect(screen.getByText('0')).toBeInTheDocument();
  });
});
