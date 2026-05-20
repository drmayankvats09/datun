// ═══════════════════════════════════════════════════════════════
// usePressFeedback — Hook tests
//
// Verifies:
//   1. Returns controls + press / release / pulse methods
//   2. press() and release() invoke controls.start with expected params
//   3. pulse() chains press → release
//   4. Reduced motion: press/pulse are no-ops; release snaps to scale 1
//   5. Custom scale + spring are forwarded to controls.start
//
// Mock paths use the @-alias form (same module identifier as the
// hook's relative import resolves to). Relative dot-paths would be
// interpreted from the TEST file's location, which is wrong.
//
// Task #50 — Motion Design System.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ── Hoisted spies ──
const { motionLevelSpy, controlsStartSpy } = vi.hoisted(() => ({
  motionLevelSpy: vi.fn(),
  controlsStartSpy: vi.fn(),
}));

// usePressFeedback imports `./use-motion-level` from inside
// apps/web/hooks/. Resolved absolute module ID is the same as
// `@/hooks/use-motion-level`, so mocking either path intercepts
// the same module. We use the @-alias for clarity.
vi.mock('@/hooks/use-motion-level', () => ({
  useMotionLevel: motionLevelSpy,
}));

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion');
  return {
    ...actual,
    useAnimationControls: () => ({
      start: (...args: unknown[]) => {
        controlsStartSpy(...args);
        return Promise.resolve();
      },
      stop: vi.fn(),
      set: vi.fn(),
      mount: vi.fn(),
    }),
  };
});

import { usePressFeedback } from '@/hooks/use-press-feedback';

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

describe('usePressFeedback — full motion', () => {
  beforeEach(() => {
    motionLevelSpy.mockReset();
    controlsStartSpy.mockReset();
    motionLevelSpy.mockReturnValue(fullMotion);
  });

  it('returns controls, press, release, and pulse', () => {
    const { result } = renderHook(() => usePressFeedback());
    expect(result.current.controls).toBeDefined();
    expect(typeof result.current.press).toBe('function');
    expect(typeof result.current.release).toBe('function');
    expect(typeof result.current.pulse).toBe('function');
  });

  it('press() invokes controls.start with default scale 0.97', () => {
    const { result } = renderHook(() => usePressFeedback());
    act(() => {
      result.current.press();
    });
    expect(controlsStartSpy).toHaveBeenCalledTimes(1);
    const [callArg] = controlsStartSpy.mock.calls[0]!;
    expect((callArg as { scale: number }).scale).toBe(0.97);
  });

  it('press() respects a custom scale option', () => {
    const { result } = renderHook(() => usePressFeedback({ scale: 0.9 }));
    act(() => {
      result.current.press();
    });
    const [callArg] = controlsStartSpy.mock.calls[0]!;
    expect((callArg as { scale: number }).scale).toBe(0.9);
  });

  it('release() invokes controls.start with scale 1', () => {
    const { result } = renderHook(() => usePressFeedback());
    act(() => {
      result.current.release();
    });
    expect(controlsStartSpy).toHaveBeenCalledTimes(1);
    const [callArg] = controlsStartSpy.mock.calls[0]!;
    expect((callArg as { scale: number }).scale).toBe(1);
  });

  it('pulse() invokes controls.start twice (press then release)', async () => {
    const { result } = renderHook(() => usePressFeedback());
    await act(async () => {
      await result.current.pulse();
    });
    expect(controlsStartSpy).toHaveBeenCalledTimes(2);
    const [first] = controlsStartSpy.mock.calls[0]!;
    const [second] = controlsStartSpy.mock.calls[1]!;
    expect((first as { scale: number }).scale).toBe(0.97);
    expect((second as { scale: number }).scale).toBe(1);
  });

  it('press() forwards a custom spring config to controls.start', () => {
    const customSpring = {
      type: 'spring' as const,
      stiffness: 200,
      damping: 25,
      mass: 1,
    };
    const { result } = renderHook(() => usePressFeedback({ spring: customSpring }));
    act(() => {
      result.current.press();
    });
    const [callArg] = controlsStartSpy.mock.calls[0]!;
    expect((callArg as { transition: unknown }).transition).toEqual(customSpring);
  });
});

describe('usePressFeedback — reduced motion', () => {
  beforeEach(() => {
    motionLevelSpy.mockReset();
    controlsStartSpy.mockReset();
    motionLevelSpy.mockReturnValue(reducedMotion);
  });

  it('press() is a no-op (does not invoke controls.start)', () => {
    const { result } = renderHook(() => usePressFeedback());
    act(() => {
      result.current.press();
    });
    expect(controlsStartSpy).not.toHaveBeenCalled();
  });

  it('release() snaps scale to 1 instantly (zero-duration transition)', () => {
    const { result } = renderHook(() => usePressFeedback());
    act(() => {
      result.current.release();
    });
    // Under reduced motion, release() still calls controls.start —
    // but with `{ duration: 0 }`, so any in-progress press state is
    // un-stuck instantly without animating.
    expect(controlsStartSpy).toHaveBeenCalledTimes(1);
    const [callArg] = controlsStartSpy.mock.calls[0]!;
    expect((callArg as { scale: number }).scale).toBe(1);
    expect((callArg as { transition: { duration: number } }).transition.duration).toBe(0);
  });

  it('pulse() is a no-op under reduced motion', async () => {
    const { result } = renderHook(() => usePressFeedback());
    await act(async () => {
      await result.current.pulse();
    });
    expect(controlsStartSpy).not.toHaveBeenCalled();
  });
});
