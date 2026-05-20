// ═══════════════════════════════════════════════════════════════
// CHECK MARK — Component tests
//
// Verifies:
//   1. Renders as an <svg> with role="img" + label
//   2. Default aria-label is "Success"
//   3. Custom aria-label is used
//   4. Size presets resolve to 16/24/48 px
//   5. Numeric size override works
//   6. Default color is var(--primary)
//   7. Custom color is applied
//   8. strokeWidth is applied
//   9. Both <circle> and <path> children are rendered
//  10. Reduced-motion path renders the same DOM shape (no animation
//      attributes), so users with motion disabled still see the icon.
//  11. className is forwarded
//
// We don't assert Framer's animation playback (jsdom can't paint),
// but we do verify the rendered DOM and ARIA contracts.
//
// Task #50 — Motion Design System.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// ── Hoisted spy for useMotionLevel ──
const { motionLevelSpy } = vi.hoisted(() => ({
  motionLevelSpy: vi.fn(),
}));

vi.mock('@/hooks', () => ({
  useMotionLevel: motionLevelSpy,
}));

import { CheckMark } from '@/components/motion/check-mark';

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

describe('CheckMark — rendering & semantics', () => {
  beforeEach(() => {
    motionLevelSpy.mockReset();
    motionLevelSpy.mockReturnValue(fullMotion);
  });

  it('renders as an svg with role="img"', () => {
    render(<CheckMark />);
    const el = screen.getByRole('img');
    expect(el.tagName.toLowerCase()).toBe('svg');
  });

  it('uses default aria-label "Success"', () => {
    render(<CheckMark />);
    expect(screen.getByRole('img', { name: 'Success' })).toBeInTheDocument();
  });

  it('accepts a custom aria-label', () => {
    render(<CheckMark ariaLabel="Appointment booked" />);
    expect(screen.getByRole('img', { name: 'Appointment booked' })).toBeInTheDocument();
  });

  it('renders both a circle and a path element', () => {
    const { container } = render(<CheckMark />);
    expect(container.querySelector('circle')).toBeInTheDocument();
    expect(container.querySelector('path')).toBeInTheDocument();
  });

  it('forwards className to the svg', () => {
    render(<CheckMark className="custom-check" />);
    const svg = screen.getByRole('img');
    expect(svg.getAttribute('class')).toContain('custom-check');
  });
});

describe('CheckMark — size resolution', () => {
  beforeEach(() => {
    motionLevelSpy.mockReset();
    motionLevelSpy.mockReturnValue(fullMotion);
  });

  it('resolves size="sm" to 16px', () => {
    render(<CheckMark size="sm" />);
    const svg = screen.getByRole('img');
    expect(svg.getAttribute('width')).toBe('16');
    expect(svg.getAttribute('height')).toBe('16');
  });

  it('resolves size="md" (default) to 24px', () => {
    render(<CheckMark />);
    const svg = screen.getByRole('img');
    expect(svg.getAttribute('width')).toBe('24');
    expect(svg.getAttribute('height')).toBe('24');
  });

  it('resolves size="lg" to 48px', () => {
    render(<CheckMark size="lg" />);
    const svg = screen.getByRole('img');
    expect(svg.getAttribute('width')).toBe('48');
    expect(svg.getAttribute('height')).toBe('48');
  });

  it('accepts a numeric size override', () => {
    render(<CheckMark size={96} />);
    const svg = screen.getByRole('img');
    expect(svg.getAttribute('width')).toBe('96');
    expect(svg.getAttribute('height')).toBe('96');
  });
});

describe('CheckMark — colour & stroke', () => {
  beforeEach(() => {
    motionLevelSpy.mockReset();
    motionLevelSpy.mockReturnValue(fullMotion);
  });

  it('uses CSS variable --primary for stroke by default', () => {
    render(<CheckMark />);
    expect(screen.getByRole('img').getAttribute('stroke')).toBe('var(--primary)');
  });

  it('accepts a custom colour', () => {
    render(<CheckMark color="#10b981" />);
    expect(screen.getByRole('img').getAttribute('stroke')).toBe('#10b981');
  });

  it('applies custom strokeWidth', () => {
    render(<CheckMark strokeWidth={4} />);
    expect(screen.getByRole('img').getAttribute('stroke-width')).toBe('4');
  });

  it('uses default strokeWidth of 3', () => {
    render(<CheckMark />);
    expect(screen.getByRole('img').getAttribute('stroke-width')).toBe('3');
  });
});

describe('CheckMark — reduced motion', () => {
  beforeEach(() => {
    motionLevelSpy.mockReset();
    motionLevelSpy.mockReturnValue(reducedMotion);
  });

  it('still renders an svg with role="img"', () => {
    render(<CheckMark />);
    const el = screen.getByRole('img');
    expect(el.tagName.toLowerCase()).toBe('svg');
  });

  it('still renders both circle and path elements', () => {
    const { container } = render(<CheckMark />);
    expect(container.querySelector('circle')).toBeInTheDocument();
    expect(container.querySelector('path')).toBeInTheDocument();
  });

  it('preserves aria-label under reduced motion', () => {
    render(<CheckMark ariaLabel="Done" />);
    expect(screen.getByRole('img', { name: 'Done' })).toBeInTheDocument();
  });

  it('preserves size, colour and strokeWidth under reduced motion', () => {
    render(<CheckMark size={32} color="#22c55e" strokeWidth={2} />);
    const svg = screen.getByRole('img');
    expect(svg.getAttribute('width')).toBe('32');
    expect(svg.getAttribute('stroke')).toBe('#22c55e');
    expect(svg.getAttribute('stroke-width')).toBe('2');
  });
});
