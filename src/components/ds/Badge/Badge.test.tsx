import { render, screen } from '@testing-library/react';
import React from 'react';
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

  it('renders count variant bubble with default ink tone', () => {
    render(<Badge variant="count" count={5} />);
    const countBubble = screen.getByText('5');
    expect(countBubble).toHaveClass('h-space-16', 'min-w-space-16', 'bg-ink', 'text-on-brand');
  });

  it('renders count variant with danger and warning tones', () => {
    const { rerender } = render(<Badge variant="count" count={9} tone="danger" />);
    expect(screen.getByText('9')).toHaveClass('bg-danger', 'text-on-brand');

    rerender(<Badge variant="count" count={25} tone="warning" />);
    expect(screen.getByText('25')).toHaveClass('bg-warning', 'text-on-brand');
  });

  it('formats counts over 99 as 99+', () => {
    const { rerender } = render(<Badge variant="count" count={100} />);
    expect(screen.getByText('99+')).toBeInTheDocument();

    rerender(<Badge variant="count" count="150" />);
    expect(screen.getByText('99+')).toBeInTheDocument();
  });

  it('renders specified tone', () => {
    render(<Badge tone="green">Success</Badge>);
    expect(screen.getByText('Success')).toHaveClass('bg-positive-tint', 'text-positive-strong');
  });

  it('merges custom layout classes from className', () => {
    render(<Badge className="ml-auto">Aligned</Badge>);
    expect(screen.getByText('Aligned')).toHaveClass('ml-auto');
  });
});
