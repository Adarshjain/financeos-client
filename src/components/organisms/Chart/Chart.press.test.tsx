import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Recharts is mocked to stand-ins that expose the click handlers the chart passes down.
vi.mock('recharts', () => {
  const Wrap = ({ children }: { children?: ReactNode }) => (
    <div>{children}</div>
  );
  return {
    ResponsiveContainer: Wrap,
    LineChart: Wrap,
    AreaChart: Wrap,
    BarChart: Wrap,
    PieChart: Wrap,
    Pie: ({
      data,
      onClick,
      children,
    }: {
      data: { name: string }[];
      onClick?: (d: unknown, i: number) => void;
      children?: ReactNode;
    }) => (
      <div data-testid="pie">
        {data.map((s, i) => (
          <button
            key={s.name}
            data-testid={`slice-${i}`}
            onClick={() => onClick?.(s, i)}
          />
        ))}
        {children}
      </div>
    ),
    Cell: () => null,
    Line: () => null,
    Area: ({ dataKey, fill, stroke }: { dataKey: string; fill?: string; stroke?: string }) => (
      <span data-testid={`area-${dataKey}`} data-fill={fill} data-stroke={stroke} />
    ),
    Bar: ({
      dataKey,
      onClick,
    }: {
      dataKey: string;
      onClick?: (d: unknown, i: number) => void;
    }) => (
      <button
        data-testid={`bar-${dataKey}`}
        data-pressable={onClick ? 'yes' : 'no'}
        onClick={() => onClick?.({ payload: { category: 'Feb' } }, 1)}
      />
    ),
    XAxis: () => null,
    YAxis: ({ hide }: { hide?: boolean }) => (
      <span data-testid="y-axis" data-hide={String(!!hide)} />
    ),
    CartesianGrid: () => <span data-testid="grid" />,
    Tooltip: () => <span data-testid="tooltip" />,
  };
});

const size = vi.hoisted(() => ({ width: 0, height: 0 }));
vi.mock('@/lib/charts/useElementSize', () => ({
  useElementSize: () => [() => {}, size],
}));

import { Chart } from '@/components/organisms/Chart/Chart';

const months = ['Jan', 'Feb', 'Mar'];
const sum = { field: 'amount', aggregation: 'sum' } as const;

afterEach(() => {
  size.width = 0;
  size.height = 0;
});

describe('Chart sparkline', () => {
  it('draws one series as an area in chart-1 with no axes, grid or tooltip', () => {
    render(
      <Chart
        data={{
          chartType: 'sparkline',
          categories: months,
          series: [{ name: 'net worth', data: [1, 3, 2] }],
          measure: sum,
        }}
      />
    );
    expect(screen.getByTestId('area-value')).toHaveAttribute('data-stroke', 'var(--ds-chart-1)');
    expect(screen.getByTestId('y-axis')).toHaveAttribute('data-hide', 'true');
    expect(screen.queryByTestId('grid')).not.toBeInTheDocument();
    expect(screen.queryByTestId('tooltip')).not.toBeInTheDocument();
  });
});

describe('Chart press', () => {
  const bar = {
    chartType: 'bar' as const,
    categories: months,
    series: [{ name: 'spend', data: [10, 20, 30] }],
    measure: sum,
  };

  it('reports the pressed bar as an entry', () => {
    const onSelectEntry = vi.fn();
    render(<Chart data={bar} onSelectEntry={onSelectEntry} />);
    fireEvent.click(screen.getByTestId('bar-spend'));
    expect(onSelectEntry).toHaveBeenCalledWith({
      key: 'Feb',
      label: 'Feb',
      seriesKey: 'Spend',
      value: 20,
      index: 1,
    });
  });

  it('makes nothing pressable without a callback', () => {
    render(<Chart data={bar} />);
    expect(screen.getByTestId('bar-spend')).toHaveAttribute('data-pressable', 'no');
  });

  const pie = {
    chartType: 'pie' as const,
    categories: ['Food', 'Travel'],
    series: [{ name: 'spend', data: [60, 40] }],
    measure: sum,
  };

  it('reports a pressed slice and a pressed legend row', () => {
    size.width = 800;
    size.height = 300;
    const onSelectEntry = vi.fn();
    render(<Chart data={pie} onSelectEntry={onSelectEntry} />);
    fireEvent.click(screen.getByTestId('slice-1'));
    expect(onSelectEntry).toHaveBeenLastCalledWith({
      key: 'Travel',
      label: 'Travel',
      seriesKey: 'Spend',
      value: 40,
      index: 1,
    });
    const list = screen.getByRole('list', { name: 'Chart data' });
    fireEvent.click(within(list).getByRole('button', { name: /Food/ }));
    expect(onSelectEntry).toHaveBeenLastCalledWith({
      key: 'Food',
      label: 'Food',
      seriesKey: 'Spend',
      value: 60,
      index: 0,
    });
  });

  it('has no legend buttons without a callback', () => {
    render(<Chart data={pie} />);
    const list = screen.getByRole('list', { name: 'Chart data' });
    expect(within(list).queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('Chart heatmap', () => {
  const heat = {
    chartType: 'heatmap' as const,
    // Mon 2026-01-05 … Sun 2026-01-11
    categories: ['2026-01-05', '2026-01-06', '2026-01-08'],
    series: [{ name: 'spend', data: [100, 400, 0] }],
    measure: sum,
    meta: { dateRange: { from: '2026-01-05', to: '2026-01-11' } },
  } as never;

  it('lays one week out as a column of seven days, empty days neutral, heavy days darker', () => {
    const { container } = render(<Chart data={heat} />);
    expect(screen.getByTestId('heatmap-grid')).toHaveAttribute('data-weeks', '1');
    expect(container.querySelectorAll('[data-date]')).toHaveLength(7);
    expect(container.querySelector('[data-date="2026-01-08"]')).toHaveAttribute('data-level', '0');
    const light = Number(container.querySelector('[data-date="2026-01-05"]')?.getAttribute('data-level'));
    const heavy = Number(container.querySelector('[data-date="2026-01-06"]')?.getAttribute('data-level'));
    expect(heavy).toBeGreaterThan(light);
    expect(screen.getByText('Less')).toBeInTheDocument();
    expect(screen.getByText('More')).toBeInTheDocument();
  });

  it('reports a pressed day with a value as an entry', () => {
    const onSelectEntry = vi.fn();
    render(<Chart data={heat} money={false} onSelectEntry={onSelectEntry} />);
    fireEvent.click(screen.getByRole('button', { name: /06\/01\/26/ }));
    expect(onSelectEntry).toHaveBeenCalledWith({
      key: '2026-01-06',
      label: '06/01/26',
      value: 400,
    });
    // A day with no value is not pressable.
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });

  it('has no pressable cells without a callback', () => {
    render(<Chart data={heat} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows the empty state when no day has a value', () => {
    render(
      <Chart
        data={{
          chartType: 'heatmap',
          categories: ['2026-01-05'],
          series: [{ name: 'spend', data: [0] }],
          meta: { dateRange: { from: '2026-01-05', to: '2026-01-11' } },
        } as never}
      />
    );
    expect(screen.getByText('No data for this configuration.')).toBeInTheDocument();
  });
});
