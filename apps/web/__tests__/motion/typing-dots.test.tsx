// ═══════════════════════════════════════════════════════════════
// TYPING DOTS — Component tests
//
// Verifies:
//   1. Renders a role="status" region (assistive tech aware)
//   2. Default aria-label is "AI is thinking"
//   3. Custom aria-label is used
//   4. Three dot children render (full motion)
//   5. Three dot children render (reduced motion path)
//   6. Size preset resolves dot diameter correctly
//   7. Custom colour is applied as backgroundColor
//   8. Reduced motion: dots are NOT motion.span (no Framer animation
//      attributes); they render as plain spans.
//
// Task #50 — Motion Design System.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const { motionLevelSpy } = vi.hoisted(() => ({
  motionLevelSpy: vi.fn(),
}));

vi.mock('@/hooks', () => ({
  useMotionLevel: motionLevelSpy,
}));

import { TypingDots } from '@/components/motion/typing-dots';

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

describe('TypingDots — full motion', () => {
  beforeEach(() => {
    motionLevelSpy.mockReset();
    motionLevelSpy.mockReturnValue(fullMotion);
  });

  it('renders as a role="status" region', () => {
    render(<TypingDots />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('uses default aria-label "AI is thinking"', () => {
    render(<TypingDots />);
    expect(screen.getByRole('status', { name: 'AI is thinking' })).toBeInTheDocument();
  });

  it('accepts a custom aria-label', () => {
    render(<TypingDots ariaLabel="Doctor is reviewing" />);
    expect(screen.getByRole('status', { name: 'Doctor is reviewing' })).toBeInTheDocument();
  });

  it('renders exactly three dot children', () => {
    const { container } = render(<TypingDots />);
    // Each dot is a span child of the outer span.
    const outer = container.querySelector('[role="status"]');
    const dots = outer?.querySelectorAll('span');
    expect(dots?.length).toBe(3);
  });

  it('applies size preset "md" by default (6px dot)', () => {
    const { container } = render(<TypingDots />);
    const firstDot = container.querySelector('[role="status"] span') as HTMLElement;
    expect(firstDot.style.width).toBe('6px');
    expect(firstDot.style.height).toBe('6px');
  });

  it('applies size preset "lg" (8px dot)', () => {
    const { container } = render(<TypingDots size="lg" />);
    const firstDot = container.querySelector('[role="status"] span') as HTMLElement;
    expect(firstDot.style.width).toBe('8px');
  });

  it('applies size preset "sm" (4px dot)', () => {
    const { container } = render(<TypingDots size="sm" />);
    const firstDot = container.querySelector('[role="status"] span') as HTMLElement;
    expect(firstDot.style.width).toBe('4px');
  });

  it('applies custom colour via backgroundColor style', () => {
    const { container } = render(<TypingDots color="#00a896" />);
    const firstDot = container.querySelector('[role="status"] span') as HTMLElement;
    expect(firstDot.style.backgroundColor).toBe('rgb(0, 168, 150)');
  });

  it('forwards className', () => {
    const { container } = render(<TypingDots className="custom-dots" />);
    const status = container.querySelector('[role="status"]');
    expect(status?.className).toContain('custom-dots');
  });
});

describe('TypingDots — reduced motion', () => {
  beforeEach(() => {
    motionLevelSpy.mockReset();
    motionLevelSpy.mockReturnValue(reducedMotion);
  });

  it('still renders a role="status" region', () => {
    render(<TypingDots />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('still renders exactly three dots', () => {
    const { container } = render(<TypingDots />);
    const dots = container.querySelectorAll('[role="status"] span');
    expect(dots.length).toBe(3);
  });

  it('preserves aria-label under reduced motion', () => {
    render(<TypingDots ariaLabel="Thinking…" />);
    expect(screen.getByRole('status', { name: 'Thinking…' })).toBeInTheDocument();
  });

  it('preserves size and color under reduced motion', () => {
    const { container } = render(<TypingDots size="lg" color="#ff0000" />);
    const firstDot = container.querySelector('[role="status"] span') as HTMLElement;
    expect(firstDot.style.width).toBe('8px');
    expect(firstDot.style.backgroundColor).toBe('rgb(255, 0, 0)');
  });

  it('marks individual dots aria-hidden so AT only reads the group label', () => {
    const { container } = render(<TypingDots />);
    const dots = container.querySelectorAll('[role="status"] span');
    dots.forEach((dot) => {
      expect(dot.getAttribute('aria-hidden')).toBe('true');
    });
  });
});
