import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Badge } from './Badge';

describe('Badge component', () => {
  it('renders children correctly', () => {
    render(<Badge>Paid</Badge>);
    expect(screen.getByText('Paid')).toBeInTheDocument();
  });

  it('defaults to grey tone', () => {
    render(<Badge>Neutral</Badge>);
    const badge = screen.getByText('Neutral');
    expect(badge).toHaveClass('bg-line-soft', 'text-neutral-ink');
  });

  it('renders all tones with correct color classes', () => {
    const { rerender } = render(<Badge tone="green">Paid</Badge>);
    expect(screen.getByText('Paid')).toHaveClass('bg-positive-tint', 'text-positive-strong');

    rerender(<Badge tone="amber">Due soon</Badge>);
    expect(screen.getByText('Due soon')).toHaveClass('bg-warning-tint', 'text-warning');

    rerender(<Badge tone="rose">Overdue</Badge>);
    expect(screen.getByText('Overdue')).toHaveClass('bg-danger-tint', 'text-danger');

    rerender(<Badge tone="blue">Gmail</Badge>);
    expect(screen.getByText('Gmail')).toHaveClass('bg-info-tint', 'text-info');

    rerender(<Badge tone="grey">Closed</Badge>);
    expect(screen.getByText('Closed')).toHaveClass('bg-line-soft', 'text-neutral-ink');
  });

  it('supports variant alias for tone', () => {
    render(<Badge variant="green">Success</Badge>);
    expect(screen.getByText('Success')).toHaveClass('bg-positive-tint', 'text-positive-strong');
  });

  it('merges custom layout classes from className', () => {
    render(<Badge className="ml-auto">Aligned</Badge>);
    expect(screen.getByText('Aligned')).toHaveClass('ml-auto');
  });
});
