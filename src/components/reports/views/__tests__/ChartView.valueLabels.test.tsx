import { render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

// Recharts reduced to stand-ins that expose each series' key and display name.
vi.mock('recharts', () => {
  const Wrap = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
  const Series = (kind: string) => {
    const Component = (p: { dataKey: string; name?: string }) => (
      <span data-testid={`${kind}-${p.dataKey}`} data-name={p.name ?? ''} />
    );
    Component.displayName = `Mock${kind}`;
    return Component;
  };
  return {
    ResponsiveContainer: Wrap,
    LineChart: Wrap,
    AreaChart: Wrap,
    BarChart: Wrap,
    PieChart: Wrap,
    Pie: ({ children }: { children?: ReactNode }) => <div data-testid="pie">{children}</div>,
    Cell: () => <span data-testid="cell" />,
    Line: Series('line'),
    Area: Series('area'),
    Bar: Series('bar'),
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
    Tooltip: () => null,
  };
});

vi.mock('@/components/charts/useElementSize', () => ({
  useElementSize: () => [() => {}, { width: 0, height: 0 }],
}));

import { ChartView } from '@/components/reports/views/ChartView';

// Static enum categories and series read as their labels in every chart text.

describe('ChartView valueLabels', () => {
  it('labels categories and series in a cartesian chart and its screen-reader table', () => {
    render(
      <ChartView
        data={{
          chartType: 'bar',
          categories: ['bank_account', 'credit_card'],
          series: [
            { name: 'asset', data: [1, 2] },
            { name: 'liability', data: [3, 4] },
          ],
          valueLabels: { bank_account: 'Bank account', credit_card: 'Credit card' },
          seriesValueLabels: { asset: 'Asset', liability: 'Liability' },
        }}
      />,
    );
    const table = screen.getByRole('table', { hidden: true });
    expect(within(table).getByText('Bank account')).toBeInTheDocument();
    expect(within(table).getByText('Credit card')).toBeInTheDocument();
    expect(within(table).queryByText('bank_account')).not.toBeInTheDocument();
    expect(screen.getByTestId('bar-Asset')).toHaveAttribute('data-name', 'Asset');
    const legend = screen.getByRole('list', { hidden: true });
    expect(within(legend).getByText('Liability')).toBeInTheDocument();
  });

  it('labels pie slices', () => {
    render(
      <ChartView
        data={{
          chartType: 'pie',
          categories: ['bank_account', 'credit_card'],
          series: [{ name: 'amount', data: [100, 50] }],
          valueLabels: { bank_account: 'Bank account', credit_card: 'Credit card' },
        }}
      />,
    );
    const legend = screen.getByRole('list', { name: 'Chart data' });
    expect(within(legend).getByText('Bank account')).toBeInTheDocument();
    expect(within(legend).getByText('Credit card')).toBeInTheDocument();
  });

  it('keeps categories as stored without labels', () => {
    render(
      <ChartView
        data={{ chartType: 'bar', categories: ['bank_account'], series: [{ name: 'amount', data: [1] }] }}
      />,
    );
    expect(within(screen.getByRole('table', { hidden: true })).getByText('bank_account')).toBeInTheDocument();
  });
});
