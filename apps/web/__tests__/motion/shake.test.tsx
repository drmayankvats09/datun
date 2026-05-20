// ═══════════════════════════════════════════════════════════════
// SHAKE — Component tests (Task #50)
//
// Verifies:
//   1. Renders children
//   2. ARIA-live region announces only when `trigger` is true
//   3. Custom `announceText` is used
//   4. Reduced motion: still renders content + ARIA, no shake call
//   5. False → true transition triggers shake (controls.start)
//   6. True → true (re-renders with trigger still true) does NOT
//      re-trigger shake (edge-detection contract)
//
// Mock strategy:
//   - Mock `motion.*` to render as a plain element — sidesteps
//     framer-motion's animation feature pipeline which would call
//     `controls.subscribe()` on a real instance.
//   - Mock `useAnimationControls` to return a spy-able object with
//     a complete interface (subscribe + mount + set + stop + start)
//     so Framer's `useVisualElement` internals don't TypeError if
//     they touch any hook return value.
//   - Framer-only props (variants/initial/animate/exit/transition
//     /whileHover/whileTap/whileInView/viewport/layout/layoutId)
//     are filtered out at runtime via a const Set — no unused
//     destructure variables, ESLint-clean.
//
// Task #50 — Motion Design System.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';

// ── Hoisted spies ──
const { motionLevelSpy, controlsStartSpy } = vi.hoisted(() => ({
  motionLevelSpy: vi.fn(),
  controlsStartSpy: vi.fn(),
}));

// Mock @/hooks barrel — only useMotionLevel is consumed by Shake.
vi.mock('@/hooks', () => ({
  useMotionLevel: motionLevelSpy,
}));

// Set of framer-motion-only props that must be stripped before
// forwarding to the DOM element (React would warn about unknown
// HTML attributes otherwise).
const FRAMER_ONLY_PROPS = new Set([
  'variants',
  'initial',
  'animate',
  'exit',
  'transition',
  'whileHover',
  'whileTap',
  'whileInView',
  'whileFocus',
  'whileDrag',
  'viewport',
  'layout',
  'layoutId',
  'layoutDependency',
  'drag',
  'dragConstraints',
  'dragElastic',
  'dragMomentum',
  'onAnimationStart',
  'onAnimationComplete',
  'onUpdate',
  'onHoverStart',
  'onHoverEnd',
  'onTapStart',
  'onTap',
  'onTapCancel',
  'onDragStart',
  'onDrag',
  'onDragEnd',
  'onViewportEnter',
  'onViewportLeave',
  'custom',
]);

function stripFramerProps(props: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(props)) {
    if (!FRAMER_ONLY_PROPS.has(key)) {
      out[key] = props[key];
    }
  }
  return out;
}

vi.mock('framer-motion', () => {
  const Passthrough = React.forwardRef<
    HTMLElement,
    React.HTMLAttributes<HTMLElement> & Record<string, unknown>
  >(function Passthrough(props, ref) {
    const cleaned = stripFramerProps(props);
    return React.createElement('div', { ...cleaned, ref });
  });

  return {
    motion: new Proxy(
      {},
      {
        get: () => Passthrough,
      },
    ),
    m: new Proxy(
      {},
      {
        get: () => Passthrough,
      },
    ),
    AnimatePresence: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    useAnimationControls: () => ({
      start: (...args: unknown[]) => {
        controlsStartSpy(...args);
        return Promise.resolve();
      },
      stop: vi.fn(),
      set: vi.fn(),
      mount: vi.fn(),
      subscribe: () => () => undefined,
    }),
    useMotionValue: (v: unknown) => ({
      get: () => v,
      set: vi.fn(),
      subscribe: () => () => undefined,
      on: () => () => undefined,
    }),
    useReducedMotion: () => false,
    MotionConfig: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    LazyMotion: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    domAnimation: {},
  };
});

import { Shake } from '@/components/motion/shake';

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

describe('Shake — rendering', () => {
  beforeEach(() => {
    motionLevelSpy.mockReset();
    controlsStartSpy.mockReset();
    motionLevelSpy.mockReturnValue(fullMotion);
  });

  it('renders children', () => {
    render(<Shake trigger={false}>shake content</Shake>);
    expect(screen.getByText('shake content')).toBeInTheDocument();
  });

  it('renders children when reduced motion is active', () => {
    motionLevelSpy.mockReturnValue(reducedMotion);
    render(<Shake trigger={false}>shake content</Shake>);
    expect(screen.getByText('shake content')).toBeInTheDocument();
  });
});

describe('Shake — ARIA announcements', () => {
  beforeEach(() => {
    motionLevelSpy.mockReset();
    controlsStartSpy.mockReset();
    motionLevelSpy.mockReturnValue(fullMotion);
  });

  it('renders an aria-live status region', () => {
    render(<Shake trigger={false}>x</Shake>);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
  });

  it('status region is empty when trigger is false', () => {
    render(<Shake trigger={false}>x</Shake>);
    expect(screen.getByRole('status').textContent).toBe('');
  });

  it('status region announces default text when trigger is true', () => {
    render(<Shake trigger={true}>x</Shake>);
    expect(screen.getByRole('status').textContent).toBe('Validation error');
  });

  it('status region uses custom announceText when provided', () => {
    render(
      <Shake trigger={true} announceText="Invalid OTP">
        x
      </Shake>,
    );
    expect(screen.getByRole('status').textContent).toBe('Invalid OTP');
  });
});

describe('Shake — edge detection', () => {
  beforeEach(() => {
    motionLevelSpy.mockReset();
    controlsStartSpy.mockReset();
    motionLevelSpy.mockReturnValue(fullMotion);
  });

  it('does NOT fire shake on initial render even if trigger=true', () => {
    // The ref tracks previous=current on first render, so trigger=true
    // initially must NOT fire — preventing a phantom shake on first
    // paint. Verifies the implementation initialises prevTrigger to
    // the current trigger value.
    render(<Shake trigger={true}>x</Shake>);
    expect(controlsStartSpy).not.toHaveBeenCalled();
  });

  it('fires shake on a false → true transition', () => {
    const { rerender } = render(<Shake trigger={false}>x</Shake>);
    expect(controlsStartSpy).not.toHaveBeenCalled();

    rerender(<Shake trigger={true}>x</Shake>);
    expect(controlsStartSpy).toHaveBeenCalledTimes(1);
    expect(controlsStartSpy).toHaveBeenCalledWith('shake');
  });

  it('does NOT fire shake on consecutive true renders', () => {
    const { rerender } = render(<Shake trigger={false}>x</Shake>);
    rerender(<Shake trigger={true}>x</Shake>);
    expect(controlsStartSpy).toHaveBeenCalledTimes(1);

    // Re-render with trigger still true — should not re-shake.
    rerender(<Shake trigger={true}>x</Shake>);
    expect(controlsStartSpy).toHaveBeenCalledTimes(1);
  });

  it('does NOT fire shake when reduced motion is active', () => {
    motionLevelSpy.mockReturnValue(reducedMotion);
    const { rerender } = render(<Shake trigger={false}>x</Shake>);
    rerender(<Shake trigger={true}>x</Shake>);
    expect(controlsStartSpy).not.toHaveBeenCalled();
  });
});
