import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Badge } from '../Badge/Badge';
import { KpiTile } from './KpiTile';

describe('KpiTile', () => {
  it('renders label and value', () => {
    render(<KpiTile label="Net worth" value="₹11,98,842" />);
    expect(screen.getByText('Net worth')).toBeInTheDocument();
    expect(screen.getByText('₹11,98,842')).toBeInTheDocument();
  });

  it('renders hero variant typography', () => {
    render(
      <KpiTile label="Net worth" value="₹11,98,842" variant="hero" />,
    );
    const valueEl = screen.getByText('₹11,98,842');
    expect(valueEl).toHaveClass('font-display');
    expect(valueEl).toHaveClass('text-hero-figure');
  });

  it('renders good and bad delta styles', () => {
    const { rerender } = render(
      <KpiTile
        label="Net worth"
        value="₹11,98,842"
        delta={{ value: '▲ ₹41,220', period: 'this month', direction: 'good' }}
      />,
    );
    expect(screen.getByText('▲ ₹41,220')).toHaveClass('text-positive');
    expect(screen.getByText('this month')).toBeInTheDocument();

    rerender(
      <KpiTile
        label="Spent"
        value="₹97,044"
        delta={{ value: '▲ 28%', period: 'vs Sep', direction: 'bad' }}
      />,
    );
    expect(screen.getByText('▲ 28%')).toHaveClass('text-danger');
    expect(screen.getByText('vs Sep')).toBeInTheDocument();
  });

  it('renders progress bar and context', () => {
    render(
      <KpiTile
        label="Budget"
        value="62%"
        progressBar={{ value: 62, tone: 'warning' }}
        context="of ₹1.55L · 18 days left"
      />,
    );
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByText('of ₹1.55L · 18 days left')).toBeInTheDocument();
  });

  it('renders badges in context area', () => {
    render(
      <KpiTile
        label="To pay"
        value="₹78,219"
        badges={<Badge tone="warning">Amex in 2 d</Badge>}
      />,
    );
    expect(screen.getByText('Amex in 2 d')).toBeInTheDocument();
  });

  it('renders loading state without values', () => {
    const { container } = render(
      <KpiTile label="Net worth" value="₹11,98,842" loading={true} />,
    );
    expect(screen.queryByText('₹11,98,842')).not.toBeInTheDocument();
    expect(container.querySelectorAll('.animate-pulse').length).toBe(3);
  });

  it('renders failed state with retry action', () => {
    const handleRetry = vi.fn();
    render(
      <KpiTile
        label="Portfolio"
        error="Prices unavailable"
        action={{ label: 'Retry', onSelect: handleRetry }}
      />,
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Portfolio')).toHaveClass('text-danger');
    expect(screen.getByText(/Prices unavailable/)).toBeInTheDocument();
    const retryBtn = screen.getByRole('button', { name: /retry/i });
    expect(retryBtn).toHaveClass('text-ink', 'font-bold');
    fireEvent.click(retryBtn);
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });
});
