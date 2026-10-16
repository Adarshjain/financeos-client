import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Badge } from './Badge';

describe('Badge component', () => {
  it('renders default badge (soft, neutral, default shape, md size) as span', () => {
    const { container } = render(<Badge>Neutral</Badge>);
    const badge = screen.getByText('Neutral');
    expect(badge).toBeInTheDocument();
    expect(badge.tagName).toBe('SPAN');
    expect(badge).toHaveClass(
      'bg-line-soft',
      'text-neutral-ink',
      'h-space-20',
      'px-space-8',
      'rounded-ds-sm',
      'font-bold',
    );
    expect(container.firstChild).toBe(badge);
  });

  it('renders all 5 tones for soft variant', () => {
    const { rerender } = render(<Badge tone="success">Paid</Badge>);
    expect(screen.getByText('Paid')).toHaveClass('bg-positive-tint', 'text-positive-strong');

    rerender(<Badge tone="warning">Due soon</Badge>);
    expect(screen.getByText('Due soon')).toHaveClass('bg-warning-tint', 'text-warning');

    rerender(<Badge tone="danger">Overdue</Badge>);
    expect(screen.getByText('Overdue')).toHaveClass('bg-danger-tint', 'text-danger');

    rerender(<Badge tone="info">Info</Badge>);
    expect(screen.getByText('Info')).toHaveClass('bg-info-tint', 'text-info');

    rerender(<Badge tone="neutral">Neutral</Badge>);
    expect(screen.getByText('Neutral')).toHaveClass('bg-line-soft', 'text-neutral-ink');
  });

  it('renders solid variant with filled background and on-brand text', () => {
    const { rerender } = render(
      <Badge variant="solid" tone="neutral">
        Neutral Solid
      </Badge>,
    );
    expect(screen.getByText('Neutral Solid')).toHaveClass('bg-ink', 'text-on-brand');

    rerender(
      <Badge variant="solid" tone="danger">
        Danger Solid
      </Badge>,
    );
    expect(screen.getByText('Danger Solid')).toHaveClass('bg-danger', 'text-on-brand');
  });

  it('renders outline variant with semibold text and border', () => {
    render(
      <Badge variant="outline" tone="neutral" shape="rounded">
        Groceries
      </Badge>,
    );
    const badge = screen.getByText('Groceries');
    expect(badge).toHaveClass(
      'border',
      'border-line',
      'bg-subtle',
      'text-ink-2',
      'rounded-ds-pill',
      'font-semibold',
    );
  });

  it('renders dashed variant with dashed border (Set category style)', () => {
    render(
      <Badge variant="dashed" tone="warning" shape="rounded">
        Set category
      </Badge>,
    );
    const badge = screen.getByText('Set category');
    expect(badge).toHaveClass(
      'border',
      'border-dashed',
      'border-warning-border',
      'bg-surface',
      'text-warning',
      'rounded-ds-pill',
      'font-semibold',
    );
  });

  it('renders small size (sm) for count bubble', () => {
    render(
      <Badge variant="solid" shape="rounded" size="sm" tone="warning">
        25
      </Badge>,
    );
    const badge = screen.getByText('25');
    expect(badge).toHaveClass(
      'h-space-16',
      'min-w-space-16',
      'px-space-6',
      'text-micro',
      'rounded-ds-pill',
      'bg-warning',
      'text-on-brand',
    );
  });

  it('renders as button and handles click when onClick is provided', () => {
    const handleClick = vi.fn();
    render(<Badge onClick={handleClick}>Clickable</Badge>);
    const button = screen.getByRole('button', { name: 'Clickable' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toHaveClass('cursor-pointer');

    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders as child with asChild', () => {
    render(
      <Badge asChild shape="rounded">
        <a href="#test">Link Badge</a>
      </Badge>,
    );
    const link = screen.getByRole('link', { name: 'Link Badge' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '#test');
    expect(link).toHaveClass('rounded-ds-pill', 'cursor-pointer');
  });

  it('merges custom className', () => {
    render(<Badge className="ml-auto">Aligned</Badge>);
    expect(screen.getByText('Aligned')).toHaveClass('ml-auto');
  });
});
