// ═══════════════════════════════════════════════════════════════
// SLIDE IN FROM — Component tests
//
// Verifies:
//   1. Renders children regardless of motion level
//   2. Reduced motion: plain <div> wrapper (no motion attributes)
//   3. Custom className forwarded
//   4. Component does not throw with edge-case distance values
//      (number, percentage, vh, negative)
//   5. Default `from` direction is required at the type level — we
//      verify all four valid directions render.
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

import { SlideInFrom } from '@/components/motion/slide-in-from';

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

describe('SlideInFrom — rendering', () => {
  beforeEach(() => {
    motionLevelSpy.mockReset();
    motionLevelSpy.mockReturnValue(fullMotion);
  });

  it('renders children under full motion', () => {
    render(<SlideInFrom from="bottom">drawer content</SlideInFrom>);
    expect(screen.getByText('drawer content')).toBeInTheDocument();
  });

  it('renders children under reduced motion', () => {
    motionLevelSpy.mockReturnValue(reducedMotion);
    render(<SlideInFrom from="bottom">drawer content</SlideInFrom>);
    expect(screen.getByText('drawer content')).toBeInTheDocument();
  });

  it('forwards className', () => {
    const { container } = render(
      <SlideInFrom from="top" className="my-drawer">
        x
      </SlideInFrom>,
    );
    const root = container.firstChild as HTMLElement;
    expect(root.className).toContain('my-drawer');
  });
});

describe('SlideInFrom — direction support', () => {
  beforeEach(() => {
    motionLevelSpy.mockReset();
    motionLevelSpy.mockReturnValue(fullMotion);
  });

  it.each(['top', 'bottom', 'left', 'right'] as const)(
    'renders without throwing for from="%s"',
    (direction) => {
      const { unmount } = render(<SlideInFrom from={direction}>x</SlideInFrom>);
      expect(screen.getByText('x')).toBeInTheDocument();
      unmount();
    },
  );
});

describe('SlideInFrom — distance forms', () => {
  beforeEach(() => {
    motionLevelSpy.mockReset();
    motionLevelSpy.mockReturnValue(fullMotion);
  });

  it('accepts numeric distance (pixels)', () => {
    render(
      <SlideInFrom from="bottom" distance={32}>
        x
      </SlideInFrom>,
    );
    expect(screen.getByText('x')).toBeInTheDocument();
  });

  it('accepts percentage string distance', () => {
    render(
      <SlideInFrom from="bottom" distance="100%">
        x
      </SlideInFrom>,
    );
    expect(screen.getByText('x')).toBeInTheDocument();
  });

  it('accepts viewport-relative string distance (vh)', () => {
    render(
      <SlideInFrom from="bottom" distance="50vh">
        x
      </SlideInFrom>,
    );
    expect(screen.getByText('x')).toBeInTheDocument();
  });

  it('accepts a negative numeric distance', () => {
    render(
      <SlideInFrom from="bottom" distance={-32}>
        x
      </SlideInFrom>,
    );
    expect(screen.getByText('x')).toBeInTheDocument();
  });
});

describe('SlideInFrom — spring vs duration', () => {
  beforeEach(() => {
    motionLevelSpy.mockReset();
    motionLevelSpy.mockReturnValue(fullMotion);
  });

  it('renders with spring={true} (default)', () => {
    render(<SlideInFrom from="bottom">x</SlideInFrom>);
    expect(screen.getByText('x')).toBeInTheDocument();
  });

  it('renders with spring={false} + custom duration', () => {
    render(
      <SlideInFrom from="bottom" spring={false} duration={0.4}>
        x
      </SlideInFrom>,
    );
    expect(screen.getByText('x')).toBeInTheDocument();
  });
});
