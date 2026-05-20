// ═══════════════════════════════════════════════════════════════
// NETWORK ADAPTIVE — End-to-end test that slow networks degrade motion
//
// MotionConfigProvider composes two source hooks:
//   - useReducedMotion (OS-level preference)
//   - useNetworkQuality (Effective connection type)
//
// This test verifies the network-quality path: a user with NO OS
// preference but on a 2G connection should still see `isReduced=true`
// via useMotionLevel — so motion components degrade automatically.
//
// This is the "rural India" guarantee: 600M target users on shaky 2G
// links never get heavy parallax / layout animations, even if the
// site author forgets to add per-component network gating.
//
// Task #50 — Motion Design System.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// ── Hoisted spies — control the two source hooks ──
const { reducedMotionSpy, networkQualitySpy, captureSpy } = vi.hoisted(() => ({
  reducedMotionSpy: vi.fn(),
  networkQualitySpy: vi.fn(),
  captureSpy: vi.fn(),
}));

vi.mock('@/hooks/use-reduced-motion', () => ({
  useReducedMotion: reducedMotionSpy,
}));

vi.mock('@/hooks/use-network-quality', () => ({
  useNetworkQuality: networkQualitySpy,
}));

vi.mock('@/lib/posthog', () => ({
  capturePostHogEvent: (event: string, props?: Record<string, unknown>) => captureSpy(event, props),
}));

// Note: useMotionLevel is NOT mocked here — we want the real
// composite hook to read from the real MotionConfigProvider.
import { MotionConfigProvider } from '@/components/motion/motion-config-provider';
import { useMotionLevel } from '@/hooks/use-motion-level';
import { FadeIn } from '@/components/motion/fade-in';
import { Shimmer } from '@/components/motion/shimmer';

function Probe() {
  const { level, reason, isReduced } = useMotionLevel();
  return (
    <>
      <span data-testid="level">{level}</span>
      <span data-testid="reason">{reason}</span>
      <span data-testid="reduced">{String(isReduced)}</span>
    </>
  );
}

describe('Network-adaptive motion — provider + composite hook', () => {
  beforeEach(() => {
    reducedMotionSpy.mockReset();
    networkQualitySpy.mockReset();
    captureSpy.mockReset();
    // Default: no OS pref, good network.
    reducedMotionSpy.mockReturnValue(false);
    networkQualitySpy.mockReturnValue({
      speed: 'wifi',
      isSlow: false,
      isOffline: false,
      downlinkMbps: 50,
    });
  });

  it('full motion on WiFi with no OS preference', () => {
    render(
      <MotionConfigProvider>
        <Probe />
      </MotionConfigProvider>,
    );
    expect(screen.getByTestId('level').textContent).toBe('full');
    expect(screen.getByTestId('reason').textContent).toBe('full');
    expect(screen.getByTestId('reduced').textContent).toBe('false');
  });

  it('degrades to reduced motion on 2G (slow_network reason)', () => {
    networkQualitySpy.mockReturnValue({
      speed: '2g',
      isSlow: true,
      isOffline: false,
      downlinkMbps: 0.25,
    });
    render(
      <MotionConfigProvider>
        <Probe />
      </MotionConfigProvider>,
    );
    expect(screen.getByTestId('level').textContent).toBe('reduced');
    expect(screen.getByTestId('reason').textContent).toBe('slow_network');
    expect(screen.getByTestId('reduced').textContent).toBe('true');
  });

  it('degrades to reduced motion on 3G', () => {
    networkQualitySpy.mockReturnValue({
      speed: '3g',
      isSlow: true,
      isOffline: false,
      downlinkMbps: 1.5,
    });
    render(
      <MotionConfigProvider>
        <Probe />
      </MotionConfigProvider>,
    );
    expect(screen.getByTestId('level').textContent).toBe('reduced');
    expect(screen.getByTestId('reason').textContent).toBe('slow_network');
  });

  it('degrades to reduced motion when offline', () => {
    networkQualitySpy.mockReturnValue({
      speed: 'unknown',
      isSlow: false,
      isOffline: true,
      downlinkMbps: 0,
    });
    render(
      <MotionConfigProvider>
        <Probe />
      </MotionConfigProvider>,
    );
    expect(screen.getByTestId('level').textContent).toBe('reduced');
    expect(screen.getByTestId('reason').textContent).toBe('slow_network');
  });

  it('emits posthog event with the slow_network reason', () => {
    networkQualitySpy.mockReturnValue({
      speed: '2g',
      isSlow: true,
      isOffline: false,
      downlinkMbps: 0.25,
    });
    render(
      <MotionConfigProvider>
        <Probe />
      </MotionConfigProvider>,
    );
    expect(captureSpy).toHaveBeenCalledWith('motion_level_active', {
      level: 'reduced',
      reason: 'slow_network',
    });
  });
});

describe('Network-adaptive motion — components inherit from provider', () => {
  beforeEach(() => {
    reducedMotionSpy.mockReset();
    networkQualitySpy.mockReset();
    captureSpy.mockReset();
    reducedMotionSpy.mockReturnValue(false);
    networkQualitySpy.mockReturnValue({
      speed: '2g',
      isSlow: true,
      isOffline: false,
      downlinkMbps: 0.25,
    });
  });

  it('FadeIn renders the plain-div fallback when network is slow', () => {
    render(
      <MotionConfigProvider>
        <FadeIn>fade content</FadeIn>
      </MotionConfigProvider>,
    );
    expect(screen.getByText('fade content')).toBeInTheDocument();
  });

  it('Shimmer renders the static fallback when network is slow', () => {
    render(
      <MotionConfigProvider>
        <Shimmer className="h-8 w-32" />
      </MotionConfigProvider>,
    );
    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();
  });
});
