// ═══════════════════════════════════════════════════════════════
// USE-PROGRESSIVE-IMAGE-LOAD TESTS — Task #46
//
// jsdom doesn't ship a real IntersectionObserver. The global setup
// (apps/web/__tests__/setup.ts) installs a no-op stub that never
// fires. For THIS hook we need a controllable double — one that
// captures the callback so a test can synthesise an `isIntersecting`
// event. We override the global via vi.stubGlobal() per-test.
//
// Coverage:
//   - priority=true → isInView true immediately, no observer attached
//   - priority=false → waits for intersection, then flips
//   - onImageLoad → flips isLoaded
//   - slow network → reduced lookahead (rootMargin)
//   - Save-Data on → reduced lookahead
//   - unmount → disconnect() called
//   - missing IntersectionObserver → fail-safe loads immediately
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ── Network-quality hook mock (per-test override) ─────────────

const mockNetworkQuality = vi.fn();
vi.mock('../../hooks/use-network-quality', () => ({
  useNetworkQuality: () => mockNetworkQuality(),
}));

// ── Controllable IntersectionObserver double ──────────────────

interface ObserverState {
  callback: IntersectionObserverCallback;
  options: IntersectionObserverInit | undefined;
  observed: Set<Element>;
  disconnected: boolean;
}

let lastObserver: ObserverState | null = null;

class ControllableIntersectionObserver {
  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    lastObserver = {
      callback,
      options,
      observed: new Set(),
      disconnected: false,
    };
  }
  observe(element: Element): void {
    lastObserver?.observed.add(element);
  }
  unobserve(element: Element): void {
    lastObserver?.observed.delete(element);
  }
  disconnect(): void {
    if (lastObserver) lastObserver.disconnected = true;
  }
}

/** Trigger an intersection event for whichever element is observed. */
function fireIntersection(isIntersecting: boolean): void {
  if (!lastObserver) throw new Error('No IntersectionObserver was constructed');
  const entries: IntersectionObserverEntry[] = Array.from(lastObserver.observed).map((target) => ({
    target,
    isIntersecting,
    intersectionRatio: isIntersecting ? 1 : 0,
    time: performance.now(),
    boundingClientRect: target.getBoundingClientRect(),
    intersectionRect: target.getBoundingClientRect(),
    rootBounds: null,
  }));
  lastObserver.callback(entries, lastObserver as unknown as IntersectionObserver);
}

// ── Import under test (after mocks) ───────────────────────────

import { useProgressiveImageLoad } from '../../hooks/use-progressive-image-load';

// ── Helpers ───────────────────────────────────────────────────

function attachRef(result: {
  current: ReturnType<typeof useProgressiveImageLoad>;
}): HTMLDivElement {
  const node = document.createElement('div');
  document.body.appendChild(node);
  act(() => result.current.ref(node));
  return node;
}

beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', ControllableIntersectionObserver);
  lastObserver = null;
  mockNetworkQuality.mockReturnValue({
    speed: '4g',
    isSlow: false,
    isOffline: false,
    downlinkMbps: 10,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ─── Tests ────────────────────────────────────────────────────

describe('useProgressiveImageLoad', () => {
  it('starts with isInView=false and isLoaded=false by default', () => {
    const { result } = renderHook(() => useProgressiveImageLoad());
    expect(result.current.isInView).toBe(false);
    expect(result.current.isLoaded).toBe(false);
  });

  it('priority=true makes isInView true immediately and skips observer', () => {
    const { result } = renderHook(() => useProgressiveImageLoad({ priority: true }));
    expect(result.current.isInView).toBe(true);
    // Even after attaching a ref no observer should have been created.
    attachRef(result);
    expect(lastObserver).toBeNull();
  });

  it('observes a node when ref is attached and priority is false', () => {
    const { result } = renderHook(() => useProgressiveImageLoad());
    const node = attachRef(result);
    expect(lastObserver).not.toBeNull();
    expect(lastObserver?.observed.has(node)).toBe(true);
  });

  it('flips isInView to true when intersection fires', () => {
    const { result } = renderHook(() => useProgressiveImageLoad());
    attachRef(result);
    expect(result.current.isInView).toBe(false);

    act(() => fireIntersection(true));

    expect(result.current.isInView).toBe(true);
    // Hook should self-disconnect after first intersection.
    expect(lastObserver?.disconnected).toBe(true);
  });

  it('ignores non-intersecting events', () => {
    const { result } = renderHook(() => useProgressiveImageLoad());
    attachRef(result);
    act(() => fireIntersection(false));
    expect(result.current.isInView).toBe(false);
  });

  it('uses the default lookahead (1500px) on fast networks', () => {
    const { result } = renderHook(() => useProgressiveImageLoad());
    attachRef(result);
    expect(lastObserver?.options?.rootMargin).toContain('1500');
  });

  it('reduces lookahead on slow networks', () => {
    mockNetworkQuality.mockReturnValue({
      speed: '2g',
      isSlow: true,
      isOffline: false,
      downlinkMbps: 0.1,
    });
    const { result } = renderHook(() => useProgressiveImageLoad());
    attachRef(result);
    const margin = lastObserver?.options?.rootMargin ?? '';
    // Expect a reduced numeric value (anything < 1500 is acceptable).
    const num = parseInt(margin, 10);
    expect(num).toBeLessThan(1500);
  });

  it('honours Save-Data hint via navigator.connection.saveData', () => {
    // Inject Save-Data on navigator.connection. The setup mock doesn't
    // define connection, so we stub it just for this test.
    Object.defineProperty(navigator, 'connection', {
      configurable: true,
      value: { saveData: true, effectiveType: '4g' },
    });
    const { result } = renderHook(() => useProgressiveImageLoad());
    attachRef(result);
    const margin = lastObserver?.options?.rootMargin ?? '';
    const num = parseInt(margin, 10);
    expect(num).toBeLessThan(1500);
    // Clean up the stub.
    Object.defineProperty(navigator, 'connection', { configurable: true, value: undefined });
  });

  it('onImageLoad flips isLoaded', () => {
    const { result } = renderHook(() => useProgressiveImageLoad({ priority: true }));
    expect(result.current.isLoaded).toBe(false);
    act(() => result.current.onImageLoad());
    expect(result.current.isLoaded).toBe(true);
  });

  it('disconnects observer on unmount', () => {
    const { result, unmount } = renderHook(() => useProgressiveImageLoad());
    attachRef(result);
    expect(lastObserver?.disconnected).toBe(false);
    unmount();
    expect(lastObserver?.disconnected).toBe(true);
  });

  it('fail-safe loads when IntersectionObserver is unavailable', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const { result } = renderHook(() => useProgressiveImageLoad());
    attachRef(result);
    // Without IO the hook must mark the image as in-view immediately
    // so the consumer still renders something.
    expect(result.current.isInView).toBe(true);
  });
});
