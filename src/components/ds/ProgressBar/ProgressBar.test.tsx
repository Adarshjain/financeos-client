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

  it('automatically applies warning tone when percentage is between 60 and 100', () => {
    const { container } = render(<ProgressBar value={62} />);
    const fill = container.querySelector('.bg-warning');
    expect(fill).toBeInTheDocument();
    expect(fill).toHaveStyle({ width: '62%' });
  });

  it('automatically applies danger tone and clamps fill at 100% when value is 108', () => {
    const { container } = render(<ProgressBar value={108} />);
    const fill = container.querySelector('.bg-danger');
    expect(fill).toBeInTheDocument();
    expect(fill).toHaveStyle({ width: '100%' });
  });

  it('renders 0% fill when value is 0', () => {
    const { container } = render(<ProgressBar value={0} />);
    const fill = container.querySelector('[role="progressbar"] > div');
    expect(fill).toHaveStyle({ width: '0%' });
  });

  it('allows explicit tone override', () => {
    const { container } = render(<ProgressBar value={10} tone="danger" />);
    const fill = container.querySelector('.bg-danger');
    expect(fill).toBeInTheDocument();
  });

  it('renders caption label when provided', () => {
    render(<ProgressBar value={50} label="50% of budget" />);
    expect(screen.getByText('50% of budget')).toBeInTheDocument();
  });
});
