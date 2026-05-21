// ═══════════════════════════════════════════════════════════════
// DATA TABLE SKELETON — Behavior tests
//
// What this file guarantees:
//   • Default render produces 5 columns × 8 rows = 45 placeholder
//     cells (5 header + 40 body) in addition to the outer wrapper.
//   • Custom `cols` and `rows` props change the cell count
//     accordingly (cols × (rows + 1)).
//   • The outer wrapper carries the ARIA shape consumed by screen
//     readers and visual-regression tooling:
//         role="status", aria-busy="true", aria-label.
//   • `className` overrides land on the outer wrapper.
//
// Why this file matters (regression coverage):
//   DataTableSkeleton is the most reused leaf skeleton in the
//   project — admin/security/violations, admin/flags, future
//   clinic patient rosters, lab orders, pharmacy carts. A silent
//   cell-count regression would distort every page it touches.
// ═══════════════════════════════════════════════════════════════

import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';

import { DataTableSkeleton } from '../../../components/feedback/skeletons';

/**
 * Counts shadcn `Skeleton` placeholders rendered inside the
 * container. shadcn marks every pulse Skeleton with
 * `data-slot="skeleton"`, which is the most stable selector
 * available (shimmer variant uses Framer Motion and renders a
 * different DOM shape, so these tests use the default `pulse`
 * variant — explicitly).
 */
function countSkeletons(container: HTMLElement): number {
  return container.querySelectorAll('[data-slot="skeleton"]').length;
}

describe('DataTableSkeleton', () => {
  describe('default props (cols=5, rows=8)', () => {
    it('renders a header row + 8 body rows', () => {
      const { container } = render(<DataTableSkeleton variant="pulse" />);
      // Header: 5 cells. Body: 8 rows × 5 cells = 40. Total = 45.
      expect(countSkeletons(container)).toBe(45);
    });

    it('marks the outer wrapper as a status region', () => {
      const { container } = render(<DataTableSkeleton variant="pulse" />);
      const wrapper = container.firstElementChild;
      expect(wrapper).not.toBeNull();
      expect(wrapper).toHaveAttribute('role', 'status');
      expect(wrapper).toHaveAttribute('aria-busy', 'true');
      expect(wrapper).toHaveAttribute('aria-label', 'Loading table data');
    });
  });

  describe('custom cols + rows', () => {
    it('honors cols=6 and rows=10 (66 placeholders)', () => {
      const { container } = render(<DataTableSkeleton variant="pulse" cols={6} rows={10} />);
      // 6 + 10*6 = 66
      expect(countSkeletons(container)).toBe(66);
    });

    it('honors cols=3 and rows=2 (9 placeholders)', () => {
      const { container } = render(<DataTableSkeleton variant="pulse" cols={3} rows={2} />);
      // 3 + 2*3 = 9
      expect(countSkeletons(container)).toBe(9);
    });

    it('renders the header only when rows=0 (cols placeholders)', () => {
      const { container } = render(<DataTableSkeleton variant="pulse" cols={4} rows={0} />);
      // 4 + 0 = 4
      expect(countSkeletons(container)).toBe(4);
    });
  });

  describe('className override', () => {
    it('merges custom classes onto the outer wrapper', () => {
      const { container } = render(
        <DataTableSkeleton variant="pulse" className="custom-table-skeleton" />,
      );
      const wrapper = container.firstElementChild;
      expect(wrapper).toHaveClass('custom-table-skeleton');
    });

    it('preserves the base wrapper classes when className is set', () => {
      const { container } = render(
        <DataTableSkeleton variant="pulse" className="custom-table-skeleton" />,
      );
      const wrapper = container.firstElementChild;
      // The base class set includes the rounded border + card surface.
      expect(wrapper).toHaveClass('rounded-md');
      expect(wrapper).toHaveClass('border');
      expect(wrapper).toHaveClass('bg-card');
    });
  });
});
