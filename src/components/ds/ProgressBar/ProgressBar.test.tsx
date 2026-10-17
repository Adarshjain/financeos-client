import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ProgressBar } from './ProgressBar';

describe('ProgressBar component', () => {
  it('renders with role="progressbar" and accessibility attributes', () => {
    render(<ProgressBar value={40} max={100} aria-label="Usage" />);
    const bar = screen.getByRole('progressbar', { name: 'Usage' });
    expect(bar).toBeInTheDocument();
    expect(bar).toHaveAttribute('aria-valuenow', '40');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
  });

  it('renders fill with width 21% and brand color when value is 21', () => {
    const { container } = render(<ProgressBar value={21} />);
    const fill = container.querySelector('.bg-brand');
    expect(fill).toBeInTheDocument();
    expect(fill).toHaveStyle({ width: '21%' });
  });

  it('defaults to brand tone and supports warning and danger tones', () => {
    const { container, rerender } = render(<ProgressBar value={62} />);
    expect(container.querySelector('.bg-brand')).toBeInTheDocument();
    expect(container.querySelector('.bg-brand')).toHaveStyle({ width: '62%' });

    rerender(<ProgressBar value={62} tone="warning" />);
    expect(container.querySelector('.bg-warning')).toBeInTheDocument();

    rerender(<ProgressBar value={62} tone="danger" />);
    expect(container.querySelector('.bg-danger')).toBeInTheDocument();
  });

  it('clamps fill at 100% when value exceeds max', () => {
    const { container } = render(<ProgressBar value={108} tone="danger" />);
    const fill = container.querySelector('.bg-danger');
    expect(fill).toBeInTheDocument();
    expect(fill).toHaveStyle({ width: '100%' });
  });

  it('clamps fill at 0% when value is below min', () => {
    const { container } = render(<ProgressBar value={-10} min={0} max={100} />);
    const fill = container.querySelector('[role="progressbar"] > div');
    expect(fill).toHaveStyle({ width: '0%' });
  });

  it('supports custom min prop in percentage calculation', () => {
    const { container } = render(<ProgressBar value={50} min={0} max={200} />);
    const fill = container.querySelector('[role="progressbar"] > div');
    expect(fill).toHaveStyle({ width: '25%' });
  });

  it('renders indeterminate state without aria-valuenow when value is undefined', () => {
    render(<ProgressBar aria-label="Loading" />);
    const bar = screen.getByRole('progressbar', { name: 'Loading' });
    expect(bar).not.toHaveAttribute('aria-valuenow');
    const fill = bar.firstElementChild;
    expect(fill).toHaveClass('animate-sweep');
    expect(fill).not.toHaveClass('animate-pulse');
  });

  it('renders caption label when provided', () => {
    render(<ProgressBar value={50} label="50% of budget" />);
    expect(screen.getByText('50% of budget')).toBeInTheDocument();
  });
});
