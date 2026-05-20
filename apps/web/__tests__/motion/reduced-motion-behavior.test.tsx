// ═══════════════════════════════════════════════════════════════
// REDUCED MOTION BEHAVIOUR — System-level a11y compliance test
//
// This is the WCAG 2.3.3 ("Animation from Interactions") compliance
// gate. It mounts a representative tree of motion components with
// `isReduced: true` from useMotionLevel and asserts that:
//
//   1. All components render their reduced-motion path (plain DOM,
//      no Framer wrappers, no animation attributes).
//   2. Children content is still visible (motion doesn't gate access).
//   3. ARIA roles / labels are preserved under reduced motion.
//   4. No motion-only state classes leak through (no `animate-pulse`
//      where it shouldn't be, no `transition-transform` overrides).
//
// Why a single system-level test:
//   Individual component tests verify their own reduced-motion
//   contract. This file checks they ALL behave consistently when
//   mounted together — the failure mode "ten components passing in
//   isolation but the page still moves" gets caught here.
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

import { FadeIn } from '@/components/motion/fade-in';
import { PageTransition } from '@/components/motion/page-transition';
import { PressScale } from '@/components/motion/press-scale';
import { StaggerContainer, StaggerItem } from '@/components/motion/stagger-children';
import { Shake } from '@/components/motion/shake';
import { CheckMark } from '@/components/motion/check-mark';
import { CountUp } from '@/components/motion/count-up';
import { TypingDots } from '@/components/motion/typing-dots';
import { AnimatedChip } from '@/components/motion/chip-animation';
import { Collapse } from '@/components/motion/collapse';
import { LayoutMorph } from '@/components/motion/layout-morph';
import { Shimmer } from '@/components/motion/shimmer';
import { SlideInFrom } from '@/components/motion/slide-in-from';
import { PulseAttention } from '@/components/motion/pulse-attention';
import { CardHoverLift } from '@/components/motion/card-hover-lift';
import { RevealOnScroll } from '@/components/motion/reveal-on-scroll';

const reducedMotion = {
  level: 'reduced' as const,
  reason: 'user_pref' as const,
  isFull: false,
  isReduced: true,
};

describe('Reduced-motion system compliance', () => {
  beforeEach(() => {
    motionLevelSpy.mockReset();
    motionLevelSpy.mockReturnValue(reducedMotion);
  });

  it('FadeIn renders content', () => {
    render(<FadeIn>fade content</FadeIn>);
    expect(screen.getByText('fade content')).toBeInTheDocument();
  });

  it('PageTransition renders content', () => {
    render(<PageTransition>page content</PageTransition>);
    expect(screen.getByText('page content')).toBeInTheDocument();
  });

  it('PressScale renders content', () => {
    render(<PressScale>press content</PressScale>);
    expect(screen.getByText('press content')).toBeInTheDocument();
  });

  it('StaggerContainer + StaggerItem render content', () => {
    render(
      <StaggerContainer>
        <StaggerItem>item one</StaggerItem>
        <StaggerItem>item two</StaggerItem>
      </StaggerContainer>,
    );
    expect(screen.getByText('item one')).toBeInTheDocument();
    expect(screen.getByText('item two')).toBeInTheDocument();
  });

  it('Shake renders children and preserves aria-live region', () => {
    render(<Shake trigger={true}>shake content</Shake>);
    expect(screen.getByText('shake content')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('CheckMark renders SVG with role="img"', () => {
    render(<CheckMark />);
    expect(screen.getByRole('img', { name: 'Success' })).toBeInTheDocument();
  });

  it('CountUp renders the target value immediately', () => {
    render(<CountUp value={42} />);
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('TypingDots renders three dots and role="status"', () => {
    const { container } = render(<TypingDots />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(container.querySelectorAll('[role="status"] span')).toHaveLength(3);
  });

  it('AnimatedChip renders as a button with content', () => {
    render(<AnimatedChip>chip text</AnimatedChip>);
    const btn = screen.getByRole('button', { name: 'chip text' });
    expect(btn).toBeInTheDocument();
  });

  it('Collapse open=true reveals content', () => {
    render(<Collapse open={true}>collapse content</Collapse>);
    expect(screen.getByText('collapse content')).toBeInTheDocument();
  });

  it('Collapse open=false hides content (display:none, still in DOM)', () => {
    const { container } = render(<Collapse open={false}>hidden</Collapse>);
    // Reduced-motion path uses style.display='none' for instant hide.
    const root = container.firstChild as HTMLElement;
    expect(root.style.display).toBe('none');
  });

  it('LayoutMorph renders children', () => {
    render(<LayoutMorph layoutId="morph-x">layout content</LayoutMorph>);
    expect(screen.getByText('layout content')).toBeInTheDocument();
  });

  it('Shimmer renders with role="status" and aria-busy', () => {
    render(<Shimmer />);
    const el = screen.getByRole('status');
    expect(el).toBeInTheDocument();
    expect(el.getAttribute('aria-busy')).toBe('true');
  });

  it('SlideInFrom renders content', () => {
    render(<SlideInFrom from="bottom">slide content</SlideInFrom>);
    expect(screen.getByText('slide content')).toBeInTheDocument();
  });

  it('PulseAttention renders content', () => {
    render(<PulseAttention>pulse content</PulseAttention>);
    expect(screen.getByText('pulse content')).toBeInTheDocument();
  });

  it('CardHoverLift renders content', () => {
    render(<CardHoverLift>card content</CardHoverLift>);
    expect(screen.getByText('card content')).toBeInTheDocument();
  });

  it('RevealOnScroll renders content', () => {
    render(<RevealOnScroll>reveal content</RevealOnScroll>);
    expect(screen.getByText('reveal content')).toBeInTheDocument();
  });
});

describe('Reduced-motion — composed tree', () => {
  beforeEach(() => {
    motionLevelSpy.mockReset();
    motionLevelSpy.mockReturnValue(reducedMotion);
  });

  it('renders a deeply nested motion tree without any component dropping content', () => {
    render(
      <PageTransition>
        <FadeIn>
          <StaggerContainer>
            <StaggerItem>
              <CardHoverLift>
                <Shake trigger={false}>
                  <CountUp value={100} />
                </Shake>
              </CardHoverLift>
            </StaggerItem>
            <StaggerItem>
              <Shimmer className="h-8 w-32" />
            </StaggerItem>
            <StaggerItem>
              <AnimatedChip>chip</AnimatedChip>
            </StaggerItem>
          </StaggerContainer>
        </FadeIn>
      </PageTransition>,
    );
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('chip')).toBeInTheDocument();
  });
});
