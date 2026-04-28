// ═══════════════════════════════════════════════════════════════
// GOOGLE ICON TESTS — SVG render + accessibility
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GoogleIcon } from '../../components/google-icon';

describe('GoogleIcon', () => {
  it('renders an SVG element', () => {
    render(<GoogleIcon />);
    const svg = screen.getByRole('img', { name: 'Google' });
    expect(svg).toBeInTheDocument();
    expect(svg.tagName).toBe('svg');
  });

  it('has role="img" and aria-label="Google" for accessibility', () => {
    render(<GoogleIcon />);
    const svg = screen.getByRole('img', { name: 'Google' });
    expect(svg).toHaveAttribute('aria-label', 'Google');
  });

  it('applies default className', () => {
    render(<GoogleIcon />);
    const svg = screen.getByRole('img', { name: 'Google' });
    expect(svg).toHaveClass('mr-2', 'h-5', 'w-5');
  });

  it('accepts custom className prop', () => {
    render(<GoogleIcon className="h-8 w-8" />);
    const svg = screen.getByRole('img', { name: 'Google' });
    expect(svg).toHaveClass('h-8', 'w-8');
  });

  it('contains 4 colored paths (Google brand colors)', () => {
    const { container } = render(<GoogleIcon />);
    const paths = container.querySelectorAll('path');
    expect(paths).toHaveLength(4);
  });

  it('uses correct Google brand colors', () => {
    const { container } = render(<GoogleIcon />);
    const paths = container.querySelectorAll('path');
    const fills = Array.from(paths).map((p) => p.getAttribute('fill'));
    expect(fills).toContain('#4285F4'); // Google Blue
    expect(fills).toContain('#34A853'); // Google Green
    expect(fills).toContain('#FBBC05'); // Google Yellow
    expect(fills).toContain('#EA4335'); // Google Red
  });
});
