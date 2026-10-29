import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ProgressBar } from './ProgressBar';

describe('ProgressBar component', () => {
  it('draws a lighter empty track in dark mode', () => {
    const { container } = render(<ProgressBar value={40} />);
    expect(container.querySelector('[role="progressbar"]')).toHaveClass('bg-line-soft', 'dark:bg-line-strong');
  });

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

  it('defaults to brand tone and supports warning, danger and positive tones', () => {
    const { container, rerender } = render(<ProgressBar value={62} />);
    expect(container.querySelector('.bg-brand')).toBeInTheDocument();
    expect(container.querySelector('.bg-brand')).toHaveStyle({ width: '62%' });

    rerender(<ProgressBar value={62} tone="warning" />);
    expect(container.querySelector('.bg-warning')).toBeInTheDocument();

    rerender(<ProgressBar value={62} tone="danger" />);
    expect(container.querySelector('.bg-danger')).toBeInTheDocument();

    rerender(<ProgressBar value={62} tone="positive" />);
    expect(container.querySelector('.bg-positive')).toBeInTheDocument();
  });

  it('fills with a chart colour instead of the tone, for every chart colour', () => {
    const cases = [
      ['chart-1', 'bg-series-1'],
      ['chart-2', 'bg-series-2'],
      ['chart-3', 'bg-series-3'],
      ['chart-4', 'bg-series-4'],
      ['chart-5', 'bg-series-5'],
      ['chart-rest', 'bg-series-rest'],
    ] as const;
    for (const [color, cls] of cases) {
      const { container, unmount } = render(<ProgressBar value={30} tone="danger" color={color} />);
      expect(container.querySelector(`.${cls}`)).toHaveStyle({ width: '30%' });
      expect(container.querySelector('.bg-danger')).not.toBeInTheDocument();
      unmount();
    }
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

  describe('split form', () => {
    const segs = [
      { value: 81, label: 'interest', color: 'chart-rest' as const },
      { value: 19, label: 'principal', color: 'brand' as const },
    ];

    it('renders proportional widths in order with token colours', () => {
      const { container } = render(<ProgressBar segments={segs} />);
      const parts = container.querySelectorAll('[data-segment]');
      expect(parts).toHaveLength(2);
      expect(parts[0]).toHaveAttribute('data-segment', 'interest');
      expect(parts[0]).toHaveStyle({ width: '81%' });
      expect(parts[0]).toHaveClass('bg-series-rest');
      expect(parts[1]).toHaveStyle({ width: '19%' });
      expect(parts[1]).toHaveClass('bg-brand');
    });

    it('normalises to the sum when it is not 100', () => {
      const { container } = render(
        <ProgressBar
          segments={[
            { value: 1, label: 'a', color: 'chart-1' },
            { value: 3, label: 'b', color: 'chart-2' },
          ]}
        />,
      );
      const parts = container.querySelectorAll('[data-segment]');
      expect(parts[0]).toHaveStyle({ width: '25%' });
      expect(parts[1]).toHaveStyle({ width: '75%' });
    });

    it('skips zero-value segments', () => {
      const { container } = render(
        <ProgressBar
          segments={[
            { value: 0, label: 'a', color: 'chart-1' },
            { value: 5, label: 'b', color: 'chart-2' },
          ]}
        />,
      );
      expect(container.querySelectorAll('[data-segment]')).toHaveLength(1);
      expect(container.querySelector('[data-segment="b"]')).toHaveStyle({
        width: '100%',
      });
    });

    it('renders an empty track when the sum is zero', () => {
      const { container } = render(
        <ProgressBar segments={[{ value: 0, label: 'a', color: 'chart-1' }]} />,
      );
      expect(container.querySelectorAll('[data-segment]')).toHaveLength(0);
    });

    it('ignores value and tone in split form', () => {
      const { container } = render(
        <ProgressBar segments={segs} value={50} tone="danger" />,
      );
      expect(screen.queryByRole('progressbar')).toBeNull();
      expect(container.querySelector('.bg-danger')).toBeNull();
    });
  });

  describe('Legend', () => {
    it('renders one swatch and label per item', () => {
      const { container } = render(
        <ProgressBar.Legend
          items={[
            { label: 'interest', color: 'chart-rest' },
            { label: 'principal', color: 'brand' },
          ]}
        />,
      );
      expect(screen.getByText('interest')).toBeInTheDocument();
      expect(screen.getByText('principal')).toBeInTheDocument();
      expect(container.querySelector('[data-swatch="interest"]')).toHaveClass(
        'bg-series-rest',
      );
      expect(container.querySelector('[data-swatch="principal"]')).toHaveClass(
        'bg-brand',
      );
    });
  });
});
