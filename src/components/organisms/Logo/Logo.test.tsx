import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { Logo } from './Logo';

describe('Logo component', () => {
  it('renders mark md by default with ₹ symbol', () => {
    const { container } = render(<Logo />);
    const mark = container.firstChild as HTMLElement;
    expect(mark).toHaveTextContent('₹');
    expect(mark).toHaveClass('w-control-md', 'h-control-md', 'bg-brand', 'text-on-brand');
  });

  it('renders mark sm with w-space-28 h-space-28', () => {
    const { container } = render(<Logo variant="mark" size="sm" />);
    const mark = container.firstChild as HTMLElement;
    expect(mark).toHaveTextContent('₹');
    expect(mark).toHaveClass('w-space-28', 'h-space-28');
  });

  it('renders full variant with ₹ mark and FinanceOS wordmark', () => {
    render(<Logo variant="full" size="md" />);
    expect(screen.getByText('₹')).toBeInTheDocument();
    expect(screen.getByText('FinanceOS')).toBeInTheDocument();
  });

  it('renders custom symbol', () => {
    render(<Logo symbol="$" />);
    expect(screen.getByText('$')).toBeInTheDocument();
  });

  it('merges custom className', () => {
    const { container } = render(<Logo className="custom-logo-class" />);
    expect(container.firstChild).toHaveClass('custom-logo-class');
  });
});
