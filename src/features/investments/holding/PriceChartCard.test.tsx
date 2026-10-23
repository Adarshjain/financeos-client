import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PriceChartCard } from './PriceChartCard';

const chart = vi.hoisted(() => vi.fn());
vi.mock('@/components/reports/views/ChartView', () => ({
  ChartView: (props: unknown) => {
    chart(props);
    return <div data-testid="chart" />;
  },
}));

const history = [
  { asOf: '2026-10-01', price: 100 },
  { asOf: '2026-10-02', price: 105 },
];

describe('PriceChartCard', () => {
  it('fits the y-axis to the prices and draws in the Dinero chart token', () => {
    render(<PriceChartCard history={history as never} />);
    expect(screen.getByTestId('chart')).toBeInTheDocument();
    expect(chart).toHaveBeenCalledWith(
      expect.objectContaining({
        yDomain: 'data',
        colors: ['var(--ds-chart-1)'],
        fill: true,
        axisColor: 'var(--ds-ink-3)',
        gridColor: 'var(--ds-line)',
      })
    );
  });

  it('draws no chart with fewer than two prices', () => {
    render(<PriceChartCard history={history.slice(0, 1) as never} />);
    expect(screen.queryByTestId('chart')).not.toBeInTheDocument();
  });
});
