import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PriceChartCard } from './PriceChartCard';

const chart = vi.hoisted(() => vi.fn());
vi.mock('@/components/organisms/Chart/Chart', () => ({
  Chart: (props: unknown) => {
    chart(props);
    return <div data-testid="chart" />;
  },
}));

const history = [
  { asOf: '2026-10-01', price: 100 },
  { asOf: '2026-10-02', price: 105 },
];

describe('PriceChartCard', () => {
  it('fits the y-axis to the prices and fills its frame', async () => {
    render(<PriceChartCard onOpenHistory={vi.fn()} history={history as never} />);
    expect(await screen.findByTestId('chart')).toBeInTheDocument();
    expect(chart).toHaveBeenCalledWith(
      expect.objectContaining({
        yDomain: 'data',
        fill: true,
      })
    );
  });

  it('draws no chart with fewer than two prices', () => {
    render(<PriceChartCard onOpenHistory={vi.fn()} history={history.slice(0, 1) as never} />);
    expect(screen.queryByTestId('chart')).not.toBeInTheDocument();
  });
});
