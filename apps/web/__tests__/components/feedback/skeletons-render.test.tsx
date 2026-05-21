// ═══════════════════════════════════════════════════════════════
// SKELETONS — Smoke tests for every Phase 2 deliverable
//
// What this file guarantees:
//   • Every skeleton mounts cleanly in jsdom without throwing.
//   • Every skeleton renders at least one ARIA status region
//     (role="status"). Screen readers depend on this to announce
//     "loading" to users with assistive tech enabled.
//   • Each skeleton exposes its outer-wrapper aria-label so the
//     announcement is meaningful (not just "loading").
//
// Why this file matters (regression coverage):
//   These twelve skeletons are imported by every route's
//   `loading.tsx`, the feedback barrel, and ~10 page-level
//   surfaces. A silent mount-crash would break every consuming
//   route. The smoke pass is intentionally cheap so it never
//   becomes a CI bottleneck — it asserts the absolute minimum
//   contract: "mounts + announces loading".
//
//   Behavioural assertions (cell counts, row counts, copy) live
//   in the per-skeleton suites alongside the components they test.
// ═══════════════════════════════════════════════════════════════

import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';

import {
  AdminGateSkeleton,
  AuthFormSkeleton,
  ChartSkeleton,
  ClinicCardSkeleton,
  ConsultationCardSkeleton,
  ConsultationLoadingSkeleton,
  DataTableSkeleton,
  DocumentSkeleton,
  DrawerSkeleton,
  MessageSkeleton,
  SecurityDashboardSkeleton,
  StatCardSkeleton,
} from '../../../components/feedback/skeletons';

/**
 * Helper: read the outer wrapper of a freshly-rendered skeleton
 * and assert the ARIA contract. Composite skeletons may contain
 * multiple nested status regions — that is fine; we only assert
 * the OUTERMOST one to keep this smoke test stable.
 */
function expectOuterStatus(container: HTMLElement, expectedAriaLabel: string): void {
  const wrapper = container.firstElementChild;
  expect(wrapper).not.toBeNull();
  expect(wrapper).toHaveAttribute('role', 'status');
  expect(wrapper).toHaveAttribute('aria-busy', 'true');
  expect(wrapper).toHaveAttribute('aria-label', expectedAriaLabel);
}

describe('Skeleton smoke tests — Phase 2 deliverables', () => {
  it('DataTableSkeleton mounts and announces loading', () => {
    const { container } = render(<DataTableSkeleton variant="pulse" />);
    expectOuterStatus(container, 'Loading table data');
  });

  it('ConsultationCardSkeleton mounts and announces loading', () => {
    const { container } = render(<ConsultationCardSkeleton />);
    expectOuterStatus(container, 'Loading consultations');
  });

  it('MessageSkeleton (AI) mounts and announces loading', () => {
    const { container } = render(<MessageSkeleton role="ai" />);
    expectOuterStatus(container, 'Loading message');
  });

  it('MessageSkeleton (user) mounts and announces loading', () => {
    const { container } = render(<MessageSkeleton role="user" />);
    expectOuterStatus(container, 'Loading message');
  });

  it('ClinicCardSkeleton mounts and announces loading', () => {
    const { container } = render(<ClinicCardSkeleton />);
    expectOuterStatus(container, 'Loading clinics');
  });

  it('StatCardSkeleton mounts and announces loading', () => {
    const { container } = render(<StatCardSkeleton />);
    expectOuterStatus(container, 'Loading metrics');
  });

  it('ChartSkeleton mounts and announces loading', () => {
    const { container } = render(<ChartSkeleton />);
    expectOuterStatus(container, 'Loading chart');
  });

  it('AuthFormSkeleton mounts and announces loading', () => {
    const { container } = render(<AuthFormSkeleton />);
    expectOuterStatus(container, 'Loading sign-in form');
  });

  it('AuthFormSkeleton (no OAuth) mounts and announces loading', () => {
    const { container } = render(<AuthFormSkeleton showOAuth={false} />);
    expectOuterStatus(container, 'Loading sign-in form');
  });

  it('DocumentSkeleton mounts and announces loading', () => {
    const { container } = render(<DocumentSkeleton />);
    expectOuterStatus(container, 'Loading document');
  });

  it('DrawerSkeleton mounts and announces loading', () => {
    const { container } = render(<DrawerSkeleton />);
    expectOuterStatus(container, 'Loading details');
  });

  it('SecurityDashboardSkeleton mounts and announces loading', () => {
    const { container } = render(<SecurityDashboardSkeleton />);
    expectOuterStatus(container, 'Loading security dashboard');
  });

  it('AdminGateSkeleton mounts and announces loading', () => {
    const { container } = render(<AdminGateSkeleton />);
    expectOuterStatus(container, 'Verifying admin access');
  });

  it('ConsultationLoadingSkeleton mounts and announces loading', () => {
    const { container } = render(<ConsultationLoadingSkeleton />);
    expectOuterStatus(container, 'Loading consultation');
  });
});
